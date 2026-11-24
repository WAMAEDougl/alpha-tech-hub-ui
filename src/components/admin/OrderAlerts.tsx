import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Bell, BellOff, PackageCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, money } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface NewOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  items: number;
  paymentMethod: string;
  createdAt: string;
}
interface NewOrdersResponse {
  serverTime: string;
  toFulfil: number;
  orders: NewOrder[];
}

const POLL_MS = 10_000;
const SOUND_KEY = "alpha_alert_sound";

/** Two-note chime made with the Web Audio API — no audio file to host or fail to load. */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [[880, 0], [1318.5, 0.18], [880, 0.6], [1318.5, 0.78]].forEach(([freq, offset]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.5);
  });
}

/**
 * Polls for new orders. When one arrives: plays a chime, opens a pop-up, and shows the
 * count of orders waiting to be fulfilled in the tab title.
 */
const OrderAlerts = () => {
  const navigate = useNavigate();
  const role = useAuth().user?.role;
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) !== "off");
  const [blocked, setBlocked] = useState(false);
  const [queue, setQueue] = useState<NewOrder[]>([]);
  const [toFulfil, setToFulfil] = useState(0);
  const [offline, setOffline] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sinceRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const ring = useCallback(async () => {
    if (!soundOnRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch { /* ignore */ }
    // Browsers block audio until the user has interacted with the page.
    if (ctx.state !== "running") { setBlocked(true); return; }
    setBlocked(false);
    playChime(ctx);
  }, [getCtx]);

  // Unlock audio on the first click/key anywhere in the admin.
  useEffect(() => {
    const unlock = () => {
      const ctx = getCtx();
      if (ctx && ctx.state === "suspended") ctx.resume().then(() => setBlocked(false)).catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [getCtx]);

  useEffect(() => {
    let stopped = false;
    const ctrl = new AbortController();

    async function poll() {
      try {
        const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
        const res = await api<NewOrdersResponse>(`/orders/new${qs}`, { signal: ctrl.signal });
        if (stopped) return;
        setOffline(false);
        setToFulfil(res.toFulfil);
        // First call only establishes the server clock — don't alert for old orders.
        if (sinceRef.current) {
          const fresh = res.orders.filter(o => !seenRef.current.has(o.id));
          fresh.forEach(o => seenRef.current.add(o.id));
          if (fresh.length) {
            setQueue(q => [...q, ...fresh]);
            ring();
          }
          if (res.orders.length) sinceRef.current = res.orders[res.orders.length - 1].createdAt;
          else sinceRef.current = res.serverTime;
        } else {
          sinceRef.current = res.serverTime;
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError" && !stopped) setOffline(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { stopped = true; ctrl.abort(); clearInterval(id); };
  }, [ring]);

  // Tab title shows how many orders need work, so it's visible from another tab.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = toFulfil > 0 ? `(${toFulfil}) ${base}` : base;
    return () => { document.title = base; };
  }, [toFulfil]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) {
      const ctx = getCtx();
      if (ctx) ctx.resume().then(() => { setBlocked(false); playChime(ctx); }).catch(() => setBlocked(true));
    }
  }

  const current = queue[0];
  const dismiss = () => setQueue(q => q.slice(1));

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        {offline && <Badge variant="destructive">Offline – can't check for new orders</Badge>}
        {blocked && soundOn && (
          <Badge variant="outline" className="cursor-pointer" onClick={() => ring()}>Click here to enable order sound</Badge>
        )}
        {toFulfil > 0 && (
          <Button variant="outline" size="sm" onClick={() => navigate(role === "ADMIN" ? "/admin/orders?lane=review" : "/admin/inventory/sourcing")}>
            <PackageCheck className="h-4 w-4" /> {toFulfil} need action
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={soundOn ? "Mute new order sound" : "Turn on new order sound"}
          title={soundOn ? "New order sound: on" : "New order sound: off"}>
          {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </Button>
        <ThemeToggle />
      </div>

      <Dialog open={!!current} onOpenChange={o => { if (!o) dismiss(); }}>
        <DialogContent>
          {current && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" /> New order {current.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  {queue.length > 1 ? `${queue.length} new orders waiting` : "A customer just placed an order."}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <p className="font-medium">{current.customerName}</p>
                <p className="text-muted-foreground">
                  {current.items} item{current.items === 1 ? "" : "s"} · {money(current.total)} ·{" "}
                  {current.paymentMethod === "CASH" ? "Cash on delivery / pickup" : "M-Pesa (awaiting payment)"}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={dismiss}>Dismiss</Button>
                <Button onClick={() => { const id = current.id; dismiss(); navigate(`/admin/orders/${id}`); }}>Open order</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderAlerts;

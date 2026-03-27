import { useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crop, Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

// ── Circular Crop Modal ──────────────────────────────────────────────────────
interface CropModalProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

function CircularCropModal({ src, onSave, onClose }: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const SIZE = 280; // canvas/preview size

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const x = SIZE / 2 - iw / 2 + offset.x;
    const y = SIZE / 2 - ih / 2 + offset.y;
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "hsl(0 75% 56%)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    // Fit image to fill circle initially
    const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
    setTimeout(draw, 50);
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
    draw();
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({
      x: dragStart.current.ox + (t.clientX - dragStart.current.x),
      y: dragStart.current.oy + (t.clientY - dragStart.current.y),
    });
    draw();
  }

  function stopDrag() { setDragging(false); draw(); }

  function zoom(delta: number) {
    setScale(s => Math.max(0.2, Math.min(5, s + delta)));
    setTimeout(draw, 20);
  }

  function handleSave() {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
    onClose();
    toast.success("Logo cropped and saved");
  }

  // Redraw whenever scale/offset changes
  setTimeout(draw, 10);

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crop className="h-4 w-4" /> Crop Logo to Circle</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">Drag to reposition · Use zoom buttons to resize</p>

          {/* Hidden img for drawing */}
          <img ref={imgRef} src={src} onLoad={onImgLoad} className="hidden" alt="" crossOrigin="anonymous" />

          {/* Canvas preview */}
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full border-2 border-primary cursor-grab active:cursor-grabbing"
            style={{ width: SIZE, height: SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrag}
          />

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => zoom(-0.1)}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => zoom(0.1)}><ZoomIn className="h-4 w-4" /></Button>
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button className="flex-1" onClick={handleSave}><Check className="h-4 w-4 mr-1" /> Save Crop</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Logo Upload with Crop ────────────────────────────────────────────────────
interface LogoUploadProps {
  label: string;
  currentValue: string;
  onSave: (dataUrl: string) => void;
  placeholder: string;
}

function LogoUpload({ label, currentValue, onSave, placeholder }: LogoUploadProps) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSet = currentValue && !currentValue.startsWith("/logo-");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {isSet ? (
          <img src={currentValue} alt="logo preview" className="h-14 w-14 rounded-full object-cover border-2 border-primary" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
            No logo
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Crop className="h-3.5 w-3.5 mr-1.5" /> {isSet ? "Change & Crop" : "Upload & Crop"}
          </Button>
          {isSet && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs h-7"
              onClick={() => onSave(placeholder)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {cropSrc && (
        <CircularCropModal src={cropSrc} onSave={onSave} onClose={() => setCropSrc(null)} />
      )}
    </div>
  );
}

// ── Main Settings Page ───────────────────────────────────────────────────────
const siteSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),
  phone: z.string().min(1, "Phone number is required"),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
});

type FormValues = z.infer<typeof siteSettingsSchema>;

const SiteSettingsPage = () => {
  const { config, setConfig } = useSiteConfig();
  const [logoLight, setLogoLight] = useState(config.logoLight);
  const [logoDark, setLogoDark] = useState(config.logoDark);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      companyName: config.companyName,
      email: config.email ?? "",
      mapLat: config.mapLat,
      mapLng: config.mapLng,
      phone: config.phone,
      whatsappNumber: config.whatsappNumber,
    },
  });

  function onSubmit(values: FormValues) {
    setConfig({ ...config, ...values, logoLight, logoDark });
    toast.success("Site settings saved successfully.");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-heading font-bold">Site Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register("companyName")} />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>
            <LogoUpload
              label="Logo — Light Mode"
              currentValue={logoLight}
              onSave={setLogoLight}
              placeholder="/logo-light.png"
            />
            <LogoUpload
              label="Logo — Dark Mode"
              currentValue={logoDark}
              onSave={setLogoDark}
              placeholder="/logo-dark.png"
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mapLat">Map Latitude</Label>
                <Input id="mapLat" type="number" step="any" {...register("mapLat")} />
                {errors.mapLat && <p className="text-sm text-destructive">{errors.mapLat.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mapLng">Map Longitude</Label>
                <Input id="mapLng" type="number" step="any" {...register("mapLng")} />
                {errors.mapLng && <p className="text-sm text-destructive">{errors.mapLng.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="info@alphacomputersnanyuki.co.ke" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input id="whatsappNumber" {...register("whatsappNumber")} />
              {errors.whatsappNumber && <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save Settings</Button>
      </form>
    </div>
  );
};

export default SiteSettingsPage;

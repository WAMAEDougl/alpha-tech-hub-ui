import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

// ── Types ──────────────────────────────────────────────────────────────────

type DeliveryMethod = "delivery" | "pickup";
type PaymentMethod = "pay_on_delivery" | "mpesa";

const addressSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(9, "Enter a valid phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

// ── Step Indicator ─────────────────────────────────────────────────────────

const STEPS = ["Delivery", "Payment", "Confirmation"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 flex-wrap">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-1 sm:mx-2 mb-5 transition-colors ${
                  done ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Delivery / Pickup ──────────────────────────────────────────────

interface Step1Props {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (v: DeliveryMethod) => void;
  addressData: AddressFormValues | null;
  setAddressData: (v: AddressFormValues | null) => void;
  onNext: () => void;
}

function Step1Delivery({
  deliveryMethod,
  setDeliveryMethod,
  addressData,
  setAddressData,
  onNext,
}: Step1Props) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: addressData ?? { fullName: "", phone: "", address: "" },
  });

  function handleContinue(data?: AddressFormValues) {
    if (deliveryMethod === "delivery" && data) {
      setAddressData(data);
    } else if (deliveryMethod === "pickup") {
      setAddressData(null);
    }
    onNext();
  }

  function onSubmit(data: AddressFormValues) {
    handleContinue(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Method</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RadioGroup
          value={deliveryMethod}
          onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="cursor-pointer font-medium">
              Home Delivery
            </Label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="cursor-pointer font-medium">
              In-Store Pickup
            </Label>
          </div>
        </RadioGroup>

        {deliveryMethod === "delivery" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+254 700 000 000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Nairobi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-2">
                Continue to Payment
              </Button>
            </form>
          </Form>
        )}

        {deliveryMethod === "pickup" && (
          <Button className="w-full" onClick={() => handleContinue()}>
            Continue to Payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Step 2: Payment ────────────────────────────────────────────────────────

interface Step2Props {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  mpesaPhone: string;
  setMpesaPhone: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2Payment({
  paymentMethod,
  setPaymentMethod,
  mpesaPhone,
  setMpesaPhone,
  onNext,
  onBack,
}: Step2Props) {
  const { items } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="pay_on_delivery" id="pod" />
              <Label htmlFor="pod" className="cursor-pointer font-medium">
                Pay on Delivery
              </Label>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="mpesa" id="mpesa" />
              <Label htmlFor="mpesa" className="cursor-pointer font-medium">
                M-Pesa
              </Label>
            </div>
          </RadioGroup>

          {paymentMethod === "mpesa" && (
            <div className="flex flex-col gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                M-Pesa Payment
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                Enter your M-Pesa registered phone number. You will receive a payment prompt.
              </p>
              <Input
                placeholder="+254 700 000 000"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary Recap */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total ({itemCount} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Place Order
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Confirmation ───────────────────────────────────────────────────

interface Step3Props {
  orderRef: string;
  deliveryMethod: DeliveryMethod;
  addressData: AddressFormValues | null;
  paymentMethod: PaymentMethod;
}

function Step3Confirmation({
  orderRef,
  deliveryMethod,
  addressData,
  paymentMethod,
}: Step3Props) {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function handleBackToHome() {
    clearCart();
    navigate("/");
  }

  const paymentLabel = paymentMethod === "mpesa" ? "M-Pesa" : "Pay on Delivery";
  const deliveryLabel = deliveryMethod === "delivery" ? "Home Delivery" : "In-Store Pickup";

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-10">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1">Order Placed!</h2>
          <p className="text-muted-foreground text-sm">
            Thank you for your order. We'll be in touch shortly.
          </p>
        </div>

        <div className="w-full rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Order Reference
          </p>
          <p className="text-xl font-mono font-bold">{orderRef}</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Items Ordered</h3>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.name} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Delivery Method</p>
            <p className="font-medium">{deliveryLabel}</p>
            {deliveryMethod === "delivery" && addressData && (
              <p className="text-xs text-muted-foreground mt-1">{addressData.address}</p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Payment</p>
            <p className="font-medium">{paymentLabel}</p>
          </div>
        </div>

        <Button className="w-full" onClick={handleBackToHome}>
          Back to Home
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main CheckoutPage ──────────────────────────────────────────────────────

const CheckoutPage = () => {
  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [addressData, setAddressData] = useState<AddressFormValues | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_on_delivery");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [orderRef] = useState(() => Date.now().toString(36).toUpperCase());

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-10 max-w-xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Checkout</h1>
          <StepIndicator current={step} />

          {step === 1 && (
            <Step1Delivery
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              addressData={addressData}
              setAddressData={setAddressData}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <Step2Payment
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              mpesaPhone={mpesaPhone}
              setMpesaPhone={setMpesaPhone}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Confirmation
              orderRef={orderRef}
              deliveryMethod={deliveryMethod}
              addressData={addressData}
              paymentMethod={paymentMethod}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;

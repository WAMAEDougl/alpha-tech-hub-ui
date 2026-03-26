import { useNavigate, Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const CartPage = () => {
  const { items, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground">Looks like you haven't added anything yet.</p>
            <Button asChild>
              <Link to="/">Continue Shopping</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-20 w-20 object-cover rounded-md shrink-0 bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Unit price: ${item.price.toFixed(2)}
                      </p>
                    </div>
                    {/* Quantity stepper + line total + remove — stack below image/name on xs */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Line total */}
                      <p className="flex-1 text-right font-semibold sm:w-24">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.productId)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items ({itemCount})</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-4">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <Button className="w-full" onClick={() => navigate("/checkout")}>
                    Proceed to Checkout
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/">Continue Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;

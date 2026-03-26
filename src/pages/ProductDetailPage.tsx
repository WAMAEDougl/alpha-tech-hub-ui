import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductsContext";
import { toast } from "sonner";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addItem } = useCart();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-16 flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <Button onClick={() => navigate("/#catalog")}>Back to Shop</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [
    "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&h=600&fit=crop"
  ];

  function handleAddToCart() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      imageUrl: images[0],
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-16 flex-1">
        <div className="container mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <button onClick={() => navigate("/#catalog")} className="hover:text-primary transition-colors">Shop</button>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="flex flex-col gap-4">
              {/* Main image */}
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setActiveImg(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
                {product.condition === "Refurbished" && (
                  <Badge className="absolute top-3 left-3" variant="secondary">Refurbished</Badge>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImg ? "border-primary" : "border-transparent hover:border-muted-foreground/40"
                      }`}
                    >
                      <img src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{product.brand} · {product.category}</p>
                <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">{product.name}</h1>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < product.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">({product.rating}/5)</span>
                </div>
                <p className="text-3xl font-bold text-primary">KES {product.price.toLocaleString()}</p>
              </div>

              <p className="text-muted-foreground leading-relaxed">{product.description}</p>

              {/* Stock */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${product.stock > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                  {product.stock > 0 ? `In Stock (${product.stock} available)` : "Out of Stock"}
                </span>
              </div>

              {/* Quantity + Add to Cart */}
              {product.stock > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-3 py-2 hover:bg-muted transition-colors text-lg font-medium"
                    >−</button>
                    <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 hover:bg-muted transition-colors text-lg font-medium"
                    >+</button>
                  </div>
                  <Button size="lg" className="flex-1 min-h-[44px]" onClick={handleAddToCart}>
                    <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
                  </Button>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => navigate("/#catalog")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Shop
              </Button>
            </div>
          </div>

          {/* Specs */}
          {product.specs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-heading font-bold mb-4">Specifications</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {product.specs.map((spec, i) => (
                        <tr key={spec.label} className={i % 2 === 0 ? "bg-muted/40" : ""}>
                          <td className="px-4 py-3 font-medium text-muted-foreground w-1/3">{spec.label}</td>
                          <td className="px-4 py-3">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;

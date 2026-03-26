import { ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/contexts/ProductsContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const LaptopPartsSection = () => {
  const { products } = useProducts();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const parts = products.filter(p => p.category === "Laptop Parts");

  if (parts.length === 0) return null;

  return (
    <section id="laptop-parts" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-2">
            Laptop <span className="text-primary">Spare Parts</span>
          </h2>
          <p className="text-muted-foreground">Batteries, screens, keyboards, chargers and more — repair your laptop for less</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {parts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
            >
              <Card
                className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {product.stock === 0 && (
                    <Badge className="absolute top-2 left-2" variant="destructive">Out of Stock</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < product.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-0.5">{product.brand}</p>
                  <h3 className="font-heading font-semibold text-sm mb-1 leading-tight">{product.name}</h3>
                  <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{product.summary}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-primary">KES {product.price.toLocaleString()}</span>
                    <Button
                      size="sm"
                      className="h-8 text-xs px-2"
                      disabled={product.stock === 0}
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.images[0] });
                        toast.success(`${product.name} added to cart`);
                      }}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LaptopPartsSection;

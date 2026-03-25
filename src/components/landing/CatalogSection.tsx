import { useState } from "react";
import { Star, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const products = [
  { id: 1, name: "ASUS ROG Strix G16", price: 185000, rating: 5, category: "Laptops", brand: "ASUS", condition: "New", image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=300&fit=crop", summary: "16\" Gaming Laptop, Intel i9, RTX 4070, 32GB RAM" },
  { id: 2, name: "Logitech G502 X Plus", price: 8500, rating: 4, category: "Accessories", brand: "Logitech", condition: "New", image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop", summary: "Wireless gaming mouse, LIGHTFORCE switches" },
  { id: 3, name: "Dell XPS 13 Plus", price: 145000, rating: 5, category: "Laptops", brand: "Dell", condition: "New", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop", summary: "Ultra-portable, 13.4\" OLED, Intel i7, 16GB" },
  { id: 4, name: "HP ProDesk 400 G9", price: 95000, rating: 4, category: "Desktops", brand: "HP", condition: "New", image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=300&fit=crop", summary: "Business desktop, i5-12500, 8GB, 256GB SSD" },
  { id: 5, name: "Samsung 27\" Curved", price: 32000, rating: 4, category: "Accessories", brand: "Samsung", condition: "New", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop", summary: "27\" QHD 144Hz curved gaming monitor" },
  { id: 6, name: "Lenovo ThinkPad X1 Carbon", price: 165000, rating: 5, category: "Laptops", brand: "Lenovo", condition: "Refurbished", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop", summary: "14\" Business ultrabook, i7, 16GB, certified refurb" },
];

const categories = ["All", "Laptops", "Desktops", "Accessories", "Networking"];
const brands = ["ASUS", "Dell", "HP", "Lenovo", "Logitech", "Samsung"];

const CatalogSection = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceRange, setPriceRange] = useState([0]);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = products.filter(p =>
    (selectedCategory === "All" || p.category === selectedCategory) &&
    p.price >= priceRange[0] * 2000
  );

  return (
    <section id="catalog" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-2">Shop Our Products</h2>
        <p className="text-muted-foreground text-center mb-10">Premium hardware at competitive prices</p>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 shrink-0`}>
            <Card>
              <CardContent className="p-5 space-y-6">
                <div>
                  <h3 className="font-heading font-semibold mb-3">Categories</h3>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-3">Price Range</h3>
                  <Slider
                    defaultValue={[0]}
                    max={100}
                    step={1}
                    onValueChange={setPriceRange}
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">From KES {(priceRange[0] * 2000).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-3">Brand</h3>
                  <div className="space-y-2">
                    {brands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 text-sm">
                        <Checkbox />
                        {brand}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-3">Condition</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> New</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox /> Refurbished</label>
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-3">Rating</h3>
                  <div className="space-y-1">
                    {[5, 4, 3].map(r => (
                      <button key={r} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        ))}
                        <span className="ml-1">& up</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        width={400}
                        height={300}
                      />
                      {product.condition === "Refurbished" && (
                        <Badge className="absolute top-3 left-3" variant="secondary">Refurbished</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < product.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-1">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{product.summary}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-primary">KES {product.price.toLocaleString()}</span>
                        <Button size="sm">
                          <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CatalogSection;

import React, { createContext, useContext, useState } from "react";

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  condition: "New" | "Refurbished";
  price: number;
  stock: number;
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  images: string[]; // first image is the primary
  rating: number;
}

const defaultProducts: Product[] = [
  {
    id: "1", sku: "LAP-001", name: "ASUS ROG Strix G16", brand: "ASUS",
    category: "Laptops", condition: "New", price: 185000, stock: 5, rating: 5,
    summary: '16" Gaming Laptop, Intel i9, RTX 4070, 32GB RAM',
    description: "The ASUS ROG Strix G16 is a powerhouse gaming laptop built for serious gamers. Featuring Intel's latest i9 processor and NVIDIA RTX 4070 graphics, it delivers exceptional performance for gaming, content creation, and more. The 16-inch QHD display with 240Hz refresh rate ensures buttery-smooth visuals.",
    specs: [
      { label: "Processor", value: "Intel Core i9-13980HX" },
      { label: "Graphics", value: "NVIDIA GeForce RTX 4070 8GB" },
      { label: "RAM", value: "32GB DDR5 4800MHz" },
      { label: "Storage", value: "1TB NVMe SSD" },
      { label: "Display", value: '16" QHD 240Hz IPS' },
      { label: "Battery", value: "90Wh, up to 8 hours" },
      { label: "OS", value: "Windows 11 Home" },
      { label: "Weight", value: "2.5 kg" },
    ],
    images: [
      "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop",
    ],
  },
  {
    id: "2", sku: "ACC-002", name: "Logitech G502 X Plus", brand: "Logitech",
    category: "Accessories", condition: "New", price: 8500, stock: 22, rating: 4,
    summary: "Wireless gaming mouse, LIGHTFORCE switches",
    description: "The Logitech G502 X Plus is a premium wireless gaming mouse featuring LIGHTFORCE hybrid optical-mechanical switches for ultra-fast actuation. With HERO 25K sensor and up to 130 hours of battery life, it's the ultimate tool for competitive gaming.",
    specs: [
      { label: "Sensor", value: "HERO 25K" },
      { label: "DPI", value: "100 – 25,600" },
      { label: "Buttons", value: "13 programmable" },
      { label: "Battery", value: "Up to 130 hours" },
      { label: "Connectivity", value: "LIGHTSPEED Wireless / USB-C" },
      { label: "Weight", value: "106g" },
    ],
    images: [
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&h=600&fit=crop",
    ],
  },
  {
    id: "3", sku: "LAP-003", name: "Dell XPS 13 Plus", brand: "Dell",
    category: "Laptops", condition: "New", price: 145000, stock: 3, rating: 5,
    summary: 'Ultra-portable, 13.4" OLED, Intel i7, 16GB',
    description: "The Dell XPS 13 Plus redefines ultra-portable computing with its stunning 13.4-inch OLED display and sleek edge-to-edge design. Powered by Intel Core i7 and 16GB LPDDR5 RAM, it handles demanding workloads with ease while remaining incredibly thin and light.",
    specs: [
      { label: "Processor", value: "Intel Core i7-1360P" },
      { label: "RAM", value: "16GB LPDDR5" },
      { label: "Storage", value: "512GB NVMe SSD" },
      { label: "Display", value: '13.4" OLED 3.5K Touch' },
      { label: "Battery", value: "55Wh, up to 12 hours" },
      { label: "OS", value: "Windows 11 Pro" },
      { label: "Weight", value: "1.27 kg" },
    ],
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop",
    ],
  },
  {
    id: "4", sku: "DES-004", name: "HP ProDesk 400 G9", brand: "HP",
    category: "Desktops", condition: "New", price: 95000, stock: 0, rating: 4,
    summary: "Business desktop, i5-12500, 8GB, 256GB SSD",
    description: "The HP ProDesk 400 G9 is a reliable business desktop designed for productivity. With Intel Core i5-12500 and expandable memory, it handles everyday business tasks efficiently. Its compact form factor fits neatly on any desk while delivering enterprise-grade performance.",
    specs: [
      { label: "Processor", value: "Intel Core i5-12500" },
      { label: "RAM", value: "8GB DDR4 (expandable to 64GB)" },
      { label: "Storage", value: "256GB SSD + 1TB HDD" },
      { label: "Graphics", value: "Intel UHD 770" },
      { label: "Ports", value: "USB-A, USB-C, HDMI, DisplayPort" },
      { label: "OS", value: "Windows 11 Pro" },
    ],
    images: [
      "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1593640408182-31c228b2b7e8?w=800&h=600&fit=crop",
    ],
  },
  {
    id: "5", sku: "ACC-005", name: 'Samsung 27" Curved', brand: "Samsung",
    category: "Monitors", condition: "New", price: 32000, stock: 8, rating: 4,
    summary: "27\" QHD 144Hz curved gaming monitor",
    description: "Immerse yourself in gaming with the Samsung 27-inch curved QHD monitor. The 1000R curvature wraps around your field of vision for a truly immersive experience. With 144Hz refresh rate and 1ms response time, every frame is crisp and smooth.",
    specs: [
      { label: "Size", value: '27" Curved (1000R)' },
      { label: "Resolution", value: "2560x1440 QHD" },
      { label: "Refresh Rate", value: "144Hz" },
      { label: "Response Time", value: "1ms (MPRT)" },
      { label: "Panel", value: "VA" },
      { label: "Ports", value: "HDMI 2.0 x2, DisplayPort 1.2" },
    ],
    images: [
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1593640408182-31c228b2b7e8?w=800&h=600&fit=crop",
    ],
  },
  {
    id: "6", sku: "LAP-006", name: "Lenovo ThinkPad X1 Carbon", brand: "Lenovo",
    category: "Laptops", condition: "Refurbished", price: 165000, stock: 2, rating: 5,
    summary: "14\" Business ultrabook, i7, 16GB, certified refurb",
    description: "The Lenovo ThinkPad X1 Carbon Gen 10 is the gold standard for business laptops. This certified refurbished unit has been professionally restored to like-new condition with a 90-day warranty. Featuring Intel Core i7, 16GB RAM, and a stunning 14-inch IPS display, it's perfect for professionals on the go.",
    specs: [
      { label: "Processor", value: "Intel Core i7-1265U" },
      { label: "RAM", value: "16GB LPDDR5" },
      { label: "Storage", value: "512GB NVMe SSD" },
      { label: "Display", value: '14" IPS 2.8K OLED' },
      { label: "Battery", value: "57Wh, up to 15 hours" },
      { label: "Condition", value: "Certified Refurbished" },
      { label: "Warranty", value: "90 Days" },
    ],
    images: [
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop",
    ],
  },
];

interface ProductsContextValue {
  products: Product[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
}

const ProductsContext = createContext<ProductsContextValue>({
  products: defaultProducts,
  addProduct: () => {},
  updateProduct: () => {},
  deleteProduct: () => {},
});

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(defaultProducts);

  function addProduct(p: Omit<Product, "id">) {
    setProducts(prev => [...prev, { ...p, id: Date.now().toString() }]);
  }

  function updateProduct(p: Product) {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
  }

  function deleteProduct(id: string) {
    setProducts(prev => prev.filter(x => x.id !== id));
  }

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}

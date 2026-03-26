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
  // ── PC Parts ──────────────────────────────────────────────────────────────
  {
    id: "7", sku: "PCP-001", name: "Intel Core i7-13700K", brand: "Intel",
    category: "PC Parts", condition: "New", price: 28000, stock: 10, rating: 5,
    summary: "13th Gen, 16 cores, 5.4GHz boost, LGA1700",
    description: "The Intel Core i7-13700K is a powerhouse desktop processor with 16 cores (8P+8E) and a boost clock of up to 5.4GHz. Ideal for gaming, content creation, and demanding workloads. Compatible with LGA1700 motherboards.",
    specs: [
      { label: "Cores / Threads", value: "16 / 24" },
      { label: "Base Clock", value: "3.4GHz (P-core)" },
      { label: "Boost Clock", value: "5.4GHz" },
      { label: "Cache", value: "30MB Intel Smart Cache" },
      { label: "Socket", value: "LGA1700" },
      { label: "TDP", value: "125W" },
    ],
    images: ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop"],
  },
  {
    id: "8", sku: "PCP-002", name: "ASUS ROG STRIX B760-F", brand: "ASUS",
    category: "PC Parts", condition: "New", price: 22000, stock: 6, rating: 4,
    summary: "ATX motherboard, DDR5, PCIe 5.0, LGA1700",
    description: "The ASUS ROG STRIX B760-F Gaming WiFi is a feature-packed ATX motherboard supporting DDR5 memory and PCIe 5.0. With robust power delivery and comprehensive connectivity, it's the perfect foundation for a high-performance build.",
    specs: [
      { label: "Socket", value: "LGA1700" },
      { label: "Chipset", value: "Intel B760" },
      { label: "Memory", value: "DDR5, up to 128GB" },
      { label: "PCIe", value: "PCIe 5.0 x16" },
      { label: "Storage", value: "4x M.2, 4x SATA" },
      { label: "WiFi", value: "WiFi 6E" },
    ],
    images: ["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&h=600&fit=crop"],
  },
  {
    id: "9", sku: "PCP-003", name: "Corsair Vengeance 32GB DDR5", brand: "Corsair",
    category: "PC Parts", condition: "New", price: 9500, stock: 15, rating: 5,
    summary: "32GB (2x16GB) DDR5 5600MHz, CL36",
    description: "Corsair Vengeance DDR5 delivers blazing-fast speeds of 5600MHz with tight CL36 timings. The 32GB kit (2x16GB) provides ample memory for gaming, multitasking, and content creation.",
    specs: [
      { label: "Capacity", value: "32GB (2x16GB)" },
      { label: "Speed", value: "5600MHz" },
      { label: "Latency", value: "CL36" },
      { label: "Voltage", value: "1.25V" },
      { label: "Type", value: "DDR5" },
    ],
    images: ["https://images.unsplash.com/photo-1562976540-1502c2145186?w=800&h=600&fit=crop"],
  },
  {
    id: "10", sku: "PCP-004", name: "Samsung 980 Pro 1TB NVMe", brand: "Samsung",
    category: "PC Parts", condition: "New", price: 8500, stock: 20, rating: 5,
    summary: "PCIe 4.0 NVMe SSD, 7000MB/s read",
    description: "The Samsung 980 Pro is one of the fastest consumer NVMe SSDs available. With PCIe 4.0 interface and sequential read speeds up to 7,000MB/s, it dramatically reduces load times and boot times.",
    specs: [
      { label: "Capacity", value: "1TB" },
      { label: "Interface", value: "PCIe 4.0 NVMe M.2" },
      { label: "Read Speed", value: "7,000 MB/s" },
      { label: "Write Speed", value: "5,100 MB/s" },
      { label: "Warranty", value: "5 Years" },
    ],
    images: ["https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=600&fit=crop"],
  },
  {
    id: "11", sku: "PCP-005", name: "NVIDIA RTX 4060 Ti 8GB", brand: "NVIDIA",
    category: "PC Parts", condition: "New", price: 55000, stock: 4, rating: 5,
    summary: "Ada Lovelace GPU, DLSS 3, 8GB GDDR6",
    description: "The NVIDIA GeForce RTX 4060 Ti brings Ada Lovelace architecture to the mainstream. With DLSS 3 Frame Generation and 8GB GDDR6 memory, it delivers excellent 1080p and 1440p gaming performance.",
    specs: [
      { label: "Architecture", value: "Ada Lovelace" },
      { label: "VRAM", value: "8GB GDDR6" },
      { label: "CUDA Cores", value: "4352" },
      { label: "Boost Clock", value: "2535 MHz" },
      { label: "TDP", value: "165W" },
      { label: "Outputs", value: "3x DisplayPort 1.4a, 1x HDMI 2.1" },
    ],
    images: ["https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=600&fit=crop"],
  },
  // ── Laptop Parts ──────────────────────────────────────────────────────────
  {
    id: "12", sku: "LPT-001", name: "Universal Laptop Battery 65Wh", brand: "Generic",
    category: "Laptop Parts", condition: "New", price: 3500, stock: 30, rating: 4,
    summary: "Compatible with HP, Dell, Lenovo — 65Wh Li-ion",
    description: "High-capacity 65Wh replacement laptop battery compatible with most HP, Dell, and Lenovo models. Features built-in protection circuits for overcharge, over-discharge, and short circuit protection.",
    specs: [
      { label: "Capacity", value: "65Wh" },
      { label: "Voltage", value: "11.1V" },
      { label: "Type", value: "Li-ion" },
      { label: "Compatibility", value: "HP, Dell, Lenovo (check model)" },
      { label: "Warranty", value: "6 Months" },
    ],
    images: ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop"],
  },
  {
    id: "13", sku: "LPT-002", name: "Laptop Screen 15.6\" FHD IPS", brand: "Generic",
    category: "Laptop Parts", condition: "New", price: 6500, stock: 12, rating: 4,
    summary: "15.6\" 1920x1080 IPS, 60Hz, 30-pin connector",
    description: "High-quality 15.6-inch Full HD IPS replacement screen. Features wide viewing angles, accurate colors, and a standard 30-pin eDP connector compatible with most modern laptops.",
    specs: [
      { label: "Size", value: '15.6"' },
      { label: "Resolution", value: "1920x1080 FHD" },
      { label: "Panel", value: "IPS" },
      { label: "Refresh Rate", value: "60Hz" },
      { label: "Connector", value: "30-pin eDP" },
      { label: "Brightness", value: "250 nits" },
    ],
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop"],
  },
  {
    id: "14", sku: "LPT-003", name: "Laptop Keyboard (Universal)", brand: "Generic",
    category: "Laptop Parts", condition: "New", price: 2200, stock: 25, rating: 4,
    summary: "US layout, backlit, compatible with HP/Dell/Lenovo",
    description: "Replacement laptop keyboard with US QWERTY layout and optional backlight. Compatible with a wide range of HP, Dell, and Lenovo laptop models. Easy snap-in installation.",
    specs: [
      { label: "Layout", value: "US QWERTY" },
      { label: "Backlight", value: "Yes (single zone)" },
      { label: "Connector", value: "Flat ribbon cable" },
      { label: "Compatibility", value: "HP, Dell, Lenovo (check model)" },
    ],
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=600&fit=crop"],
  },
  {
    id: "15", sku: "LPT-004", name: "Laptop Charger 65W USB-C", brand: "Generic",
    category: "Laptop Parts", condition: "New", price: 2800, stock: 40, rating: 4,
    summary: "65W USB-C PD charger, universal compatibility",
    description: "Universal 65W USB-C Power Delivery charger compatible with most modern laptops including Dell XPS, HP Spectre, Lenovo ThinkPad, and MacBook. Features fast charging and built-in surge protection.",
    specs: [
      { label: "Power", value: "65W" },
      { label: "Connector", value: "USB-C (PD)" },
      { label: "Input", value: "100-240V AC" },
      { label: "Output", value: "5V/3A, 9V/3A, 15V/3A, 20V/3.25A" },
      { label: "Cable Length", value: "1.8m" },
    ],
    images: ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop"],
  },
  {
    id: "16", sku: "LPT-005", name: "Laptop Cooling Fan (Universal)", brand: "Generic",
    category: "Laptop Parts", condition: "New", price: 1800, stock: 18, rating: 3,
    summary: "DC 5V replacement cooling fan, 3-pin connector",
    description: "Replacement internal cooling fan for laptops. Runs quietly at 5V DC with a standard 3-pin connector. Compatible with most HP, Dell, Acer, and Lenovo models — check your model number before ordering.",
    specs: [
      { label: "Voltage", value: "5V DC" },
      { label: "Connector", value: "3-pin" },
      { label: "Speed", value: "3500–4500 RPM" },
      { label: "Noise", value: "< 25dB" },
    ],
    images: ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop"],
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

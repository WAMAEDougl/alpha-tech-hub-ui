/**
 * Sample catalogue shown ONLY while no database is connected (DATABASE_URL is not set), so the site can be
 * presented before the real data exists. As soon as a database is connected the real products take over.
 */
const img = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop`;
const base = { condition: "New", isActive: true, supplierSourced: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

export const DEMO_PRODUCTS = [
  { ...base, id: "demo-lap-001", sku: "LAP-001", name: "ASUS ROG Strix G16", brand: "ASUS", category: "Laptops", price: 185000, stock: 5, rating: 5,
    summary: '16" Gaming Laptop, Intel i9, RTX 4070, 32GB RAM', description: "The ASUS ROG Strix G16 is a powerhouse gaming laptop built for serious gamers.",
    images: [img("photo-1593642702821-c8da6771f0c6")], specs: [{ label: "Processor", value: "Intel Core i9-13980HX" }, { label: "RAM", value: "32GB DDR5" }, { label: "Storage", value: "1TB NVMe SSD" }] },
  { ...base, id: "demo-lap-002", sku: "LAP-002", name: "Dell XPS 13 Plus", brand: "Dell", category: "Laptops", price: 145000, stock: 3, rating: 5,
    summary: "Ultra-portable, 13.4\" OLED, Intel i7, 16GB", description: "The Dell XPS 13 Plus redefines ultra-portable computing.",
    images: [img("photo-1496181133206-80ce9b88a853")], specs: [{ label: "Processor", value: "Intel Core i7-1360P" }, { label: "RAM", value: "16GB LPDDR5" }, { label: "Display", value: '13.4" OLED 3.5K' }] },
  { ...base, id: "demo-des-001", sku: "DES-001", name: "HP ProDesk 400 G9", brand: "HP", category: "Desktops", price: 95000, stock: 4, rating: 4,
    summary: "Business desktop, i5-12500, 8GB, 256GB SSD", description: "Reliable business desktop for everyday productivity.",
    images: [img("photo-1587831990711-23ca6441447b")], specs: [{ label: "Processor", value: "Intel Core i5-12500" }, { label: "RAM", value: "8GB DDR4" }, { label: "Storage", value: "256GB SSD" }] },
  { ...base, id: "demo-mon-001", sku: "MON-001", name: 'Samsung 27" Curved Monitor', brand: "Samsung", category: "Monitors", price: 32000, stock: 8, rating: 4,
    summary: '27" QHD 144Hz curved gaming monitor', description: "Immersive curved QHD gaming monitor with 144Hz refresh rate.",
    images: [img("photo-1527443224154-c4a3942d3acf")], specs: [{ label: "Size", value: '27" Curved' }, { label: "Resolution", value: "2560x1440 QHD" }, { label: "Refresh Rate", value: "144Hz" }] },
  { ...base, id: "demo-pcp-001", sku: "PCP-001", name: "Intel Core i7-13700K", brand: "Intel", category: "PC Parts", price: 28000, stock: 10, rating: 5,
    summary: "13th Gen, 16 cores, 5.4GHz boost, LGA1700", description: "Powerhouse desktop processor for gaming and content creation.",
    images: [img("photo-1518770660439-4636190af475")], specs: [{ label: "Cores", value: "16 (8P+8E)" }, { label: "Boost Clock", value: "5.4GHz" }, { label: "Socket", value: "LGA1700" }] },
  { ...base, id: "demo-lpt-001", sku: "LPT-001", name: "Universal Laptop Battery 65Wh", brand: "Generic", category: "Laptop Parts", price: 3500, stock: 30, rating: 4,
    summary: "Compatible with HP, Dell, Lenovo, 65Wh Li-ion", description: "High-capacity replacement laptop battery with protection circuits.",
    images: [img("photo-1588872657578-7efd1f1555ed")], specs: [{ label: "Capacity", value: "65Wh" }, { label: "Type", value: "Li-ion" }, { label: "Warranty", value: "6 Months" }] },
];

export const demoMode = () => !process.env.DATABASE_URL;

import { useMemo, useState } from "react";
import { useProducts } from "@/contexts/ProductsContext";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";

const select =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors hover:border-foreground/40 focus-visible:border-primary";

type Sort = "featured" | "price-asc" | "price-desc";

const CatalogSection = () => {
  const { products, loading, error, refresh } = useProducts();
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  // tabs and brand choices come from what is actually in the shop, so there is never an empty category to click
  const categories = useMemo(() => {
    const order = ["Laptops", "Desktops", "Monitors", "Accessories", "PC Parts", "Laptop Parts"];
    const present = Array.from(new Set(products.map(p => p.category)));
    present.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b));
    return ["All", ...present];
  }, [products]);
  const brands = useMemo(() => Array.from(new Set(products.map(p => p.brand))).sort(), [products]);

  const shown = useMemo(() => {
    const list = products.filter(p =>
      (category === "All" || p.category === category) && (!brand || p.brand === brand) && (!condition || p.condition === condition));
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, category, brand, condition, sort]);

  const filtered = category !== "All" || !!brand || !!condition;

  return (
    <section id="catalog" className="scroll-mt-20 border-t bg-secondary/40 py-20">
      <div className="container mx-auto px-6 lg:px-10">
        <SectionHeading title="The shop" intro="New and refurbished laptops, desktops, monitors and accessories, priced in shillings and ready to collect or deliver." />

        {/* categories as a quiet row of tabs */}
        <div role="tablist" aria-label="Product categories" className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
          {categories.map(c => (
            <button
              key={c} role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${category === c ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-10 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            {loading ? "Loading…" : `${shown.length} ${shown.length === 1 ? "product" : "products"}`}
          </p>
          <label className="sr-only" htmlFor="f-brand">Brand</label>
          <select id="f-brand" className={select} value={brand} onChange={e => setBrand(e.target.value)}>
            <option value="">All brands</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-cond">Condition</label>
          <select id="f-cond" className={select} value={condition} onChange={e => setCondition(e.target.value)}>
            <option value="">New and refurbished</option><option value="New">New only</option><option value="Refurbished">Refurbished only</option>
          </select>
          <label className="sr-only" htmlFor="f-sort">Sort</label>
          <select id="f-sort" className={select} value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="featured">Newest first</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option>
          </select>
          {filtered && (
            <button className="text-sm underline underline-offset-4 decoration-1 text-muted-foreground hover:text-foreground"
              onClick={() => { setCategory("All"); setBrand(""); setCondition(""); }}>Clear filters</button>
          )}
        </div>

        {error && !loading && (
          <div className="space-y-3 py-16 text-center">
            <p className="text-muted-foreground">We couldn&apos;t load the shop just now. Check your connection and try again.</p>
            <button className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium hover:bg-muted" onClick={() => refresh()}>Try again</button>
          </div>
        )}
        {!loading && !error && shown.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            {products.length === 0 ? "New stock is on its way. Call or WhatsApp us to ask what is available." : "Nothing matches those filters. Clear them to see everything."}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
};

export default CatalogSection;

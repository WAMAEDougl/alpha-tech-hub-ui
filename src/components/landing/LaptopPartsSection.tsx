import { useProducts } from "@/contexts/ProductsContext";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";

const LaptopPartsSection = () => {
  const { products } = useProducts();
  const parts = products.filter(p => p.category === "Laptop Parts");
  if (parts.length === 0) return null;

  return (
    <section id="laptop-parts" className="scroll-mt-20 border-t bg-secondary/40 py-20">
      <div className="container mx-auto px-6 lg:px-10">
        <SectionHeading title="Laptop parts" intro="Batteries, screens, keyboards, chargers and fans. Check your laptop's model number before you order." />
        <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {parts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
};

export default LaptopPartsSection;

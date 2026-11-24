import { useProducts } from "@/contexts/ProductsContext";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";

const PCPartsSection = () => {
  const { products } = useProducts();
  const parts = products.filter(p => p.category === "PC Parts");
  if (parts.length === 0) return null;

  return (
    <section id="pc-parts" className="scroll-mt-20 border-t py-20">
      <div className="container mx-auto px-6 lg:px-10">
        <SectionHeading title="PC components" intro="Processors, graphics cards, memory and storage to build a desktop or upgrade the one you have." />
        <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {parts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
};

export default PCPartsSection;

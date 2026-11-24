import { useNavigate } from "@/lib/router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/contexts/ProductsContext";

/** A product, shown the way a shop window would: the item on a quiet ground, then name, a line about it, and the price. */
export default function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const unavailable = product.stock <= 0 && !product.supplierSourced;
  const open = () => navigate(`/products/${product.id}`);

  return (
    <article className="group flex flex-col">
      <div
        role="link" tabIndex={0} aria-label={`View ${product.name}`}
        onClick={open} onKeyDown={e => { if (e.key === "Enter") open(); }}
        className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-md bg-muted"
      >
        <img
          src={product.images[0] || "/placeholder.svg"} alt={product.name} loading="lazy" width={400} height={300}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${unavailable ? "opacity-60" : ""}`}
        />
        {product.condition === "Refurbished" && (
          <span className="absolute left-3 top-3 rounded-sm bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur">Refurbished</span>
        )}
        {unavailable && (
          <span className="absolute left-3 top-3 rounded-sm bg-foreground px-2 py-0.5 text-xs font-medium text-background">Sold out</span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <h3
          onClick={open}
          className="mt-0.5 cursor-pointer text-[1.05rem] leading-snug font-heading hover:underline underline-offset-4 decoration-1"
        >
          {product.name}
        </h3>
        {product.summary && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{product.summary}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-base font-semibold tabular-nums">KES {product.price.toLocaleString("en-KE")}</p>
          <button
            type="button" disabled={unavailable}
            aria-label={unavailable ? `${product.name} is sold out` : `Add ${product.name} to cart`}
            onClick={() => {
              addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.images[0] });
              toast.success(`${product.name} added to cart`);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-foreground/20 px-3.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-foreground/20 disabled:hover:bg-transparent disabled:hover:text-inherit"
          >
            <Plus className="h-4 w-4" /> {unavailable ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

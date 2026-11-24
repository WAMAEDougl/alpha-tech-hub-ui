import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  /** shop sources this from a supplier when the shelf is empty: still orderable at zero stock */
  supplierSourced?: boolean;
}

interface ProductsContextValue {
  products: Product[];
  /** true until the first response (or failure) arrives */
  loading: boolean;
  /** set when the catalogue could not be loaded; products stays empty rather than showing fake data */
  error: string | null;
  refresh: () => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const noop = async () => {};

const ProductsContext = createContext<ProductsContextValue>({
  products: [],
  loading: false,
  error: null,
  refresh: noop,
  addProduct: noop,
  updateProduct: noop,
  deleteProduct: noop,
});

// Fields the API accepts when creating / updating a product.
function toPayload(p: Omit<Product, "id"> | Product) {
  return {
    sku: p.sku, name: p.name, brand: p.brand, category: p.category, condition: p.condition,
    price: Number(p.price), stock: Number(p.stock), rating: Number(p.rating),
    summary: p.summary, description: p.description, images: p.images, specs: p.specs,
  };
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api<Product[]>("/products", { auth: false });
      setProducts(list.map(p => ({
        ...p,
        summary: p.summary ?? "",
        description: p.description ?? "",
        specs: Array.isArray(p.specs) ? p.specs : [],
        images: Array.isArray(p.images) ? p.images : [],
      })));
      setError(null);
    } catch (e) {
      setError((e as Error)?.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // stock changes as orders come in, so keep the storefront reasonably fresh
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const addProduct = useCallback(async (p: Omit<Product, "id">) => {
    await api("/products", { body: toPayload(p) });
    await refresh();
  }, [refresh]);

  const updateProduct = useCallback(async (p: Product) => {
    // stock is deliberately not sent: it only changes through Inventory so every change is recorded
    const { stock: _stock, ...rest } = toPayload(p);
    await api(`/products/${p.id}`, { method: "PATCH", body: rest });
    await refresh();
  }, [refresh]);

  const deleteProduct = useCallback(async (id: string) => {
    await api(`/products/${id}`, { method: "DELETE" });
    await refresh();
  }, [refresh]);

  return (
    <ProductsContext.Provider value={{ products, loading, error, refresh, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}

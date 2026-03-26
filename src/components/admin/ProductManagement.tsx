import { useState } from "react";
import { Plus, Pencil, Trash2, Search, X, ImagePlus, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, Product } from "@/contexts/ProductsContext";
import { toast } from "sonner";

const CATEGORIES = ["Laptops", "Desktops", "Accessories", "Monitors", "PC Parts", "Laptop Parts"];
const CONDITIONS = ["New", "Refurbished"] as const;

type FormState = Omit<Product, "id"> & { id?: string };

const emptyForm = (): FormState => ({
  sku: "", name: "", brand: "", category: "Laptops", condition: "New",
  price: 0, stock: 0, rating: 5, summary: "", description: "",
  specs: [{ label: "", value: "" }],
  images: [],
});

const ProductManagement = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isEdit, setIsEdit] = useState(false);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm(emptyForm());
    setIsEdit(false);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setForm({ ...p });
    setIsEdit(true);
    setOpen(true);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, images: [...f.images, reader.result as string] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  function addSpec() {
    setForm(f => ({ ...f, specs: [...f.specs, { label: "", value: "" }] }));
  }

  function removeSpec(idx: number) {
    setForm(f => ({ ...f, specs: f.specs.filter((_, i) => i !== idx) }));
  }

  function updateSpec(idx: number, field: "label" | "value", val: string) {
    setForm(f => ({
      ...f,
      specs: f.specs.map((s, i) => i === idx ? { ...s, [field]: val } : s),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.sku || !form.brand) {
      toast.error("Name, SKU and Brand are required");
      return;
    }
    const stockNum = Number(form.stock);
    const status = stockNum === 0 ? "Out of Stock" : stockNum <= 3 ? "Low Stock" : "In Stock";
    const payload = {
      ...form,
      price: Number(form.price),
      stock: stockNum,
      rating: Number(form.rating),
      specs: form.specs.filter(s => s.label && s.value),
    };
    if (isEdit && form.id) {
      updateProduct({ ...payload, id: form.id } as Product);
      toast.success("Product updated");
    } else {
      addProduct(payload as Omit<Product, "id">);
      toast.success("Product added");
    }
    setOpen(false);
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"?`)) {
      deleteProduct(id);
      toast.success("Product deleted");
    }
  }

  const stockStatus = (stock: number) =>
    stock === 0 ? "Out of Stock" : stock <= 3 ? "Low Stock" : "In Stock";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Product Management</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU or brand..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.images[0]
                      ? <img src={p.images[0]} alt={p.name} className="h-10 w-14 object-cover rounded" />
                      : <div className="h-10 w-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    }
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">{p.name}</TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>KES {p.price.toLocaleString()}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.stock > 3 ? "default" : p.stock > 0 ? "secondary" : "destructive"}>
                      {stockStatus(p.stock)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id, p.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dell XPS 15" />
              </div>
              <div className="space-y-1.5">
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. LAP-007" />
              </div>
              <div className="space-y-1.5">
                <Label>Brand *</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Dell" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price (KES)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as "New" | "Refurbished" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–5)</Label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Short Summary</Label>
              <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="One-line product summary" />
            </div>

            <div className="space-y-1.5">
              <Label>Full Description</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed product description..." />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Product Images</Label>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload images (multiple allowed)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt={`img-${i}`} className="h-20 w-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1 rounded">Main</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Specifications</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addSpec}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {form.specs.map((spec, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Label (e.g. RAM)" value={spec.label} onChange={e => updateSpec(i, "label", e.target.value)} className="flex-1" />
                    <Input placeholder="Value (e.g. 16GB)" value={spec.value} onChange={e => updateSpec(i, "value", e.target.value)} className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(i)} disabled={form.specs.length === 1}>
                      <MinusCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">{isEdit ? "Save Changes" : "Add Product"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;

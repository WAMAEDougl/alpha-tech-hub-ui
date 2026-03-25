import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const initialProducts = [
  { id: 1, sku: "LAP-001", name: "ASUS ROG Strix G16", brand: "ASUS", price: 185000, stock: 5, status: "In Stock" },
  { id: 2, sku: "ACC-002", name: "Logitech G502 X Plus", brand: "Logitech", price: 8500, stock: 22, status: "In Stock" },
  { id: 3, sku: "LAP-003", name: "Dell XPS 13 Plus", brand: "Dell", price: 145000, stock: 3, status: "Low Stock" },
  { id: 4, sku: "DES-004", name: "HP ProDesk 400 G9", brand: "HP", price: 95000, stock: 0, status: "Out of Stock" },
  { id: 5, sku: "ACC-005", name: "Samsung 27\" Curved", brand: "Samsung", price: 32000, stock: 8, status: "In Stock" },
  { id: 6, sku: "LAP-006", name: "Lenovo ThinkPad X1", brand: "Lenovo", price: 165000, stock: 0, status: "Out of Stock" },
];

const ProductManagement = () => {
  const [search, setSearch] = useState("");
  const products = initialProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Product Management</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filter by SKU or brand..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>KES {p.price.toLocaleString()}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "In Stock" ? "default" : p.status === "Low Stock" ? "secondary" : "destructive"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductManagement;

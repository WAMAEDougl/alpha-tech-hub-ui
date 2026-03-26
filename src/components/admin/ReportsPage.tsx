import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReport, type ReportType } from "@/lib/generateReport";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { FileDown } from "lucide-react";

// --- Mock data ---

const salesData = [
  { date: "2024-05-01", product: "Laptop HP 250 G9", qty: 2, unitPrice: "KES 65,000", total: "KES 130,000" },
  { date: "2024-05-03", product: "Dell Monitor 24\"", qty: 3, unitPrice: "KES 18,500", total: "KES 55,500" },
  { date: "2024-05-07", product: "Logitech MX Keys", qty: 5, unitPrice: "KES 9,200", total: "KES 46,000" },
  { date: "2024-05-12", product: "Kingston 16GB RAM", qty: 8, unitPrice: "KES 4,800", total: "KES 38,400" },
  { date: "2024-05-18", product: "WD 1TB SSD", qty: 4, unitPrice: "KES 12,000", total: "KES 48,000" },
];

const ordersData = [
  { orderId: "ORD-1001", customer: "James Mwangi", date: "2024-05-02", items: 3, total: "KES 87,500", status: "Delivered" },
  { orderId: "ORD-1002", customer: "Amina Hassan", date: "2024-05-05", items: 1, total: "KES 65,000", status: "Pending" },
  { orderId: "ORD-1003", customer: "Peter Kamau", date: "2024-05-09", items: 2, total: "KES 27,400", status: "Delivered" },
  { orderId: "ORD-1004", customer: "Grace Njeri", date: "2024-05-14", items: 4, total: "KES 46,000", status: "Processing" },
  { orderId: "ORD-1005", customer: "David Ochieng", date: "2024-05-20", items: 2, total: "KES 24,000", status: "Delivered" },
];

const repairsData = [
  { jobId: "SVC-201", customer: "Mary Wanjiku", device: "HP Laptop", issue: "Screen replacement", date: "2024-05-01", cost: "KES 8,500", status: "Completed" },
  { jobId: "SVC-202", customer: "Ali Musa", device: "iPhone 13", issue: "Battery swap", date: "2024-05-04", cost: "KES 4,200", status: "Completed" },
  { jobId: "SVC-203", customer: "Susan Chebet", device: "Dell Desktop", issue: "Motherboard repair", date: "2024-05-08", cost: "KES 12,000", status: "In Progress" },
  { jobId: "SVC-204", customer: "John Kariuki", device: "Samsung Galaxy S22", issue: "Charging port", date: "2024-05-15", cost: "KES 3,500", status: "Completed" },
  { jobId: "SVC-205", customer: "Fatuma Omar", device: "Lenovo ThinkPad", issue: "Keyboard replacement", date: "2024-05-19", cost: "KES 5,800", status: "Pending" },
];

// --- Date filter state type ---

interface DateRange {
  from: string;
  to: string;
}

// --- Sub-component for each tab ---

interface ReportTabProps {
  title: string;
  reportType: ReportType;
  data: Record<string, unknown>[];
  filename: string;
}

function ReportTab({ title, reportType, data, filename }: ReportTabProps) {
  const { config } = useSiteConfig();
  const today = new Date().toISOString().split("T")[0];
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: today });

  function handleGenerate() {
    const doc = generateReport(reportType, data, config);
    doc.save(filename);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${reportType}-from`}>From</Label>
            <Input
              id={`${reportType}-from`}
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${reportType}-to`}>To</Label>
            <Input
              id={`${reportType}-to`}
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="w-40"
            />
          </div>
          <Button onClick={handleGenerate} className="gap-2">
            <FileDown className="h-4 w-4" />
            Generate &amp; Download PDF
          </Button>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-t">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-2 whitespace-nowrap">
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main page ---

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Reports</h1>
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Summary</TabsTrigger>
          <TabsTrigger value="orders">Order Details</TabsTrigger>
          <TabsTrigger value="repairs">Service Job Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <ReportTab
            title="Sales Summary"
            reportType="sales"
            data={salesData}
            filename="sales-summary.pdf"
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <ReportTab
            title="Order Details"
            reportType="orders"
            data={ordersData}
            filename="order-details.pdf"
          />
        </TabsContent>

        <TabsContent value="repairs" className="mt-4">
          <ReportTab
            title="Service Job Logs"
            reportType="repairs"
            data={repairsData}
            filename="service-job-logs.pdf"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;

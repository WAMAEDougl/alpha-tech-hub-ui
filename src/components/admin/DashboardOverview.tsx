import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wrench, ShoppingBag, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const stats = [
  { label: "Total Revenue", value: "KES 2.4M", icon: DollarSign, change: "+12%" },
  { label: "Active Repairs", value: "18", icon: Wrench, change: "+3" },
  { label: "Pending Orders", value: "24", icon: ShoppingBag, change: "-5" },
  { label: "Out of Stock", value: "7", icon: AlertTriangle, change: "+2" },
];

const revenueData = [
  { month: "Jan", revenue: 180000 },
  { month: "Feb", revenue: 220000 },
  { month: "Mar", revenue: 195000 },
  { month: "Apr", revenue: 310000 },
  { month: "May", revenue: 280000 },
  { month: "Jun", revenue: 350000 },
];

const repairData = [
  { week: "W1", completed: 12, incoming: 15 },
  { week: "W2", completed: 18, incoming: 14 },
  { week: "W3", completed: 9, incoming: 20 },
  { week: "W4", completed: 22, incoming: 16 },
];

const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <span className="text-xs text-primary font-medium">{stat.change} from last month</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Repair Activity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={repairData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="incoming" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;

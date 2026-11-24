
import { OrdersService } from './orders';
import { RepairsService } from './repairs';
import { ProductsService } from './products';
import { UsersService } from './users';

export class AnalyticsService {
  constructor(
    private ordersService: OrdersService,
    private repairsService: RepairsService,
    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  async getDashboardStats() {
    const [
      totalRevenue,
      monthlyRevenue,
      mostSoldProducts,
      activeRepairs,
      avgRepairTurnaround,
      totalCustomers,
    ] = await Promise.all([
      this.ordersService.getTotalRevenue(),
      this.ordersService.getMonthlyRevenue(),
      this.productsService.getMostSold(5),
      this.repairsService.getActiveCount(),
      this.repairsService.getAverageTurnaround(),
      this.usersService.count(),
    ]);

    return {
      revenue: {
        totalThisYear: totalRevenue,
        monthly: monthlyRevenue,
      },
      products: {
        topSelling: mostSoldProducts,
      },
      repairs: {
        activeTickets: activeRepairs,
        averageTurnaroundHours: avgRepairTurnaround,
      },
      customers: {
        total: totalCustomers,
      },
    };
  }
}

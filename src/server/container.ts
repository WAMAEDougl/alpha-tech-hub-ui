// Wires the services together once per server instance. This replaces NestJS's dependency injection:
// each service takes what it needs in its constructor, so the wiring is just these lines.
import { prisma } from "./prisma";
import { config } from "./config";
import { InventoryService } from "./services/inventory";
import { ProcurementService } from "./services/procurement";
import { NotificationsService } from "./services/notifications";
import { PricingService } from "./services/pricing";
import { OrdersService } from "./services/orders";
import { WorkflowService } from "./services/workflow";
import { ProductsService } from "./services/products";
import { UsersService } from "./services/users";
import { AuthService } from "./services/auth";
import { ReturnsService } from "./services/returns";
import { PaymentsService } from "./services/payments";
import { SettingsService } from "./services/settings";
import { RepairsService } from "./services/repairs";
import { AnalyticsService } from "./services/analytics";

export const inventory = new InventoryService(prisma);
export const procurement = new ProcurementService(prisma, inventory);
export const notifications = new NotificationsService(prisma, config);
export const pricing = new PricingService(prisma);
export const orders = new OrdersService(prisma, pricing, notifications);
export const workflow = new WorkflowService(prisma, inventory, notifications, orders);
export const products = new ProductsService(prisma, inventory);
export const users = new UsersService(prisma);
export const authService = new AuthService(users);
export const returns = new ReturnsService(prisma, inventory, notifications);
export const payments = new PaymentsService(config, prisma, notifications);
export const settings = new SettingsService(prisma);
export const repairs = new RepairsService(prisma);
export const analytics = new AnalyticsService(orders, repairs, products, users);

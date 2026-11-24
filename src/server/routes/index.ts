import { Router } from "../router";
import { registerCore } from "./core";
import { registerOrders } from "./orders";
import { registerInventory } from "./inventory";
import { registerMisc } from "./misc";

/** Every API endpoint, in one place. Mounted at /api by src/app/api/[...path]/route.ts. */
export const router = new Router();
registerCore(router);
registerOrders(router);
registerInventory(router);
registerMisc(router);

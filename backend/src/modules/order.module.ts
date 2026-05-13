import type { PrismaClient } from "../generated/prisma/client.js";
import type { INotificationGateway } from "../application/ports/INotificationGateway.js";
import type { buildRestaurantModule } from "./restaurant.module.js";
import type { buildMenuModule } from "./menu.module.ts";
import { PrismaOrderRepository } from "../infrastructure/repositories/PrismaOrderRepository.js";
import { CreateOrderUseCase } from "../application/usecases/order/CreateOrderUseCase.js";
import { GetUserOrdersUseCase } from "../application/usecases/order/GetUserOrdersUseCase.js";
import { GetRestaurantOrdersUseCase } from "../application/usecases/order/GetRestaurantOrdersUseCase.js";
import { UpdateOrderStatusUseCase } from "../application/usecases/order/UpdateOrderStatusUseCase.js";
import { GetOrderInvoiceUseCase } from "../application/usecases/order/GetOrderInvoiceUseCase.js";

type Deps = {
  prisma:              PrismaClient;
  restaurantModule:    ReturnType<typeof buildRestaurantModule>;
  menuModule:          ReturnType<typeof buildMenuModule>;
  notificationGateway: INotificationGateway;
  paymentMethodRepository: any;
};

/**
 * Module Order — assemble le repository et tous les use cases commandes.
 *
 * Expose `orderRepository` pour que le module Driver puisse l'injecter
 * (principe de dépendance explicite, sans conteneur global).
 */
export function buildOrderModule({ prisma, restaurantModule, menuModule, notificationGateway, paymentMethodRepository }: Deps) {
  const orderRepository = new PrismaOrderRepository(prisma);

  return {
    orderRepository,
    createOrderUseCase:        new CreateOrderUseCase(
      orderRepository,
      restaurantModule.restaurantRepository,
      menuModule.menuItemRepository,
      paymentMethodRepository,
    ),
    getUserOrdersUseCase:      new GetUserOrdersUseCase(orderRepository),
    getRestaurantOrdersUseCase: new GetRestaurantOrdersUseCase(orderRepository, restaurantModule.restaurantRepository),
    updateOrderStatusUseCase:  new UpdateOrderStatusUseCase(orderRepository, restaurantModule.restaurantRepository, notificationGateway),
    getOrderInvoiceUseCase:    new GetOrderInvoiceUseCase(orderRepository),
  };
}

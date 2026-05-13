import type { PrismaClient } from "../generated/prisma/client.js";
import type { INotificationGateway } from "../application/ports/INotificationGateway.js";
import type { buildRestaurantModule } from "./restaurant.module.js";
import type { buildOrderModule } from "./order.module.js";
import { PrismaDriverRepository } from "../infrastructure/repositories/PrismaDriverRepository.js";
import { ToggleDriverStatusUseCase } from "../application/usecases/driver/ToggleDriverStatusUseCase.js";
import { GetAvailableDeliveriesUseCase } from "../application/usecases/driver/GetAvailableDeliveriesUseCase.js";
import { AcceptDeliveryUseCase } from "../application/usecases/driver/AcceptDeliveryUseCase.js";
import { CreateDriverProfileUseCase } from "../application/usecases/driver/CreateDriverProfileUseCase.js";
import { GetDriverProfileUseCase } from "../application/usecases/driver/GetDriverProfileUseCase.js";
import { GetActiveDeliveryUseCase } from "../application/usecases/driver/GetActiveDeliveryUseCase.js";
import { PickupDeliveryUseCase } from "../application/usecases/driver/PickupDeliveryUseCase.js";
import { CompleteDeliveryUseCase } from "../application/usecases/driver/CompleteDeliveryUseCase.js";
import { GetDriverWalletUseCase } from "../application/usecases/driver/GetDriverWalletUseCase.js";

type Deps = {
  prisma:              PrismaClient;
  orderModule:         ReturnType<typeof buildOrderModule>;
  notificationGateway: INotificationGateway;
};

/**
 * Module Driver — assemble le repository et tous les use cases livreur.
 *
 * Dépend de orderModule pour accéder aux commandes lors de l'acceptation / complétion.
 */
export function buildDriverModule({ prisma, orderModule, notificationGateway }: Deps) {
  const driverRepository = new PrismaDriverRepository(prisma);

  return {
    driverRepository,
    toggleDriverStatusUseCase:     new ToggleDriverStatusUseCase(driverRepository),
    getAvailableDeliveriesUseCase: new GetAvailableDeliveriesUseCase(driverRepository),
    acceptDeliveryUseCase:         new AcceptDeliveryUseCase(driverRepository, orderModule.orderRepository, notificationGateway),
    createDriverProfileUseCase:    new CreateDriverProfileUseCase(driverRepository),
    getDriverProfileUseCase:       new GetDriverProfileUseCase(driverRepository),
    getActiveDeliveryUseCase:      new GetActiveDeliveryUseCase(driverRepository),
    pickupDeliveryUseCase:         new PickupDeliveryUseCase(driverRepository, orderModule.orderRepository, notificationGateway),
    completeDeliveryUseCase:       new CompleteDeliveryUseCase(driverRepository, orderModule.orderRepository, notificationGateway),
    getDriverWalletUseCase:        new GetDriverWalletUseCase(driverRepository),
  };
}

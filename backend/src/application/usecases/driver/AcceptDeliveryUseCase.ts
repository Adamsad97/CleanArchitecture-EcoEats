import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import type { IDriverRepository } from "../../ports/IDriverRepository.js";
import type { IOrderRepository } from "../../ports/IOrderRepository.js";
import type { INotificationGateway } from "../../ports/INotificationGateway.js";
import { DriverNotFoundError } from "./ToggleDriverStatusUseCase.js";
import { DeliveryAlreadyTakenError, DeliveryCapacityExceededError } from "../../../domain/errors/DeliveryErrors.js";

export { DeliveryAlreadyTakenError };

/**
 * Use Case : un livreur accepte une proposition de livraison.
 *
 * Règle métier :
 *  - Un livreur standard ne peut avoir qu'UNE livraison active à la fois.
 *  - Un livreur Expert peut en cumuler DEUX, à condition qu'elles viennent
 *    du MÊME restaurant.
 */
export class AcceptDeliveryUseCase {
  constructor(
    private readonly driverRepository:    IDriverRepository,
    private readonly orderRepository:     IOrderRepository,
    private readonly notificationGateway: INotificationGateway,
  ) {}

  async execute(
    userId:  string,
    orderId: string,
  ): Promise<Result<void, DriverNotFoundError | DeliveryAlreadyTakenError | DeliveryCapacityExceededError>> {
    const driver = await this.driverRepository.findByUserId(userId);
    if (!driver) return failure(new DriverNotFoundError());

    const targetOrder = await this.orderRepository.findById(orderId);
    if (!targetOrder) return failure(new DeliveryAlreadyTakenError());

    /* ── Vérification de la capacité du livreur ── */
    const { count, restaurantIds } = await this.driverRepository.getActiveDeliveriesInfo(driver.id);

    if (count >= 1) {
      if (!driver.isExpert) {
        /* Livreur standard : déjà une livraison → refus */
        return failure(new DeliveryCapacityExceededError());
      }
      /* Livreur Expert : 2 livraisons max, et seulement du même restaurant */
      if (count >= 2) return failure(new DeliveryCapacityExceededError());
      const alreadyFromDifferentRestaurant = restaurantIds.some(
        (id) => id !== targetOrder.restaurantId,
      );
      if (alreadyFromDifferentRestaurant) return failure(new DeliveryCapacityExceededError());
    }

    /* ── Tentative d'assignation atomique ── */
    const result = await this.driverRepository.acceptDelivery(orderId, driver.id);
    if (!result.accepted) return failure(new DeliveryAlreadyTakenError());

    /* ── Notifications temps réel ── */
    this.notificationGateway.notifyUser(targetOrder.clientUserId, {
      type:    "order_driver_assigned",
      title:   "Livreur en route 🛵",
      message: "Un livreur a accepté votre commande et se dirige vers le restaurant.",
    });
    this.notificationGateway.broadcastToRoom(`user:${targetOrder.clientUserId}`, "order:update", {
      orderId, status: targetOrder.status, hasDriver: true,
    });
    this.notificationGateway.broadcastToRoom(`user:${targetOrder.restaurantOwnerId}`, "order:restaurant_update", {
      orderId, driverName: driver.name,
    });

    return ok(undefined);
  }
}

import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import type { IOrderRepository } from "../../ports/IOrderRepository.js";
import type { IRestaurantRepository } from "../../ports/IRestaurantRepository.js";
import type { INotificationGateway } from "../../ports/INotificationGateway.js";
import { OrderStatus, type OrderStatusValue } from "../../../domain/value-objects/OrderStatus.js";
import { InvalidOrderTransitionError } from "../../../domain/errors/OrderErrors.js";
import { DomainError } from "../../../domain/errors/DomainError.js";

export class OrderNotFoundError extends DomainError {
  readonly code = "ORDER_NOT_FOUND";
  constructor() { super("Commande introuvable."); }
}

export class UnauthorizedOrderAccessError extends DomainError {
  readonly code = "UNAUTHORIZED_ORDER_ACCESS";
  constructor() { super("Vous n'êtes pas autorisé à modifier cette commande."); }
}

/** Notifications envoyées au client selon le nouveau statut. */
const STATUS_NOTIFICATIONS: Partial<Record<OrderStatusValue, { type: string; title: string; message: string }>> = {
  ACCEPTED: {
    type:    "order_confirmed",
    title:   "Commande acceptée ! 🎉",
    message: "Le restaurant a accepté votre commande et commence la préparation.",
  },
  READY_FOR_PICKUP: {
    type:    "order_prepared",
    title:   "Commande prête ! 🍽️",
    message: "Votre commande est prête, un livreur va la prendre en charge.",
  },
  REFUSED: {
    type:    "order_cancelled",
    title:   "Commande refusée ❌",
    message: "Votre commande a été refusée par le restaurant.",
  },
  CANCELLED: {
    type:    "order_cancelled",
    title:   "Commande annulée ❌",
    message: "Votre commande a été annulée.",
  },
};

export type UpdateOrderStatusError =
  | OrderNotFoundError
  | UnauthorizedOrderAccessError
  | InvalidOrderTransitionError;

/**
 * Use Case : mise à jour du statut d'une commande.
 *
 * La validation des transitions est déléguée à OrderStatus.canTransitionTo()
 * (Value Object du domaine) — aucune duplication de la machine à états ici.
 */
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository:      IOrderRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly notificationGateway:  INotificationGateway,
  ) {}

  async execute(
    orderId:          string,
    newStatus:        string,
    userId:           string,
    prepTimeMinutes?: number,
  ): Promise<Result<void, UpdateOrderStatusError>> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return failure(new OrderNotFoundError());

    const restaurants    = await this.restaurantRepository.findAllByOwnerId(userId);
    const ownsRestaurant = restaurants.some((r) => r.id === order.restaurantId);
    if (!ownsRestaurant) return failure(new UnauthorizedOrderAccessError());

    /* ── Validation de la transition via le Value Object du domaine ── */
    const currentStatus = OrderStatus.from(order.status as OrderStatusValue);
    const nextStatus    = newStatus as OrderStatusValue;

    if (!currentStatus.canTransitionTo(nextStatus)) {
      return failure(new InvalidOrderTransitionError(order.status as OrderStatusValue, nextStatus));
    }

    await this.orderRepository.updateStatus(orderId, nextStatus);

    /* ── Temps de préparation estimé (si le restaurateur accepte la commande) ── */
    if (nextStatus === "ACCEPTED" && prepTimeMinutes !== undefined && prepTimeMinutes > 0) {
      await this.orderRepository.updateEstimatedTime(orderId, prepTimeMinutes);
    }

    /* ── Notification + temps réel ── */
    const notif = STATUS_NOTIFICATIONS[nextStatus];
    if (notif) {
      this.notificationGateway.notifyUser(order.clientUserId, {
        type:    notif.type as any,
        title:   notif.title,
        message: notif.message,
      });
    }
    this.notificationGateway.broadcastToRoom(
      `user:${order.clientUserId}`,
      "order:update",
      { orderId, status: nextStatus, hasDriver: false },
    );

    return ok(undefined);
  }
}

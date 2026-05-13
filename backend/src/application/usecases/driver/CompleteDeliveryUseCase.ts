import crypto from "node:crypto";
import type { IDriverRepository } from "../../ports/IDriverRepository.js";
import type { IOrderRepository } from "../../ports/IOrderRepository.js";
import type { INotificationGateway } from "../../ports/INotificationGateway.js";
import { DriverNotFoundError } from "./ToggleDriverStatusUseCase.js";
import { DomainError } from "../../../domain/errors/DomainError.js";
import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import { DRIVER_BASE_FEE_EUROS, DRIVER_PRICE_PER_KM_EUROS } from "../../../domain/entities/Order.js";

class CompleteError extends DomainError {
  readonly code = "COMPLETE_FAILED";
  constructor(message: string) { super(message); }
}

export class CompleteDeliveryUseCase {
  constructor(
    private readonly driverRepository:    IDriverRepository,
    private readonly orderRepository:     IOrderRepository,
    private readonly notificationGateway: INotificationGateway,
  ) {}

  async execute(userId: string, orderId: string): Promise<Result<void, DriverNotFoundError>> {
    const driver = await this.driverRepository.findByUserId(userId);
    if (!driver) return failure(new DriverNotFoundError());

    const order  = await this.orderRepository.findById(orderId);
    const result = await this.driverRepository.completeDelivery(orderId, driver.id);
    if (!result.success) return failure(new CompleteError(result.message ?? "Erreur lors de la validation"));

    /* ── Crédit du portefeuille virtuel (règle métier : aucune commission) ── */
    if (order) {
      const invoiceData  = await this.orderRepository.findByIdForInvoice(orderId, order.clientUserId);
      const tipAmount    = invoiceData?.tipAmount ?? 0;
      const distanceFee  = DRIVER_PRICE_PER_KM_EUROS * 0; // distance inconnue ici → base uniquement

      await this.driverRepository.creditEarning({
        driverId:    driver.id,
        orderId,
        baseAmount:  DRIVER_BASE_FEE_EUROS,
        distanceFee,
        tipAmount,
      });

      this.notificationGateway.notifyUser(order.clientUserId, {
        type:    "order_delivered",
        title:   "Commande livrée ! 🎉",
        message: "Votre commande a bien été livrée. Bon appétit !",
      });
      this.notificationGateway.broadcastToRoom(
        `user:${order.clientUserId}`,
        "order:update",
        { orderId, status: "delivered", hasDriver: true },
      );
    }

    return ok(undefined);
  }
}


import crypto from "node:crypto";
import type { Result } from "../../../shared/Result.js";
import { ok, failure } from "../../../shared/Result.js";
import type { IOrderRepository, CreateOrderInput, OrderSummary } from "../../ports/IOrderRepository.js";
import type { IRestaurantRepository } from "../../ports/IRestaurantRepository.js";
import type { IMenuItemRepository } from "../../ports/IMenuItemRepository.js";
import type { IPaymentMethodRepository } from "../../ports/IPaymentMethodRepository.js";
import { Cart, CartItem } from "../../../domain/entities/Cart.js";
import { Order } from "../../../domain/entities/Order.js";
import { Distance } from "../../../domain/value-objects/Distance.js";
import { Money } from "../../../domain/value-objects/Money.js";
import { DomainError } from "../../../domain/errors/DomainError.js";
import { EmptyCartError, OutOfStockError } from "../../../domain/errors/CartErrors.js";

export class RestaurantNotFoundError extends DomainError {
  readonly code = "RESTAURANT_NOT_FOUND";
  constructor() { super("Restaurant introuvable."); }
}

export type CreateOrderError = EmptyCartError | RestaurantNotFoundError | OutOfStockError;

export type CreateOrderUseCaseInput = {
  userId:          string;
  clientLat:       number;
  clientLng:       number;
  paymentMethodId?: string;
  rawInput:        Omit<CreateOrderInput, "paymentMethodId"> & { paymentMethodId?: string };
};

/**
 * Use Case : créer une commande depuis une requête HTTP.
 *
 * Responsabilités :
 *  1. Reconstituer une Cart et les CartItems depuis les données brutes du frontend.
 *  2. Récupérer les coordonnées du restaurant pour calculer la distance (Haversine).
 *  3. Déléguer le calcul du prix total à l'entité Order du domaine.
 *  4. Persister via le repository (qui reçoit des valeurs déjà calculées).
 */
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository:      IOrderRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly menuItemRepository:   IMenuItemRepository,
    private readonly paymentMethodRepository: IPaymentMethodRepository,
  ) {}

  async execute(input: CreateOrderUseCaseInput): Promise<Result<OrderSummary, CreateOrderError>> {
    const restaurant = await this.restaurantRepository.findById(input.rawInput.restaurantId);
    if (!restaurant) return failure(new RestaurantNotFoundError());

    // --- Résolution du moyen de paiement ---
    let paymentMethodId = input.paymentMethodId || input.rawInput.paymentMethodId;
    if (!paymentMethodId) {
      const savedMethods = await this.paymentMethodRepository.findAllByUserId(input.userId);
      const defaultMethod = savedMethods.find(m => m.isDefault) || savedMethods[0];
      if (!defaultMethod) return failure(new Error("Aucun moyen de paiement disponible") as any);
      paymentMethodId = defaultMethod.id;
    }

    const cart = new Cart();
    try {
      for (const item of input.rawInput.items) {
        const menuItem = await this.menuItemRepository.findById(item.menuItemId);
        if (!menuItem) throw new Error(`Plat introuvable: ${item.menuItemId}`);

        cart.addItem(new CartItem({
          menuItemId:   item.menuItemId,
          restaurantId: input.rawInput.restaurantId,
          name:         item.name,
          unitPrice:    Money.fromCents(Math.round(item.unitPrice * 100)),
          quantity:     item.quantity,
          dailyStock:   menuItem.dailyStock ?? 999,
        }));
      }
    } catch (error: any) {
      if (error instanceof OutOfStockError) return failure(error);
      throw error;
    }
    if (cart.isEmpty) return failure(new EmptyCartError());

    /* ── Calcul du prix via l'entité domaine ── */
    const distance = Distance.fromCoordinates(
      input.clientLat,       input.clientLng,
      restaurant.lat,        restaurant.lng,
    );
    const order = new Order({
      id:               crypto.randomUUID(),
      clientId:         input.userId,
      restaurantId:     input.rawInput.restaurantId,
      items:            [...cart.items],
      deliveryDistance: distance,
    });

    /* ── Persistance avec les valeurs calculées par le domaine ── */
    const summary = await this.orderRepository.create({
      ...input.rawInput,
      paymentMethodId: paymentMethodId,
      deliveryFee:     order.deliveryFee.toEuros(),
      computedSubtotal: order.itemsTotal.toEuros(),
      computedTotal:    order.total.toEuros(),
      orderId:          order.id,
    });

    /* ── Décrémentation du stock ── */
    for (const item of cart.items) {
      for (let i = 0; i < item.quantity; i++) {
        await this.menuItemRepository.decrementStock(item.menuItemId);
      }
    }

    return ok(summary);
  }
}

import crypto from "node:crypto";
import { InMemoryRepository } from "./InMemoryRepository.js";
import type {
  IOrderRepository,
  CreateOrderInput,
  OrderSummary,
  OrderDetail,
  RestaurantOrder,
  OrderBasicInfo,
  InvoiceData,
} from "../../../application/ports/IOrderRepository.js";

const ESTIMATED_MINUTES = 45;

type StoredOrder = {
  id:                string;
  userId:            string;
  restaurantId:      string;
  driverId:          string | null;
  status:            string;
  subtotal:          number;
  deliveryFee:       number;
  tipAmount:         number;
  total:             number;
  deliveryStreet:    string;
  deliveryCity:      string;
  estimatedAt:       string;
  createdAt:         string;
  items:             Array<{ menuItemId: string; name: string; unitPrice: number; quantity: number; notes?: string }>;
};

/**
 * Adaptateur In-Memory pour IOrderRepository.
 *
 * Usage : tests unitaires et développement local sans base de données.
 * Hérite de InMemoryRepository<T> (OCP) — seul le domaine order est géré ici.
 */
export class InMemoryOrderRepository
  extends InMemoryRepository<StoredOrder>
  implements IOrderRepository
{
  async create(input: CreateOrderInput): Promise<OrderSummary> {
    const id          = input.orderId ?? crypto.randomUUID();
    const subtotal    = input.computedSubtotal
      ?? input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const tipAmount   = input.tipAmount ?? 0;
    const total       = input.computedTotal ?? subtotal + input.deliveryFee + tipAmount;
    const estimatedAt = new Date(Date.now() + ESTIMATED_MINUTES * 60 * 1000).toISOString();

    const order: StoredOrder = {
      id, userId: input.userId, restaurantId: input.restaurantId,
      driverId: null, status: "created",
      subtotal, deliveryFee: input.deliveryFee, tipAmount, total,
      deliveryStreet: input.deliveryStreet, deliveryCity: input.deliveryCity,
      estimatedAt, createdAt: new Date().toISOString(),
      items: input.items.map((item) => ({
        menuItemId: item.menuItemId, name: item.name,
        unitPrice: item.unitPrice, quantity: item.quantity, notes: item.notes,
      })),
    };

    this.save(order);
    return { id, status: order.status, subtotal, deliveryFee: input.deliveryFee, tipAmount, total, estimatedAt };
  }

  async findAllByUserId(userId: string): Promise<OrderDetail[]> {
    return this.filterWhere((o) => o.userId === userId).map((o) => ({
      id: o.id, restaurantId: o.restaurantId, restaurantName: "Restaurant",
      restaurantLogoUrl: null, status: o.status, hasDriver: o.driverId !== null,
      items: o.items.map((item) => ({
        id: crypto.randomUUID(), name: item.name, description: null, photoUrl: null,
        unitPrice: item.unitPrice, quantity: item.quantity, notes: item.notes ?? null,
      })),
      deliveryStreet: o.deliveryStreet, deliveryCity: o.deliveryCity,
      subtotal: o.subtotal, deliveryFee: o.deliveryFee, total: o.total,
      estimatedAt: o.estimatedAt, createdAt: o.createdAt,
    }));
  }

  async findAllByRestaurantId(restaurantId: string): Promise<RestaurantOrder[]> {
    return this.filterWhere((o) => o.restaurantId === restaurantId).map((o) => ({
      id: o.id, restaurantId: o.restaurantId, clientName: "Client",
      status: o.status, hasDriver: o.driverId !== null,
      items: o.items.map((item) => ({
        id: crypto.randomUUID(), name: item.name, photoUrl: null,
        quantity: item.quantity, unitPrice: item.unitPrice, notes: item.notes ?? null,
      })),
      deliveryStreet: o.deliveryStreet, deliveryCity: o.deliveryCity,
      subtotal: o.subtotal, deliveryFee: o.deliveryFee, total: o.total,
      createdAt: o.createdAt, estimatedAt: o.estimatedAt,
    }));
  }

  async findById(orderId: string): Promise<OrderBasicInfo | null> {
    const o = this.getById(orderId);
    if (!o) return null;
    return {
      id: o.id, restaurantId: o.restaurantId,
      restaurantOwnerId: "", clientUserId: o.userId, status: o.status,
    };
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    const o = this.getById(orderId);
    if (o) this.save({ ...o, status });
  }

  async updateEstimatedTime(orderId: string, prepMinutes: number): Promise<void> {
    const o = this.getById(orderId);
    if (o) {
      const estimatedAt = new Date(Date.now() + prepMinutes * 60 * 1000).toISOString();
      this.save({ ...o, estimatedAt });
    }
  }

  async findByIdForInvoice(orderId: string, userId: string): Promise<InvoiceData | null> {
    const o = this.getById(orderId);
    if (!o || o.userId !== userId) return null;
    return {
      orderId: o.id, restaurantName: "Restaurant",
      items: o.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
      subtotal: o.subtotal, deliveryFee: o.deliveryFee, tipAmount: o.tipAmount,
      total: o.total, createdAt: o.createdAt,
    };
  }
}

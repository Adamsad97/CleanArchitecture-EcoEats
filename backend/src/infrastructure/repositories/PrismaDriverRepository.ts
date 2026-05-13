import type { PrismaClient } from "../../generated/prisma/client.js";
import type { IDriverRepository, CreateDriverProfileInput, CreditEarningInput } from "../../application/ports/IDriverRepository.js";
import type { DriverProfile, AvailableDelivery, ActiveDelivery, EarningRecord, DriverWallet } from "../../application/driver/types.js";

export class PrismaDriverRepository implements IDriverRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  /** Sélection partagée pour éviter la duplication. */
  private readonly driverSelect = {
    id: true, user_id: true, name: true,
    transport_type: true, is_online: true, is_verified: true, is_expert: true,
  } as const;

  private toProfile(driver: {
    id: string; user_id: string | null; name: string;
    transport_type: string; is_online: boolean; is_verified: boolean; is_expert: boolean;
  }): DriverProfile {
    return {
      id:            driver.id,
      userId:        driver.user_id ?? "",
      name:          driver.name,
      transportType: driver.transport_type as "bike" | "scooter" | "car",
      isOnline:      driver.is_online,
      isVerified:    driver.is_verified,
      isExpert:      driver.is_expert,
    };
  }

  async findByUserId(userId: string): Promise<DriverProfile | null> {
    const driver = await this.prismaClient.driver.findUnique({
      where:  { user_id: userId },
      select: this.driverSelect,
    });
    return driver ? this.toProfile(driver) : null;
  }

  async toggleOnlineStatus(driverId: string, isOnline: boolean): Promise<DriverProfile> {
    const driver = await this.prismaClient.driver.update({
      where:  { id: driverId },
      data:   { is_online: isOnline },
      select: this.driverSelect,
    });
    return this.toProfile(driver);
  }

  async getActiveDeliveriesInfo(driverId: string): Promise<{ count: number; restaurantIds: string[] }> {
    const activeOrders = await this.prismaClient.order.findMany({
      where: {
        driver_id: driverId,
        status:    { notIn: ["delivered", "cancelled", "refused"] },
      },
      select: { restaurant_id: true },
    });
    return {
      count:         activeOrders.length,
      restaurantIds: activeOrders.map((o) => o.restaurant_id),
    };
  }

  async getAvailableDeliveries(): Promise<AvailableDelivery[]> {
    const orders = await this.prismaClient.order.findMany({
      where: { status: { in: ["confirmed", "prepared"] }, driver_id: null },
      orderBy: { created_at: "asc" },
      include: {
        restaurant: { select: { name: true, address: true } },
        delivery_address: { select: { street: true, label: true } },
        order_items: { select: { id: true } },
      },
    });

    return orders.map((order) => ({
      orderId:          order.id,
      restaurantName:   order.restaurant.name,
      restaurantAddress: order.restaurant.address,
      deliveryAddress:  `${order.delivery_address.street} — ${order.delivery_address.label}`,
      itemCount:        order.order_items.length,
      total:            Number(order.total),
      estimatedAt:      order.estimated_delivery_at.toISOString(),
      createdAt:        order.created_at.toISOString(),
    }));
  }

  async createProfile(input: CreateDriverProfileInput): Promise<DriverProfile> {
    const driver = await this.prismaClient.driver.create({
      data: {
        name:           input.name,
        email:          input.email,
        phone:          input.phone,
        transport_type: input.transportType,
        is_online:      false,
        lat:            0,
        lng:            0,
        is_verified:    false,
        is_expert:      false,
        user:           { connect: { id: input.userId } },
      },
      select: this.driverSelect,
    });
    return this.toProfile(driver);
  }

  async acceptDelivery(orderId: string, driverId: string): Promise<{ accepted: boolean }> {
    /* Mise à jour atomique : n'affecte la commande que si aucun livreur n'est déjà assigné */
    const result = await this.prismaClient.order.updateMany({
      where: { id: orderId, driver_id: null, status: { in: ["confirmed", "prepared"] } },
      data:  { driver_id: driverId },
    });
    return { accepted: result.count > 0 };
  }

  async getActiveDelivery(driverId: string): Promise<ActiveDelivery | null> {
    const order = await this.prismaClient.order.findFirst({
      where: {
        driver_id: driverId,
        status:    { notIn: ["delivered", "cancelled"] },
      },
      include: {
        restaurant:       { select: { name: true, address: true } },
        delivery_address: { select: { street: true, city: true } },
        user:             { select: { name: true } },
        order_items:      { select: { id: true } },
      },
    });
    if (!order) return null;

    return {
      orderId:           order.id,
      restaurantName:    order.restaurant.name,
      restaurantAddress: order.restaurant.address,
      clientName:        order.user.name,
      deliveryStreet:    order.delivery_address?.street ?? "",
      deliveryCity:      order.delivery_address?.city   ?? "",
      itemCount:         order.order_items.length,
      total:             Number(order.total),
      estimatedAt:       order.estimated_delivery_at.toISOString(),
      orderStatus:       order.status,
    };
  }

  async pickupDelivery(orderId: string, driverId: string): Promise<{ success: boolean; message?: string }> {
    const order = await this.prismaClient.order.findUnique({
      where:  { id: orderId },
      select: { driver_id: true, status: true },
    });
    if (!order)                       return { success: false, message: "Commande introuvable" };
    if (order.driver_id !== driverId)                          return { success: false, message: "Non autorisé" };
    if (!["confirmed","prepared"].includes(order.status))      return { success: false, message: "Statut invalide pour la récupération" };

    await this.prismaClient.order.update({
      where: { id: orderId },
      data:  { status: "delivering" },
    });
    return { success: true };
  }

  async completeDelivery(orderId: string, driverId: string): Promise<{ success: boolean; message?: string }> {
    const order = await this.prismaClient.order.findUnique({
      where:  { id: orderId },
      select: { driver_id: true, status: true },
    });
    if (!order)                        return { success: false, message: "Commande introuvable" };
    if (order.driver_id !== driverId)  return { success: false, message: "Non autorisé" };
    if (order.status === "delivered")  return { success: false, message: "Déjà livrée" };

    await this.prismaClient.order.update({
      where: { id: orderId },
      data:  { status: "delivered", delivered_at: new Date() },
    });
    return { success: true };
  }

  async creditEarning(input: CreditEarningInput): Promise<EarningRecord> {
    const total = input.baseAmount + input.distanceFee + input.tipAmount;
    const record = await this.prismaClient.driverEarning.create({
      data: {
        driver:      { connect: { id: input.driverId } },
        order:       { connect: { id: input.orderId } },
        base_amount: input.baseAmount,
        bonus:       input.distanceFee,
        tip:         input.tipAmount,
        total,
        status:      "pending",
      },
    });
    return {
      id:          record.id,
      orderId:     record.order_id,
      baseAmount:  Number(record.base_amount),
      distanceFee: Number(record.bonus),
      tipAmount:   Number(record.tip),
      total:       Number(record.total),
      earnedAt:    record.paid_at?.toISOString() ?? new Date().toISOString(),
    };
  }

  async getWallet(driverId: string): Promise<DriverWallet> {
    const records = await this.prismaClient.driverEarning.findMany({
      where:   { driver_id: driverId },
      orderBy: { paid_at: "desc" },
    });
    const earnings: EarningRecord[] = records.map((r) => ({
      id:          r.id,
      orderId:     r.order_id,
      baseAmount:  Number(r.base_amount),
      distanceFee: Number(r.bonus),
      tipAmount:   Number(r.tip),
      total:       Number(r.total),
      earnedAt:    r.paid_at?.toISOString() ?? new Date().toISOString(),
    }));
    const balanceEuros = earnings.reduce((sum, e) => sum + e.total, 0);
    return { balanceEuros, earnings };
  }
}

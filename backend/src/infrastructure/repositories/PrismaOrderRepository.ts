import type { PrismaClient } from "../../generated/prisma/client.js";
import type { IOrderRepository, CreateOrderInput, OrderSummary, OrderDetail, RestaurantOrder, OrderBasicInfo } from "../../application/ports/IOrderRepository.js";

const TAXES_RATE        = 0.10;
const ESTIMATED_MINUTES = 45;

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(input: CreateOrderInput): Promise<OrderSummary> {
    const subtotal    = input.computedSubtotal
      ?? input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total       = input.computedTotal
      ?? subtotal + input.deliveryFee;
    const estimatedAt = new Date(Date.now() + ESTIMATED_MINUTES * 60 * 1000);

    const address = await this.prismaClient.userAddress.create({
      data: {
        user:       { connect: { id: input.userId } },
        label:      "Commande",
        street:     input.deliveryStreet,
        city:       input.deliveryCity,
        lat:        0,
        lng:        0,
        is_default: false,
      },
    });

    const order = await this.prismaClient.order.create({
      data: {
        user:             { connect: { id: input.userId } },
        restaurant:       { connect: { id: input.restaurantId } },
        delivery_address: { connect: { id: address.id } },
        payment_method:   { connect: { id: input.paymentMethodId } },
        status:           "created",
        subtotal:              subtotal,
        delivery_fee:          input.deliveryFee,
        taxes:                 taxes,
        tip_amount:            0,
        total:                 total,
        estimated_delivery_at: estimatedAt,
        order_items: {
          create: input.items.map((item) => ({
            menu_item:  { connect: { id: item.menuItemId } },
            quantity:   item.quantity,
            unit_price: item.unitPrice,
            notes:      item.notes ?? null,
            ...(item.optionValueIds?.length
              ? {
                  selections: {
                    create: item.optionValueIds.map((optionValueId) => ({
                      option_value: { connect: { id: optionValueId } },
                      extra_price:  0,
                    })),
                  },
                }
              : {}),
          })),
        },
      },
    });

    return {
      id:          order.id,
      status:      order.status,
      subtotal:    Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      total:       Number(order.total),
      estimatedAt: order.estimated_delivery_at.toISOString(),
    };
  }

  async findAllByUserId(userId: string): Promise<OrderDetail[]> {
    const orders = await this.prismaClient.order.findMany({
      where:   { user_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        restaurant:       { select: { id: true, name: true, logo_url: true } },
        delivery_address: { select: { street: true, city: true } },
        order_items: {
          include: {
            menu_item: { select: { name: true, description: true, photo_url: true } },
          },
        },
      },
    });

    return orders.map((order) => ({
      id:                order.id,
      restaurantId:      order.restaurant.id,
      restaurantName:    order.restaurant.name,
      restaurantLogoUrl: order.restaurant.logo_url ?? null,
      status:            order.status,
      hasDriver:         order.driver_id !== null,
      items:             order.order_items.map((item) => ({
        id:          item.id,
        name:        item.menu_item?.name        ?? "Article supprimé",
        description: item.menu_item?.description ?? null,
        photoUrl:    item.menu_item?.photo_url   ?? null,
        unitPrice:   Number(item.unit_price),
        quantity:    item.quantity,
        notes:       item.notes ?? null,
      })),
      deliveryStreet: order.delivery_address?.street ?? "",
      deliveryCity:   order.delivery_address?.city   ?? "",
      subtotal:       Number(order.subtotal),
      deliveryFee:    Number(order.delivery_fee),
      total:          Number(order.total),
      estimatedAt:    order.estimated_delivery_at.toISOString(),
      createdAt:      order.created_at.toISOString(),
    }));
  }

  async findAllByRestaurantId(restaurantId: string): Promise<RestaurantOrder[]> {
    const orders = await this.prismaClient.order.findMany({
      where:   { restaurant_id: restaurantId },
      orderBy: { created_at: "desc" },
      include: {
        user:             { select: { name: true } },
        delivery_address: { select: { street: true, city: true } },
        order_items: {
          include: {
            menu_item: { select: { name: true, photo_url: true } },
          },
        },
      },
    });

    return orders.map((order) => ({
      id:             order.id,
      restaurantId:   restaurantId,
      clientName:     order.user.name,
      status:         order.status,
      hasDriver:      order.driver_id !== null,
      items:          order.order_items.map((item) => ({
        id:        item.id,
        name:      item.menu_item?.name      ?? "Article supprimé",
        photoUrl:  item.menu_item?.photo_url ?? null,
        quantity:  item.quantity,
        unitPrice: Number(item.unit_price),
        notes:     item.notes ?? null,
      })),
      deliveryStreet: order.delivery_address?.street ?? "",
      deliveryCity:   order.delivery_address?.city   ?? "",
      subtotal:       Number(order.subtotal),
      deliveryFee:    Number(order.delivery_fee),
      total:          Number(order.total),
      createdAt:      order.created_at.toISOString(),
      estimatedAt:    order.estimated_delivery_at.toISOString(),
    }));
  }

  async findById(orderId: string): Promise<OrderBasicInfo | null> {
    const order = await this.prismaClient.order.findUnique({
      where:   { id: orderId },
      select:  { id: true, restaurant_id: true, user_id: true, status: true,
                 restaurant: { select: { owner_id: true } } },
    });
    if (!order) return null;
    return {
      id:                order.id,
      restaurantId:      order.restaurant_id,
      restaurantOwnerId: order.restaurant.owner_id,
      clientUserId:      order.user_id,
      status:            order.status,
    };
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    await this.prismaClient.order.update({
      where: { id: orderId },
      data:  { status },
    });
  }
}

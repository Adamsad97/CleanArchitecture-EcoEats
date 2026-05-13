import { z } from "zod";

export const orderItemSchema = z.object({
  menuItemId:       z.string().uuid(),
  name:             z.string().min(1),
  unitPrice:        z.number().min(0),
  quantity:         z.number().int().positive(),
  notes:            z.string().optional(),
  optionValueIds:   z.array(z.string().uuid()).optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    restaurantId:     z.string().uuid(),
    deliveryStreet:   z.string().min(3),
    deliveryCity:     z.string().min(1),
    clientLat:        z.number(),
    clientLng:        z.number(),
    items:            z.array(orderItemSchema).min(1),
    tipAmount:        z.number().min(0).optional(),
    paymentMethodId:  z.string().uuid().optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    orderId: z.string().uuid(),
  }),
  body: z.object({
    status:          z.string().min(1),
    prepTimeMinutes: z.number().int().positive().optional(),
  }),
});

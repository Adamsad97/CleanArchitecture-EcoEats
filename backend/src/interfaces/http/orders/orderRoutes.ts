import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import type { CreateOrderUseCase, CreateOrderUseCaseInput } from "../../../application/usecases/order/CreateOrderUseCase.js";
import type { GetUserOrdersUseCase } from "../../../application/usecases/order/GetUserOrdersUseCase.js";
import type { GetRestaurantOrdersUseCase } from "../../../application/usecases/order/GetRestaurantOrdersUseCase.js";
import type { UpdateOrderStatusUseCase } from "../../../application/usecases/order/UpdateOrderStatusUseCase.js";
import type { IPaymentMethodRepository } from "../../../application/ports/IPaymentMethodRepository.js";

const orderItemSchema = z.object({
  menuItemId:       z.string().uuid(),
  name:             z.string().min(1),
  unitPrice:        z.number().min(0),
  quantity:         z.number().int().positive(),
  notes:            z.string().optional(),
  optionValueIds:   z.array(z.string().uuid()).optional(),
});

const createOrderSchema = z.object({
  restaurantId:     z.string().uuid(),
  deliveryStreet:   z.string().min(3),
  deliveryCity:     z.string().min(1),
  clientLat:        z.number(),
  clientLng:        z.number(),
  items:            z.array(orderItemSchema).min(1),
  paymentMethodId:  z.string().uuid().optional(),
});

export function createOrderRoutes(
  createOrderUseCase:        CreateOrderUseCase,
  getUserOrdersUseCase:      GetUserOrdersUseCase,
  getRestaurantOrdersUseCase: GetRestaurantOrdersUseCase,
  updateOrderStatusUseCase:  UpdateOrderStatusUseCase,
  paymentMethodRepository:   IPaymentMethodRepository,
  requireAuth:               RequestHandler,
): Router {
  const router = Router();

  /* ── GET / — Liste des commandes de l'utilisateur connecté ── */
  router.get("/", requireAuth, async (request: Request, response: Response) => {
    try {
      const result = await getUserOrdersUseCase.execute(request.user!.id);
      response.status(200).json(result.value);
    } catch (error) {
      console.error("[GET /orders]", error);
      response.status(500).json({ message: "Erreur lors de la récupération des commandes" });
    }
  });

  /* ── GET /restaurant — Commandes du restaurant du propriétaire connecté ── */
  router.get("/restaurant", requireAuth, async (request: Request, response: Response) => {
    try {
      const orders = await getRestaurantOrdersUseCase.execute(request.user!.id);
      response.status(200).json(orders);
    } catch (error) {
      console.error("[GET /orders/restaurant]", error);
      response.status(500).json({ message: "Erreur lors de la récupération des commandes" });
    }
  });

  /* ── PATCH /:orderId/status — Changer le statut (accept/refuse/prepare) ── */
  router.patch("/:orderId/status", requireAuth, async (request: Request, response: Response) => {
    const { orderId } = request.params;
    const { status }  = request.body as { status?: string };
    if (!status) { response.status(400).json({ message: "Statut requis" }); return; }

    try {
      const result = await updateOrderStatusUseCase.execute(orderId, status, request.user!.id);
      if (!result.ok) {
        const statusCode = result.error.code === "UNAUTHORIZED_ORDER_ACCESS" ? 403
          : result.error.code === "ORDER_NOT_FOUND"                          ? 404
          : 422;
        response.status(statusCode).json({ message: result.error.message });
        return;
      }
      response.status(200).json({ message: "Statut mis à jour" });
    } catch (error) {
      console.error("[PATCH /orders/:id/status]", error);
      response.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  router.post("/", requireAuth, async (request: Request, response: Response) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: "Données invalides", errors: parsed.error.issues });
      return;
    }

    const userId = request.user!.id;

    const savedPaymentMethods = await paymentMethodRepository.findAllByUserId(userId);
    const defaultPaymentMethod = savedPaymentMethods.find((method) => method.isDefault) ?? savedPaymentMethods[0];
    const resolvedPaymentMethodId = parsed.data.paymentMethodId ?? defaultPaymentMethod?.id;

    if (!resolvedPaymentMethodId) {
      response.status(422).json({ message: "Aucun moyen de paiement enregistré" });
      return;
    }

    const result = await createOrderUseCase.execute({
      userId:          userId,
      clientLat:       parsed.data.clientLat,
      clientLng:       parsed.data.clientLng,
      paymentMethodId: resolvedPaymentMethodId,
      rawInput: {
        userId,
        restaurantId:   parsed.data.restaurantId,
        deliveryStreet: parsed.data.deliveryStreet,
        deliveryCity:   parsed.data.deliveryCity,
        items:          parsed.data.items,
        deliveryFee:    0, // calculé par le domaine
        paymentMethodId: resolvedPaymentMethodId,
      },
    });

    if (!result.ok) {
      response.status(422).json({ message: result.error.message });
      return;
    }
    response.status(201).json(result.value);
  });

  return router;
}

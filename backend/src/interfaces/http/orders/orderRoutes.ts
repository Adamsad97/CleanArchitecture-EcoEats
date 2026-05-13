import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { validate } from "../middlewares/validate.js";
import { createOrderSchema, updateOrderStatusSchema } from "../validation/orderSchemas.js";
import type { CreateOrderUseCase } from "../../../application/usecases/order/CreateOrderUseCase.js";
import type { GetUserOrdersUseCase } from "../../../application/usecases/order/GetUserOrdersUseCase.js";
import type { GetRestaurantOrdersUseCase } from "../../../application/usecases/order/GetRestaurantOrdersUseCase.js";
import type { UpdateOrderStatusUseCase } from "../../../application/usecases/order/UpdateOrderStatusUseCase.js";
import type { GetOrderInvoiceUseCase } from "../../../application/usecases/order/GetOrderInvoiceUseCase.js";
import { InvoicePresenter } from "../../presenters/InvoicePresenter.js";
import { domainErrorToStatus } from "../utils/domainErrorToStatus.js";

export function createOrderRoutes(
  createOrderUseCase:        CreateOrderUseCase,
  getUserOrdersUseCase:      GetUserOrdersUseCase,
  getRestaurantOrdersUseCase: GetRestaurantOrdersUseCase,
  updateOrderStatusUseCase:  UpdateOrderStatusUseCase,
  getOrderInvoiceUseCase:    GetOrderInvoiceUseCase,
  _paymentMethodRepository:   any,
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

  /* ── PATCH /:orderId/status — Changer le statut ── */
  router.patch("/:orderId/status", requireAuth, validate(updateOrderStatusSchema), async (request: Request, response: Response) => {
    try {
      const result = await updateOrderStatusUseCase.execute(
        request.params.orderId,
        request.body.status,
        request.user!.id,
        request.body.prepTimeMinutes,
      );
      if (!result.ok) {
        response.status(domainErrorToStatus(result.error)).json({ message: result.error.message });
        return;
      }
      response.status(200).json({ message: "Statut mis à jour" });
    } catch (error) {
      console.error("[PATCH /orders/:id/status]", error);
      response.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
  });

  /* ── POST / — Passer une commande ── */
  router.post("/", requireAuth, validate(createOrderSchema), async (request: Request, response: Response) => {
    const userId = request.user!.id;
    const { body } = request;

    const result = await createOrderUseCase.execute({
      userId:          userId,
      clientLat:       body.clientLat,
      clientLng:       body.clientLng,
      paymentMethodId: body.paymentMethodId,
      rawInput: {
        userId,
        restaurantId:   body.restaurantId,
        deliveryStreet: body.deliveryStreet,
        deliveryCity:   body.deliveryCity,
        items:          body.items,
        deliveryFee:    0,
        tipAmount:      body.tipAmount,
        paymentMethodId: body.paymentMethodId,
      },
    });

    if (!result.ok) {
      response.status(422).json({ message: result.error.message });
      return;
    }
    response.status(201).json(result.value);
  });

  /* ── GET /:orderId/invoice — Facture détaillée ── */
  router.get("/:orderId/invoice", requireAuth, async (request: Request, response: Response) => {
    const result = await getOrderInvoiceUseCase.execute({ orderId: request.params.orderId, userId: request.user!.id });
    if (!result.ok) {
      response.status(domainErrorToStatus(result.error)).json({ message: result.error.message });
      return;
    }
    response.json(InvoicePresenter.toDto(result.value));
  });

  return router;
}

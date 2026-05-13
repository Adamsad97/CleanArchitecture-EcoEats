import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import type { ToggleDriverStatusUseCase } from "../../../application/usecases/driver/ToggleDriverStatusUseCase.js";
import type { GetAvailableDeliveriesUseCase } from "../../../application/usecases/driver/GetAvailableDeliveriesUseCase.js";
import type { AcceptDeliveryUseCase } from "../../../application/usecases/driver/AcceptDeliveryUseCase.js";
import type { CreateDriverProfileUseCase } from "../../../application/usecases/driver/CreateDriverProfileUseCase.js";
import type { GetDriverProfileUseCase } from "../../../application/usecases/driver/GetDriverProfileUseCase.js";
import type { GetActiveDeliveryUseCase } from "../../../application/usecases/driver/GetActiveDeliveryUseCase.js";
import type { PickupDeliveryUseCase } from "../../../application/usecases/driver/PickupDeliveryUseCase.js";
import type { CompleteDeliveryUseCase } from "../../../application/usecases/driver/CompleteDeliveryUseCase.js";
import type { GetDriverWalletUseCase } from "../../../application/usecases/driver/GetDriverWalletUseCase.js";
import type { INotificationGateway } from "../../../application/ports/INotificationGateway.js";
import { domainErrorToStatus } from "../utils/domainErrorToStatus.js";

const DRIVERS_ONLINE_ROOM = "drivers:online";

export function createDriverRoutes(
  toggleDriverStatusUseCase:     ToggleDriverStatusUseCase,
  getAvailableDeliveriesUseCase: GetAvailableDeliveriesUseCase,
  acceptDeliveryUseCase:         AcceptDeliveryUseCase,
  createDriverProfileUseCase:    CreateDriverProfileUseCase,
  getDriverProfileUseCase:       GetDriverProfileUseCase,
  getActiveDeliveryUseCase:      GetActiveDeliveryUseCase,
  pickupDeliveryUseCase:         PickupDeliveryUseCase,
  completeDeliveryUseCase:       CompleteDeliveryUseCase,
  getDriverWalletUseCase:        GetDriverWalletUseCase,
  notificationGateway:           INotificationGateway,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.patch("/status", requireAuth, async (request: Request, response: Response) => {
    const parsed = z.object({ isOnline: z.boolean() }).safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ message: "Données invalides" }); return; }

    const result = await toggleDriverStatusUseCase.execute(request.user!.id, parsed.data.isOnline);
    if (!result.ok) { response.status(domainErrorToStatus(result.error)).json({ message: result.error.message }); return; }

    response.json(result.value);
  });

  router.get("/deliveries/available", requireAuth, async (_request: Request, response: Response) => {
    const deliveries = await getAvailableDeliveriesUseCase.execute();
    response.json(deliveries);
  });

  router.post("/deliveries/:orderId/accept", requireAuth, async (request: Request, response: Response) => {
    const { orderId } = request.params;
    if (!orderId) { response.status(400).json({ message: "Identifiant manquant" }); return; }

    const result = await acceptDeliveryUseCase.execute(request.user!.id, orderId);
    if (!result.ok) { response.status(domainErrorToStatus(result.error)).json({ message: result.error.message }); return; }

    notificationGateway.broadcastToRoom(DRIVERS_ONLINE_ROOM, "delivery:taken", { orderId });
    response.status(204).send();
  });

  /* ── GET /me — Profil + statut online du livreur connecté ── */
  router.get("/me", requireAuth, async (request: Request, response: Response) => {
    try {
      const profile = await getDriverProfileUseCase.execute(request.user!.id);
      response.json(profile ?? null);
    } catch (error) {
      console.error("[GET /driver/me]", error);
      response.status(500).json({ message: "Erreur serveur" });
    }
  });

  /* ── POST /profile — Créer le profil livreur ── */
  router.post("/profile", requireAuth, async (request: Request, response: Response) => {
    const parsed = z.object({
      name:          z.string().min(1),
      email:         z.string().email(),
      phone:         z.string().min(1),
      transportType: z.enum(["bike", "scooter", "car"]),
    }).safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ message: "Données invalides" }); return; }
    try {
      const profile = await createDriverProfileUseCase.execute(
        request.user!.id,
        parsed.data.name,
        parsed.data.email,
        parsed.data.phone,
        parsed.data.transportType,
      );
      response.status(201).json(profile);
    } catch (error) {
      console.error("[POST /driver/profile]", error);
      response.status(500).json({ message: "Erreur lors de la création du profil" });
    }
  });

  /* ── GET /deliveries/active — Livraison en cours ── */
  router.get("/deliveries/active", requireAuth, async (request: Request, response: Response) => {
    try {
      const result = await getActiveDeliveryUseCase.execute(request.user!.id);
      if (!result.ok) { response.status(404).json({ message: result.error.message }); return; }
      response.json(result.value);
    } catch (error) {
      console.error("[GET /driver/deliveries/active]", error);
      response.status(500).json({ message: "Erreur serveur" });
    }
  });

  /* ── POST /deliveries/:orderId/pickup — Commande récupérée au restaurant ── */
  router.post("/deliveries/:orderId/pickup", requireAuth, async (request: Request, response: Response) => {
    const { orderId } = request.params;
    try {
      const result = await pickupDeliveryUseCase.execute(request.user!.id, orderId);
      if (!result.ok) { response.status(403).json({ message: result.error.message }); return; }
      response.status(200).json({ message: "Commande récupérée" });
    } catch (error) {
      console.error("[POST /driver/deliveries/:id/pickup]", error);
      response.status(500).json({ message: "Erreur serveur" });
    }
  });

  /* ── POST /deliveries/:orderId/complete — Marquer comme livrée ── */
  router.post("/deliveries/:orderId/complete", requireAuth, async (request: Request, response: Response) => {
    const { orderId } = request.params;
    try {
      const result = await completeDeliveryUseCase.execute(request.user!.id, orderId);
      if (!result.ok) { response.status(403).json({ message: result.error.message }); return; }
      response.status(200).json({ message: "Commande livrée" });
    } catch (error) {
      console.error("[POST /driver/deliveries/:id/complete]", error);
      response.status(500).json({ message: "Erreur serveur" });
    }
  });

  /* ── GET /wallet — Portefeuille virtuel + historique des gains ── */
  router.get("/wallet", requireAuth, async (request: Request, response: Response) => {
    const result = await getDriverWalletUseCase.execute(request.user!.id);
    if (!result.ok) {
      response.status(domainErrorToStatus(result.error)).json({ message: result.error.message });
      return;
    }
    response.json(result.value);
  });

  return router;
}

import { describe, it, expect, beforeEach } from "vitest";
import { AcceptDeliveryUseCase } from "../../../application/usecases/driver/AcceptDeliveryUseCase.js";
import { InMemoryDriverRepository } from "../../../infrastructure/databases/inmemory/InMemoryDriverRepository.js";
import { InMemoryOrderRepository } from "../../../infrastructure/databases/inmemory/InMemoryOrderRepository.js";
import { Distance } from "../../../domain/value-objects/Distance.js";
import { Money } from "../../../domain/value-objects/Money.js";

describe("AcceptDeliveryUseCase (Clean Architecture Tests)", () => {
  let driverRepo: InMemoryDriverRepository;
  let orderRepo:  InMemoryOrderRepository;
  let useCase:    AcceptDeliveryUseCase;

  const mockNotificationGateway = {
    notifyUser:      () => {},
    broadcastToRoom: () => {},
  };

  beforeEach(() => {
    driverRepo = new InMemoryDriverRepository();
    orderRepo  = new InMemoryOrderRepository();
    useCase    = new AcceptDeliveryUseCase(driverRepo, orderRepo, mockNotificationGateway as any);
  });

  it("devrait refuser une livraison si un livreur standard a déjà une livraison active", async () => {
    // 1. Créer un livreur standard
    const driver = await driverRepo.save({
      id: "d1", userId: "u1", name: "Jean", email: "jean@test.com",
      isOnline: true, isExpert: false,
    });

    // 2. Simuler une livraison déjà en cours
    // 2. Simuler une livraison déjà en cours
    await orderRepo.save({ id: "o1", restaurantId: "r1" } as any);
    await driverRepo.simulateAssignment("o1", "d1", "r1");

    // 3. Créer l'ordre cible (qui doit exister pour être accepté)
    await orderRepo.save({ id: "o2", restaurantId: "r2" } as any);

    // 4. Tenter d'en accepter une autre
    const result = await useCase.execute("u1", "o2");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DELIVERY_CAPACITY_EXCEEDED");
    }
  });

  it("devrait accepter une 2ème livraison si le livreur est EXPERT et que c'est le MÊME restaurant", async () => {
    // 1. Créer un livreur Expert
    await driverRepo.save({
      id: "d-expert", userId: "u-exp", name: "Expert", email: "exp@test.com",
      isOnline: true, isExpert: true,
    });

    // 2. Livraison 1 (Restaurant A)
    await orderRepo.save({ id: "o1", restaurantId: "restau-A" } as any);
    await driverRepo.simulateAssignment("o1", "d-expert", "restau-A");

    // 3. Livraison 2 (Restaurant A) - Existante et prête
    await orderRepo.save({ id: "o2", restaurantId: "restau-A", status: "READY" } as any);

    const result = await useCase.execute("u-exp", "o2");

    expect(result.ok).toBe(true);
  });

  it("devrait REFUSER une 2ème livraison si le livreur est EXPERT mais que c'est un RESTAURANT DIFFÉRENT", async () => {
    await driverRepo.save({
      id: "d-expert", userId: "u-exp", name: "Expert", email: "exp@test.com",
      isOnline: true, isExpert: true,
    });

    await orderRepo.save({ id: "o1", restaurantId: "restau-A" } as any);
    await driverRepo.simulateAssignment("o1", "d-expert", "restau-A");

    await orderRepo.save({ id: "o2", restaurantId: "restau-B", status: "READY" } as any);

    const result = await useCase.execute("u-exp", "o2");

    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.error.code).toBe("DELIVERY_CAPACITY_EXCEEDED");
    }
  });
});

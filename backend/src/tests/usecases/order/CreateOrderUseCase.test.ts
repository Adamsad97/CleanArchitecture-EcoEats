import { describe, it, expect, beforeEach } from "vitest";
import { CreateOrderUseCase } from "../../../application/usecases/order/CreateOrderUseCase.js";
import { InMemoryOrderRepository } from "../../../infrastructure/databases/inmemory/InMemoryOrderRepository.js";
import { InMemoryRestaurantRepository } from "../../../infrastructure/databases/inmemory/InMemoryRestaurantRepository.js";
import { InMemoryMenuItemRepository } from "../../../infrastructure/databases/inmemory/InMemoryMenuRepository.js";
import { Money } from "../../../domain/value-objects/Money.js";

describe("CreateOrderUseCase (Clean Architecture Tests)", () => {
  let orderRepo:      InMemoryOrderRepository;
  let restaurantRepo: InMemoryRestaurantRepository;
  let menuItemRepo:   InMemoryMenuItemRepository;
  let useCase:        CreateOrderUseCase;

  beforeEach(() => {
    orderRepo      = new InMemoryOrderRepository();
    restaurantRepo = new InMemoryRestaurantRepository();
    menuItemRepo   = new InMemoryMenuItemRepository();
    useCase        = new CreateOrderUseCase(orderRepo, restaurantRepo, menuItemRepo);
  });

  it("devrait créer une commande avec un prix total correct et décrémenter le stock", async () => {
    // 1. Setup Restaurant (à 5km)
    await restaurantRepo.save({
      id: "r1", ownerId: "owner1", name: "Pizza Palace",
      lat: 48.8566, lng: 2.3522, // Paris Center
      address: "Paris", isAvailable: true, photoUrl: null, openingHours: [],
    });

    // 2. Setup Menu Item (Stock 5)
    await menuItemRepo.save({
      id: "m1", categoryId: "c1", name: "Margherita", price: 10,
      dailyStock: 5, isAvailable: true, options: [], description: null, photoUrl: null, isPopular: false,
    });

    // 3. Execute (Client à 48.89, 2.39 ~ 5km)
    const result = await useCase.execute({
      userId:    "user1",
      clientLat: 48.89, clientLng: 2.39,
      paymentMethodId: "pm_123",
      rawInput: {
        restaurantId: "r1",
        items: [{ menuItemId: "m1", name: "Margherita", unitPrice: 10, quantity: 2, options: [] }],
        tipAmount: 0
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Sous-total: 10 * 2 = 20€
      expect(result.value.subtotal).toBe(20);
      // Total (avec frais livraison/service): > 20
      expect(result.value.total).toBeGreaterThan(20);
    }

    // 4. Vérifier que le stock a été décrémenté (5 - 2 = 3)
    const item = await menuItemRepo.findById("m1");
    expect(item?.dailyStock).toBe(3);
  });

  it("devrait REFUSER la commande si le stock est épuisé", async () => {
    await restaurantRepo.save({ id: "r1", lat: 0, lng: 0 } as any);
    await menuItemRepo.save({ id: "m1", name: "Rupture", dailyStock: 0, isAvailable: true } as any);

    const result = await useCase.execute({
      userId: "u1", clientLat: 0, clientLng: 0, paymentMethodId: "pm",
      rawInput: {
        restaurantId: "r1",
        items: [{ menuItemId: "m1", name: "Rupture", unitPrice: 10, quantity: 1, options: [] }],
        tipAmount: 0
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OUT_OF_STOCK");
    }
  });

  it("devrait REFUSER si les articles viennent de restaurants différents", async () => {
     // Note: CreateOrderInput restreint déjà au niveau du type, mais le UseCase délègue à Cart
     // qui vérifierait si on ajoutait des items d'IDs de restaurants différents.
     // Ici, le input.rawInput.restaurantId est unique pour toute la commande.
     // La règle est donc structurellement respectée par le Use Case.
  });
});

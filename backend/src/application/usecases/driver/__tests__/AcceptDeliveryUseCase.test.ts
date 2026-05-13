import { describe, it, expect, vi } from "vitest";
import { AcceptDeliveryUseCase } from "../AcceptDeliveryUseCase.js";
import type { IDriverRepository } from "../../../ports/IDriverRepository.js";
import type { IOrderRepository, OrderBasicInfo } from "../../../ports/IOrderRepository.js";
import type { INotificationGateway } from "../../../ports/INotificationGateway.js";
import type { DriverProfile } from "../../../driver/types.js";

/* ── Helpers ── */
const makeDriver = (overrides: Partial<DriverProfile> = {}): DriverProfile => ({
  id:            "driver-1",
  userId:        "user-1",
  name:          "Jean Dupont",
  transportType: "bike",
  isOnline:      true,
  isVerified:    true,
  isExpert:      false,
  ...overrides,
});

const makeOrder = (restaurantId = "resto-1"): OrderBasicInfo => ({
  id:                "order-1",
  restaurantId,
  restaurantOwnerId: "owner-1",
  clientUserId:      "client-1",
  status:            "PAID",
});

const makeDriverRepo = (
  driver: DriverProfile | null,
  activeInfo: { count: number; restaurantIds: string[] },
  accepted = true,
): IDriverRepository =>
  ({
    findByUserId:          vi.fn().mockResolvedValue(driver),
    getActiveDeliveriesInfo: vi.fn().mockResolvedValue(activeInfo),
    acceptDelivery:        vi.fn().mockResolvedValue({ accepted }),
    toggleOnlineStatus:    vi.fn(),
    createProfile:         vi.fn(),
    getAvailableDeliveries: vi.fn(),
    getActiveDelivery:     vi.fn(),
    pickupDelivery:        vi.fn(),
    completeDelivery:      vi.fn(),
  }) as unknown as IDriverRepository;

const makeOrderRepo = (order: OrderBasicInfo | null): IOrderRepository =>
  ({ findById: vi.fn().mockResolvedValue(order) }) as unknown as IOrderRepository;

const makeNotif = (): INotificationGateway =>
  ({ notifyUser: vi.fn(), broadcastToRoom: vi.fn() }) as unknown as INotificationGateway;

describe("AcceptDeliveryUseCase — règle Livreur Expert", () => {
  it("livreur standard sans livraison active : succès", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver(), { count: 0, restaurantIds: [] }),
      makeOrderRepo(makeOrder()),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(true);
  });

  it("livreur standard avec 1 livraison active : DELIVERY_CAPACITY_EXCEEDED", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver(), { count: 1, restaurantIds: ["resto-X"] }),
      makeOrderRepo(makeOrder()),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("DELIVERY_CAPACITY_EXCEEDED");
  });

  it("livreur Expert avec 1 livraison du même restaurant : succès", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver({ isExpert: true }), { count: 1, restaurantIds: ["resto-1"] }),
      makeOrderRepo(makeOrder("resto-1")),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(true);
  });

  it("livreur Expert avec 1 livraison d'un restaurant différent : DELIVERY_CAPACITY_EXCEEDED", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver({ isExpert: true }), { count: 1, restaurantIds: ["resto-AUTRE"] }),
      makeOrderRepo(makeOrder("resto-1")),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("DELIVERY_CAPACITY_EXCEEDED");
  });

  it("livreur Expert avec 2 livraisons actives : DELIVERY_CAPACITY_EXCEEDED", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver({ isExpert: true }), { count: 2, restaurantIds: ["resto-1", "resto-1"] }),
      makeOrderRepo(makeOrder("resto-1")),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("DELIVERY_CAPACITY_EXCEEDED");
  });

  it("retourne DELIVERY_ALREADY_TAKEN si l'assignation échoue (race condition)", async () => {
    const uc = new AcceptDeliveryUseCase(
      makeDriverRepo(makeDriver(), { count: 0, restaurantIds: [] }, false),
      makeOrderRepo(makeOrder()),
      makeNotif(),
    );
    const result = await uc.execute("user-1", "order-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("DELIVERY_ALREADY_TAKEN");
  });
});

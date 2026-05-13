import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateOrderStatusUseCase } from "../UpdateOrderStatusUseCase.js";
import type { IOrderRepository, OrderBasicInfo } from "../../../ports/IOrderRepository.js";
import type { IRestaurantRepository } from "../../../ports/IRestaurantRepository.js";
import type { INotificationGateway } from "../../../ports/INotificationGateway.js";

/* ── Stubs ── */
const makeOrderRepo = (order: OrderBasicInfo | null): IOrderRepository =>
  ({
    findById:           vi.fn().mockResolvedValue(order),
    updateStatus:       vi.fn().mockResolvedValue(undefined),
    create:             vi.fn(),
    findAllByUserId:    vi.fn(),
    findAllByRestaurantId: vi.fn(),
  }) as unknown as IOrderRepository;

const makeRestaurantRepo = (ownsIt: boolean): IRestaurantRepository =>
  ({
    findAllByOwnerId: vi.fn().mockResolvedValue(
      ownsIt ? [{ id: "resto-1" }] : [],
    ),
  }) as unknown as IRestaurantRepository;

const makeNotifGateway = (): INotificationGateway =>
  ({
    notifyUser:       vi.fn(),
    broadcastToRoom:  vi.fn(),
  }) as unknown as INotificationGateway;

const stubOrder: OrderBasicInfo = {
  id:                "order-1",
  restaurantId:      "resto-1",
  restaurantOwnerId: "owner-1",
  clientUserId:      "client-1",
  status:            "PAID",
};

describe("UpdateOrderStatusUseCase", () => {
  it("accepte une transition valide (PAID → ACCEPTED)", async () => {
    const useCase = new UpdateOrderStatusUseCase(
      makeOrderRepo(stubOrder),
      makeRestaurantRepo(true),
      makeNotifGateway(),
    );
    const result = await useCase.execute("order-1", "ACCEPTED", "owner-1");
    expect(result.ok).toBe(true);
  });

  it("refuse une transition invalide (PAID → DELIVERED)", async () => {
    const useCase = new UpdateOrderStatusUseCase(
      makeOrderRepo(stubOrder),
      makeRestaurantRepo(true),
      makeNotifGateway(),
    );
    const result = await useCase.execute("order-1", "DELIVERED", "owner-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("INVALID_ORDER_TRANSITION");
  });

  it("retourne ORDER_NOT_FOUND si la commande n'existe pas", async () => {
    const useCase = new UpdateOrderStatusUseCase(
      makeOrderRepo(null),
      makeRestaurantRepo(true),
      makeNotifGateway(),
    );
    const result = await useCase.execute("inexistant", "ACCEPTED", "owner-1");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("ORDER_NOT_FOUND");
  });

  it("retourne UNAUTHORIZED_ORDER_ACCESS si le propriétaire ne possède pas le restaurant", async () => {
    const useCase = new UpdateOrderStatusUseCase(
      makeOrderRepo(stubOrder),
      makeRestaurantRepo(false),
      makeNotifGateway(),
    );
    const result = await useCase.execute("order-1", "ACCEPTED", "autre-owner");
    expect(result.ok).toBe(false);
    expect((result as any).error.code).toBe("UNAUTHORIZED_ORDER_ACCESS");
  });
});

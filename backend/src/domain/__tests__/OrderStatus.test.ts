import { describe, it, expect } from "vitest";
import { OrderStatus } from "../value-objects/OrderStatus.js";
import { InvalidOrderTransitionError } from "../errors/OrderErrors.js";

describe("OrderStatus", () => {
  it("démarre à PENDING", () => {
    expect(OrderStatus.initial().value).toBe("PENDING");
  });

  it("autorise PENDING → PAID", () => {
    const status = OrderStatus.initial().transitionTo("PAID");
    expect(status.value).toBe("PAID");
  });

  it("autorise PAID → ACCEPTED", () => {
    const status = OrderStatus.from("PAID").transitionTo("ACCEPTED");
    expect(status.value).toBe("ACCEPTED");
  });

  it("autorise PAID → REFUSED", () => {
    const status = OrderStatus.from("PAID").transitionTo("REFUSED");
    expect(status.value).toBe("REFUSED");
  });

  it("refuse PENDING → DELIVERED (transition invalide)", () => {
    expect(() => OrderStatus.initial().transitionTo("DELIVERED"))
      .toThrow(InvalidOrderTransitionError);
  });

  it("refuse toute transition depuis DELIVERED (état terminal)", () => {
    expect(() => OrderStatus.from("DELIVERED").transitionTo("CANCELLED"))
      .toThrow(InvalidOrderTransitionError);
  });

  it("canTransitionTo retourne false sans lever d'exception", () => {
    expect(OrderStatus.from("DELIVERED").canTransitionTo("CANCELLED")).toBe(false);
  });
});

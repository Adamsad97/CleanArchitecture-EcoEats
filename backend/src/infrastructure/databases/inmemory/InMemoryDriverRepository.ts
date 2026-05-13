import crypto from "node:crypto";
import { InMemoryRepository } from "./InMemoryRepository.js";
import type { IDriverRepository, CreateDriverProfileInput, CreditEarningInput } from "../../../application/ports/IDriverRepository.js";
import type { DriverProfile, AvailableDelivery, ActiveDelivery, DriverWallet, EarningRecord } from "../../../application/driver/types.js";

type StoredDriver = DriverProfile;

type StoredEarning = EarningRecord & { driverId: string };

/**
 * Adaptateur In-Memory pour IDriverRepository.
 *
 * Deux stores internes : drivers + earnings.
 * Le portefeuille est calculé à la volée depuis les earnings (pas de dénormalisation).
 */
export class InMemoryDriverRepository
  extends InMemoryRepository<StoredDriver>
  implements IDriverRepository
{
  private readonly earningStore = new Map<string, StoredEarning>();
  private readonly activeAssignments = new Map<string, { driverId: string; restaurantId: string }>();

  async findByUserId(userId: string): Promise<DriverProfile | null> {
    return this.findWhere((d) => d.userId === userId);
  }

  async createProfile(input: CreateDriverProfileInput): Promise<DriverProfile> {
    const driver: StoredDriver = {
      id:            crypto.randomUUID(),
      userId:        input.userId,
      name:          input.name,
      transportType: input.transportType,
      isOnline:      false,
      isVerified:    false,
      isExpert:      false,
    };
    return this.save(driver);
  }

  async toggleOnlineStatus(driverId: string, isOnline: boolean): Promise<DriverProfile> {
    const driver = this.getById(driverId);
    if (!driver) throw new Error("Driver not found");
    const updated = { ...driver, isOnline };
    return this.save(updated);
  }

  async getAvailableDeliveries(): Promise<AvailableDelivery[]> {
    return [];
  }

  async acceptDelivery(orderId: string, driverId: string): Promise<{ accepted: boolean }> {
    // Note: Pour un test complet, on devrait vérifier si l'ordre existe
    // Mais ici on simule juste l'acceptation
    this.activeAssignments.set(orderId, { driverId, restaurantId: "r-mock" }); // restaurantId sera mis à jour par le test si besoin
    return { accepted: true };
  }

  /** Helper pour les tests afin de simuler une assignation sans passer par acceptDelivery */
  async simulateAssignment(orderId: string, driverId: string, restaurantId: string): Promise<void> {
    this.activeAssignments.set(orderId, { driverId, restaurantId });
  }

  async getActiveDelivery(_driverId: string): Promise<ActiveDelivery | null> {
    return null;
  }

  async getActiveDeliveriesInfo(driverId: string): Promise<{ count: number; restaurantIds: string[] }> {
    const assignments = [...this.activeAssignments.values()].filter((a) => a.driverId === driverId);
    return {
      count:         assignments.length,
      restaurantIds: assignments.map((a) => a.restaurantId),
    };
  }

  async pickupDelivery(_orderId: string, _driverId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async completeDelivery(_orderId: string, _driverId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async creditEarning(input: CreditEarningInput): Promise<EarningRecord> {
    const earning: StoredEarning = {
      id:          crypto.randomUUID(),
      driverId:    input.driverId,
      orderId:     input.orderId,
      baseAmount:  input.baseAmount,
      distanceFee: input.distanceFee,
      tipAmount:   input.tipAmount,
      total:       input.baseAmount + input.distanceFee + input.tipAmount,
      earnedAt:    new Date().toISOString(),
    };
    this.earningStore.set(earning.id, earning);
    return earning;
  }

  async getWallet(driverId: string): Promise<DriverWallet> {
    const earnings = [...this.earningStore.values()]
      .filter((e) => e.driverId === driverId)
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));

    const balanceEuros = earnings.reduce((sum, e) => sum + e.total, 0);
    return { balanceEuros, earnings };
  }
}

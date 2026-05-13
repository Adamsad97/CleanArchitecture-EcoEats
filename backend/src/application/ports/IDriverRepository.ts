import type { DriverProfile, AvailableDelivery, ActiveDelivery, DriverWallet, EarningRecord } from "../driver/types.js";

export type CreateDriverProfileInput = {
  userId:        string;
  name:          string;
  email:         string;
  phone:         string;
  transportType: "bike" | "scooter" | "car";
};

export type CreditEarningInput = {
  driverId:    string;
  orderId:     string;
  baseAmount:  number;
  distanceFee: number;
  tipAmount:   number;
};

export interface IDriverRepository {
  findByUserId(userId: string): Promise<DriverProfile | null>;
  createProfile(input: CreateDriverProfileInput): Promise<DriverProfile>;
  toggleOnlineStatus(driverId: string, isOnline: boolean): Promise<DriverProfile>;
  getAvailableDeliveries(): Promise<AvailableDelivery[]>;
  acceptDelivery(orderId: string, driverId: string): Promise<{ accepted: boolean }>;
  getActiveDelivery(driverId: string): Promise<ActiveDelivery | null>;
  /** Retourne le nombre de livraisons actives du livreur (et le restaurantId de chacune). */
  getActiveDeliveriesInfo(driverId: string): Promise<{ count: number; restaurantIds: string[] }>;
  pickupDelivery(orderId: string, driverId: string): Promise<{ success: boolean; message?: string }>;
  completeDelivery(orderId: string, driverId: string): Promise<{ success: boolean; message?: string }>;
  /** Crédite le portefeuille virtuel du livreur après livraison. */
  creditEarning(input: CreditEarningInput): Promise<EarningRecord>;
  /** Retourne le solde total + l'historique des gains du livreur. */
  getWallet(driverId: string): Promise<DriverWallet>;
}


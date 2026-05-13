import crypto from "node:crypto";
import { InMemoryRepository } from "./InMemoryRepository.js";
import type { IRestaurantRepository } from "../../../application/ports/IRestaurantRepository.js";
import type {
  Restaurant,
  CreateRestaurantInput,
  UpdateRestaurantProfileInput,
} from "../../../application/restaurant/types.js";
import type { OpeningHoursMap } from "../../../domain/value-objects/OpeningHours.js";

/**
 * Adaptateur In-Memory pour IRestaurantRepository.
 * Module restaurant autosuffisant — pas de dépendance DB.
 */
export class InMemoryRestaurantRepository
  extends InMemoryRepository<Restaurant>
  implements IRestaurantRepository
{
  async getStats() {
    const all    = [...this.store.values()];
    const active = all.filter((r) => r.isActive).length;
    return { total: all.length, active };
  }

  async findAllActive(): Promise<Restaurant[]> {
    return this.filterWhere((r) => r.isActive);
  }

  async findAllByOwnerId(ownerId: string): Promise<Restaurant[]> {
    return this.filterWhere((r) => r.ownerId === ownerId);
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.getById(id);
  }

  async create(input: CreateRestaurantInput): Promise<Restaurant> {
    const restaurant: Restaurant = {
      id:           crypto.randomUUID(),
      ownerId:      input.ownerId,
      name:         input.name,
      description:  input.description ?? null,
      logoUrl:      null,
      address:      input.address,
      lat:          input.lat,
      lng:          input.lng,
      openingHours: {} as OpeningHoursMap,
      isActive:     false,
      ratingAvg:    null,
      cuisineType:  input.cuisineType,
      prepTimeMin:  input.prepTimeMin,
      deliveryFee:  input.deliveryFee,
    };
    return this.save(restaurant);
  }

  async updateProfile(id: string, input: UpdateRestaurantProfileInput): Promise<Restaurant> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Restaurant not found");
    return this.save({ ...existing, ...input });
  }

  async updateOpeningHours(id: string, openingHours: OpeningHoursMap): Promise<Restaurant> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Restaurant not found");
    return this.save({ ...existing, openingHours });
  }

  async updateStatus(id: string, isActive: boolean): Promise<Restaurant> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Restaurant not found");
    return this.save({ ...existing, isActive });
  }

  async updateLogoUrl(id: string, logoUrl: string): Promise<Restaurant> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Restaurant not found");
    return this.save({ ...existing, logoUrl });
  }
}

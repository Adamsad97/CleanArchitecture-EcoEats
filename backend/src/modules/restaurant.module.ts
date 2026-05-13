import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaRestaurantRepository } from "../infrastructure/repositories/PrismaRestaurantRepository.js";
import { GetOwnerRestaurantsUseCase } from "../application/usecases/restaurant/GetOwnerRestaurantsUseCase.js";
import { CreateRestaurantUseCase } from "../application/usecases/restaurant/CreateRestaurantUseCase.js";
import { UpdateRestaurantProfileUseCase } from "../application/usecases/restaurant/UpdateRestaurantProfileUseCase.js";
import { UpdateOpeningHoursUseCase } from "../application/usecases/restaurant/UpdateOpeningHoursUseCase.js";
import { ToggleRestaurantStatusUseCase } from "../application/usecases/restaurant/ToggleRestaurantStatusUseCase.js";

type Deps = { prisma: PrismaClient };

/**
 * Module Restaurant — assemble le repository et tous les use cases restaurateur.
 *
 * Expose `restaurantRepository` pour injection dans les modules Order et Driver.
 */
export function buildRestaurantModule({ prisma }: Deps) {
  const restaurantRepository = new PrismaRestaurantRepository(prisma);

  return {
    restaurantRepository,
    getOwnerRestaurantsUseCase:    new GetOwnerRestaurantsUseCase(restaurantRepository),
    createRestaurantUseCase:       new CreateRestaurantUseCase(restaurantRepository),
    updateRestaurantProfileUseCase: new UpdateRestaurantProfileUseCase(restaurantRepository),
    updateOpeningHoursUseCase:     new UpdateOpeningHoursUseCase(restaurantRepository),
    toggleRestaurantStatusUseCase: new ToggleRestaurantStatusUseCase(restaurantRepository),
  };
}

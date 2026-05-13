import type { MenuCategory } from "../../menu/types.js";
import type { IMenuCategoryRepository } from "../../ports/IMenuCategoryRepository.js";
import type { ICacheService } from "../../ports/ICacheService.js";

/**
 * Récupère le menu complet d'un restaurant avec une couche de cache Redis.
 */
export class GetRestaurantMenuUseCase {
  constructor(
    private readonly menuCategoryRepository: IMenuCategoryRepository,
    private readonly cacheService:           ICacheService,
  ) {}

  async execute(restaurantId: string): Promise<MenuCategory[]> {
    const cacheKey = `menu:${restaurantId}`;
    
    // Tenter de récupérer depuis le cache
    const cachedMenu = await this.cacheService.get<MenuCategory[]>(cacheKey);
    if (cachedMenu) {
      console.log(`[Cache] Hit for ${cacheKey}`);
      return cachedMenu;
    }

    // Sinon, charger depuis la DB
    const menu = await this.menuCategoryRepository.findAllByRestaurantId(restaurantId);
    
    // Et stocker dans le cache pour 5 minutes
    await this.cacheService.set(cacheKey, menu, 300);
    
    return menu;
  }
}

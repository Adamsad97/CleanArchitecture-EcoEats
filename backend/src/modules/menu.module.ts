import type { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMenuCategoryRepository } from "../infrastructure/repositories/PrismaMenuCategoryRepository.js";
import { PrismaMenuItemRepository } from "../infrastructure/repositories/PrismaMenuItemRepository.js";
import { GetRestaurantMenuUseCase } from "../application/usecases/menu/GetRestaurantMenuUseCase.js";
import { CreateMenuCategoryUseCase } from "../application/usecases/menu/CreateMenuCategoryUseCase.js";
import { UpdateMenuCategoryUseCase } from "../application/usecases/menu/UpdateMenuCategoryUseCase.js";
import { DeleteMenuCategoryUseCase } from "../application/usecases/menu/DeleteMenuCategoryUseCase.js";
import { CreateMenuItemUseCase } from "../application/usecases/menu/CreateMenuItemUseCase.js";
import { UpdateMenuItemUseCase } from "../application/usecases/menu/UpdateMenuItemUseCase.js";
import { DeleteMenuItemUseCase } from "../application/usecases/menu/DeleteMenuItemUseCase.js";
import { ToggleMenuItemAvailabilityUseCase } from "../application/usecases/menu/ToggleMenuItemAvailabilityUseCase.js";
import { UpdateMenuItemStockUseCase } from "../application/usecases/menu/UpdateMenuItemStockUseCase.js";
import { CreateMenuItemOptionUseCase } from "../application/usecases/menu/CreateMenuItemOptionUseCase.js";
import { ExportMenuCsvUseCase } from "../application/usecases/menu/ExportMenuCsvUseCase.js";
import { ImportMenuCsvUseCase } from "../application/usecases/menu/ImportMenuCsvUseCase.js";

type Deps = { prisma: PrismaClient };

/**
 * Module Menu — assemble tous les repositories et use cases du domaine Menu.
 *
 * Pattern : Factory Function → injection de dépendances explicite,
 * sans conteneur IoC externe (KISS).
 */
export function buildMenuModule({ prisma }: Deps) {
  const menuCategoryRepository = new PrismaMenuCategoryRepository(prisma);
  const menuItemRepository     = new PrismaMenuItemRepository(prisma);

  return {
    menuCategoryRepository,
    menuItemRepository,
    getRestaurantMenuUseCase:          new GetRestaurantMenuUseCase(menuCategoryRepository),
    createMenuCategoryUseCase:         new CreateMenuCategoryUseCase(menuCategoryRepository),
    updateMenuCategoryUseCase:         new UpdateMenuCategoryUseCase(menuCategoryRepository),
    deleteMenuCategoryUseCase:         new DeleteMenuCategoryUseCase(menuCategoryRepository),
    createMenuItemUseCase:             new CreateMenuItemUseCase(menuCategoryRepository, menuItemRepository),
    updateMenuItemUseCase:             new UpdateMenuItemUseCase(menuCategoryRepository, menuItemRepository),
    deleteMenuItemUseCase:             new DeleteMenuItemUseCase(menuCategoryRepository, menuItemRepository),
    toggleMenuItemAvailabilityUseCase: new ToggleMenuItemAvailabilityUseCase(menuCategoryRepository, menuItemRepository),
    updateMenuItemStockUseCase:        new UpdateMenuItemStockUseCase(menuCategoryRepository, menuItemRepository),
    createMenuItemOptionUseCase:       new CreateMenuItemOptionUseCase(menuCategoryRepository, menuItemRepository),
    exportMenuCsvUseCase:              new ExportMenuCsvUseCase(menuCategoryRepository),
    importMenuCsvUseCase:              new ImportMenuCsvUseCase(menuCategoryRepository, menuItemRepository),
  };
}

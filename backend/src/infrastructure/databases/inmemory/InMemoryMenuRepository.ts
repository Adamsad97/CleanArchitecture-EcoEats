import crypto from "node:crypto";
import { InMemoryRepository } from "./InMemoryRepository.js";
import type { IMenuCategoryRepository } from "../../../application/ports/IMenuCategoryRepository.js";
import type { IMenuItemRepository } from "../../../application/ports/IMenuItemRepository.js";
import type {
  MenuCategory,
  MenuItem,
  MenuItemOption,
  MenuOptionValue,
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  CreateMenuItemOptionInput,
  MenuOptionType,
} from "../../../application/menu/types.js";

// ── In-Memory Menu Category Repository ────────────────────────────────────────

/**
 * Adaptateur In-Memory pour IMenuCategoryRepository.
 * Module Menu — category side. Les items sont stockés séparément (InMemoryMenuItemRepository).
 */
export class InMemoryMenuCategoryRepository
  extends InMemoryRepository<MenuCategory>
  implements IMenuCategoryRepository
{
  async findAllByRestaurantId(restaurantId: string): Promise<MenuCategory[]> {
    return this.filterWhere((c) => c.restaurantId === restaurantId)
      .sort((a, b) => a.position - b.position);
  }

  async findById(id: string): Promise<MenuCategory | null> {
    return this.getById(id);
  }

  async create(input: CreateMenuCategoryInput): Promise<MenuCategory> {
    const existing = await this.findAllByRestaurantId(input.restaurantId);
    const category: MenuCategory = {
      id:           crypto.randomUUID(),
      restaurantId: input.restaurantId,
      name:         input.name,
      position:     existing.length,
      availability: input.availability,
      items:        [],
    };
    return this.save(category);
  }

  async update(id: string, input: UpdateMenuCategoryInput): Promise<MenuCategory> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Category not found");
    return this.save({ ...existing, ...input });
  }

  async remove(id: string): Promise<void> {
    this.deleteById(id);
  }

  async reorder(restaurantId: string, orderedIds: string[]): Promise<void> {
    for (const [index, categoryId] of orderedIds.entries()) {
      const category = this.getById(categoryId);
      if (category && category.restaurantId === restaurantId) {
        this.save({ ...category, position: index });
      }
    }
  }
}

// ── In-Memory Menu Item Repository ────────────────────────────────────────────

type StoredItem = MenuItem & { options: MenuItemOption[] };

/**
 * Adaptateur In-Memory pour IMenuItemRepository.
 * Module Menu — item side.
 */
export class InMemoryMenuItemRepository
  extends InMemoryRepository<StoredItem>
  implements IMenuItemRepository
{
  async findById(id: string): Promise<MenuItem | null> {
    return this.getById(id);
  }

  async findByCategoryId(categoryId: string): Promise<MenuItem[]> {
    return this.filterWhere((item) => item.categoryId === categoryId);
  }

  async create(input: CreateMenuItemInput): Promise<MenuItem> {
    const item: StoredItem = {
      id:          crypto.randomUUID(),
      categoryId:  input.categoryId,
      name:        input.name,
      description: input.description ?? null,
      photoUrl:    null,
      price:       input.price,
      isAvailable: input.isAvailable,
      isPopular:   input.isPopular,
      dailyStock:  input.dailyStock ?? null,
      options:     [],
    };
    return this.save(item);
  }

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Item not found");
    return this.save({ ...existing, ...input });
  }

  async remove(id: string): Promise<void> {
    this.deleteById(id);
  }

  async updatePhotoUrl(id: string, photoUrl: string): Promise<MenuItem> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Item not found");
    return this.save({ ...existing, photoUrl });
  }

  async decrementStock(id: string): Promise<MenuItem> {
    const existing = this.getById(id);
    if (!existing) throw new Error("Item not found");
    const newStock      = existing.dailyStock !== null ? existing.dailyStock - 1 : null;
    const isAvailable   = newStock === null || newStock > 0;
    return this.save({ ...existing, dailyStock: newStock, isAvailable });
  }

  async createOption(input: CreateMenuItemOptionInput): Promise<MenuItemOption> {
    const item = this.getById(input.itemId);
    if (!item) throw new Error("Item not found");

    const option: MenuItemOption = {
      id:         crypto.randomUUID(),
      itemId:     input.itemId,
      name:       input.name,
      type:       input.type as MenuOptionType,
      isRequired: input.isRequired,
      values: input.values.map((v): MenuOptionValue => ({
        id:         crypto.randomUUID(),
        optionId:   "",  // sera mis à jour
        label:      v.label,
        extraPrice: v.extraPrice,
      })),
    };
    option.values.forEach((v) => { (v as { optionId: string }).optionId = option.id; });
    this.save({ ...item, options: [...item.options, option] });
    return option;
  }

  async removeOption(optionId: string): Promise<void> {
    for (const item of this.store.values()) {
      const filtered = item.options.filter((o) => o.id !== optionId);
      if (filtered.length !== item.options.length) {
        this.save({ ...item, options: filtered });
        break;
      }
    }
  }
}

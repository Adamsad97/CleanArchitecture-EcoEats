"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../../../auth/context/AuthContext";
import { getStoredAccessToken } from "../../../auth/services/tokenHelper";
import {
  getRestaurantMenu,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  updateItemStock,
  uploadItemPhoto,
  importMenuCsv,
  exportMenuCsv,
  getItemPhotoUrl,
  AVAILABILITY_LABELS,
} from "../../../auth/services/menu/menuService";
import type { MenuCategoryDto, MenuItemDto, MenuAvailability } from "../../../auth/services/menu/menuService";

const AVAILABILITY_OPTIONS: MenuAvailability[] = ["always", "lunch", "dinner", "weekend"];

export default function MenuManagementPage() {
  const { tokens } = useAuth();
  const searchParams        = useSearchParams();
  const restaurantId        = searchParams.get("restaurantId") ?? "";

  const [categories,    setCategories]    = useState<MenuCategoryDto[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [pageError,     setPageError]     = useState<string | null>(null);
  const [actionError,   setActionError]   = useState<string | null>(null);

  const [showAddCategory,  setShowAddCategory]  = useState(false);
  const [newCategoryName,  setNewCategoryName]  = useState("");
  const [newCategoryAvail, setNewCategoryAvail] = useState<MenuAvailability>("always");

  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newItem,          setNewItem]           = useState({ name: "", description: "", price: "", dailyStock: "" });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm,  setEditItemForm]  = useState<Partial<MenuItemDto>>({});

  const csvInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => tokens?.accessToken ?? null;

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantMenu(restaurantId).then((result) => {
      if (result.ok) setCategories(result.data ?? []);
      else setPageError(result.message ?? "Erreur de chargement");
      setLoading(false);
    });
  }, [restaurantId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const token = await getToken();
    if (!token) return;

    const result = await createMenuCategory(restaurantId, { name: newCategoryName.trim(), availability: newCategoryAvail }, token);
    if (result.ok && result.data) {
      setCategories((previous) => [...previous, result.data!]);
      setNewCategoryName("");
      setShowAddCategory(false);
    } else {
      setActionError(result.message ?? "Erreur");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const token = await getToken();
    if (!token) return;
    const result = await deleteMenuCategory(restaurantId, categoryId, token);
    if (result.ok) setCategories((previous) => previous.filter((cat) => cat.id !== categoryId));
    else setActionError(result.message ?? "Erreur");
  };

  const handleAddItem = async (categoryId: string) => {
    if (!newItem.name.trim() || !newItem.price) return;
    const token = await getToken();
    if (!token) return;

    const result = await createMenuItem(restaurantId, {
      categoryId,
      name:        newItem.name.trim(),
      description: newItem.description.trim() || undefined,
      price:       parseFloat(newItem.price),
      isAvailable: true,
      isPopular:   false,
      ...(newItem.dailyStock !== "" && { dailyStock: parseInt(newItem.dailyStock) }),
    }, token);

    if (result.ok && result.data) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, result.data!] } : cat,
      ));
      setNewItem({ name: "", description: "", price: "", dailyStock: "" });
      setShowAddItem(null);
    } else {
      setActionError(result.message ?? "Erreur");
    }
  };

  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    const token = await getToken();
    if (!token) return;
    const result = await deleteMenuItem(restaurantId, itemId, token);
    if (result.ok) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) } : cat,
      ));
    } else {
      setActionError(result.message ?? "Erreur");
    }
  };

  const handleToggleAvailability = async (categoryId: string, item: MenuItemDto) => {
    const token = await getToken();
    if (!token) return;
    const result = await toggleItemAvailability(restaurantId, item.id, !item.isAvailable, token);
    if (result.ok && result.data) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.map((i) => i.id === item.id ? result.data! : i) } : cat,
      ));
    }
  };

  const handleUpdateStock = async (categoryId: string, item: MenuItemDto, stockValue: string) => {
    const token = await getToken();
    if (!token) return;
    const dailyStock = stockValue === "" ? null : parseInt(stockValue);
    const result = await updateItemStock(restaurantId, item.id, dailyStock, token);
    if (result.ok && result.data) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.map((i) => i.id === item.id ? result.data! : i) } : cat,
      ));
    }
  };

  const handleSaveEditItem = async (categoryId: string) => {
    if (!editingItemId) return;
    const token = await getToken();
    if (!token) return;
    const result = await updateMenuItem(restaurantId, editingItemId, editItemForm, token);
    if (result.ok && result.data) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.map((i) => i.id === editingItemId ? result.data! : i) } : cat,
      ));
      setEditingItemId(null);
    } else {
      setActionError(result.message ?? "Erreur");
    }
  };

  const handlePhotoUpload = async (categoryId: string, itemId: string, file: File) => {
    const token = await getToken();
    if (!token) return;
    const result = await uploadItemPhoto(restaurantId, itemId, file, token);
    if (result.ok && result.data) {
      setCategories((previous) => previous.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.map((i) => i.id === itemId ? result.data! : i) } : cat,
      ));
    }
  };

  const handleImportCsv = async (file: File) => {
    const token = await getToken();
    if (!token) return;
    const result = await importMenuCsv(restaurantId, file, token);
    if (result.ok && result.data) {
      const refreshed = await getRestaurantMenu(restaurantId);
      if (refreshed.ok) setCategories(refreshed.data ?? []);
      alert(`Import réussi : ${result.data.categoriesCreated} catégories, ${result.data.itemsCreated} plats créés.`);
    } else {
      setActionError(result.message ?? "Erreur d'import");
    }
  };

  if (!restaurantId) return (
    <div className="text-center py-12">
      <p className="text-red-500 text-sm">Aucun restaurant sélectionné.</p>
      <a href="/dashboard/restaurants" className="text-xs text-orange-600 hover:underline mt-2 inline-block">← Retour aux restaurants</a>
    </div>
  );
  if (loading) return <p className="text-slate-400 text-sm">Chargement…</p>;

  return (
    <div className="max-w-3xl space-y-6 mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gestion du menu</h1>
          <p className="text-slate-500 text-sm mt-1">{categories.length} catégorie{categories.length !== 1 ? "s" : ""} · {categories.reduce((sum, cat) => sum + cat.items.length, 0)} plats</p>
        </div>
        <div className="flex gap-2">
          <a
            href={tokens?.accessToken ? exportMenuCsv(restaurantId, tokens.accessToken) : "#"}
            download
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            ↓ Exporter CSV
          </a>
          <button type="button" onClick={() => csvInputRef.current?.click()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
            ↑ Importer CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImportCsv(file); e.target.value = ""; }} />
          <button type="button" onClick={() => setShowAddCategory(true)}
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition">
            + Catégorie
          </button>
        </div>
      </div>

      {pageError   && <p className="text-sm text-red-600">{pageError}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {/* Formulaire nouvelle catégorie */}
      {showAddCategory && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nouvelle catégorie</p>
          <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie" autoFocus
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <select value={newCategoryAvail} onChange={(e) => setNewCategoryAvail(e.target.value as MenuAvailability)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400">
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{AVAILABILITY_LABELS[option]}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={handleAddCategory}
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition">
              Créer
            </button>
            <button type="button" onClick={() => setShowAddCategory(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Catégories et plats */}
      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* En-tête catégorie */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{category.name}</span>
              <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                {AVAILABILITY_LABELS[category.availability]}
              </span>
              <span className="text-xs text-slate-400">{category.items.length} plat{category.items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setShowAddItem(category.id)}
                className="text-xs text-orange-600 font-semibold hover:underline">+ Plat</button>
              <button type="button" onClick={() => handleDeleteCategory(category.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
            </div>
          </div>

          {/* Formulaire ajout plat */}
          {showAddItem === category.id && (
            <div className="px-6 py-4 border-b border-slate-100 space-y-3 bg-orange-50">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Nouveau plat</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nom du plat *" value={newItem.name} onChange={(e) => setNewItem((newItemForm) => ({ ...newItemForm, name: e.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Description" value={newItem.description} onChange={(e) => setNewItem((newItemForm) => ({ ...newItemForm, description: e.target.value }))} />
                <input type="number" min="0" step="0.5" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Prix (€) *" value={newItem.price} onChange={(e) => setNewItem((newItemForm) => ({ ...newItemForm, price: e.target.value }))} />
                <input type="number" min="0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Stock jour (vide = illimité)" value={newItem.dailyStock} onChange={(e) => setNewItem((newItemForm) => ({ ...newItemForm, dailyStock: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => handleAddItem(category.id)}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition">Ajouter</button>
                <button type="button" onClick={() => setShowAddItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Annuler</button>
              </div>
            </div>
          )}

          {/* Liste des plats — toujours visible */}
          <div className="divide-y divide-slate-100">
              {category.items.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-400 italic">Aucun plat dans cette catégorie.</p>
              ) : (
                category.items.map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    {editingItemId === item.id ? (
                      /* Mode édition */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            value={editItemForm.name ?? item.name} onChange={(e) => setEditItemForm((editForm) => ({ ...editForm, name: e.target.value }))} />
                          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            placeholder="Description" value={editItemForm.description ?? item.description ?? ""}
                            onChange={(e) => setEditItemForm((editForm) => ({ ...editForm, description: e.target.value }))} />
                          <input type="number" min="0" step="0.5" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            value={editItemForm.price ?? item.price} onChange={(e) => setEditItemForm((editForm) => ({ ...editForm, price: parseFloat(e.target.value) }))} />
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => handleSaveEditItem(category.id)}
                            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition">Enregistrer</button>
                          <button type="button" onClick={() => setEditingItemId(null)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      /* Mode affichage */
                      <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative group">
                          {getItemPhotoUrl(item.photoUrl) ? (
                            <Image src={getItemPhotoUrl(item.photoUrl)!} alt={item.name} fill sizes="56px" className="object-cover" />
                          ) : (
                            <span className="flex items-center justify-center h-full text-2xl">🍽️</span>
                          )}
                          <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                            <span className="text-white text-xs">📷</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(category.id, item.id, file); e.target.value = ""; }} />
                          </label>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                            {item.isPopular && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">⭐ Populaire</span>}
                            {!item.isAvailable && <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Indisponible</span>}
                          </div>

                          {/* Description toujours visible */}
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                          )}

                          {/* Options / variantes */}
                          {item.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.options.map((option) => (
                                <div key={option.id} className="text-xs text-slate-500">
                                  <span className="font-semibold text-slate-700">{option.name}</span>
                                  {option.isRequired && <span className="text-red-400 ml-1">*</span>}
                                  <span className="text-slate-400 ml-1">
                                    ({option.values.map((value) => value.extraPrice > 0 ? `${value.label} +${value.extraPrice.toFixed(2)}€` : value.label).join(", ")})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-sm font-bold text-orange-600">{item.price.toFixed(2)} €</span>
                            {item.dailyStock !== null && (
                              <span className={`text-xs font-semibold ${item.dailyStock === 0 ? "text-red-600" : "text-slate-500"}`}>
                                Stock : {item.dailyStock === 0 ? "⚠️ Rupture" : `${item.dailyStock} restants`}
                              </span>
                            )}
                          </div>

                          {/* Contrôle stock inline */}
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-xs text-slate-400">Stock/jour :</label>
                            <input type="number" min="0" placeholder="∞ illimité"
                              defaultValue={item.dailyStock !== null ? String(item.dailyStock) : ""}
                              className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                              onBlur={(e) => handleUpdateStock(category.id, item, e.target.value)} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <button type="button" onClick={() => handleToggleAvailability(category.id, item)}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${item.isAvailable ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {item.isAvailable ? "Actif" : "Désactivé"}
                          </button>
                          <button type="button" onClick={() => { setEditingItemId(item.id); setEditItemForm({}); }}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Modifier</button>
                          <button type="button" onClick={() => handleDeleteItem(category.id, item.id)}
                            className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition">Supprimer</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
          </div>
        </div>
      ))}

      {categories.length === 0 && !showAddCategory && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-3xl mb-3">🍽️</p>
          <p className="text-slate-500 text-sm">Aucune catégorie — créez-en une pour commencer.</p>
        </div>
      )}
    </div>
  );
}

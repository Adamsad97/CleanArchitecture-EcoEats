"use client";

import { useState } from "react";
import Image from "next/image";
import { API_BASE } from "../../../auth/services/http";
import type { MenuItemDto, MenuItemOptionDto, MenuOptionValueDto } from "../../../auth/services/menu/menuService";
import type { CartEntry, SelectedOptionValue, OptionSelection } from "../types";

function OptionValueRow({
  value, isSelected, isSingle, onToggle,
}: {
  value:      MenuOptionValueDto;
  isSelected: boolean;
  isSingle:   boolean;
  onToggle:   () => void;
}) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left">
      <span className="text-sm text-slate-800">{value.label}</span>
      <div className="flex items-center gap-3 shrink-0">
        {value.extraPrice > 0 && (
          <span className="text-sm text-slate-500">+{value.extraPrice.toFixed(2)} €</span>
        )}
        <div className={`w-5 h-5 border-2 flex items-center justify-center transition ${
          isSingle ? "rounded-full" : "rounded"
        } ${isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300"}`}>
          {isSelected && (
            isSingle
              ? <div className="w-2 h-2 rounded-full bg-white" />
              : <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          )}
        </div>
      </div>
    </button>
  );
}

function OptionGroup({
  option, selected, onToggle,
}: {
  option:   MenuItemOptionDto;
  selected: string[];
  onToggle: (valueId: string) => void;
}) {
  const maxLabel = option.type === "single" ? "1" : String(option.values.length);
  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-slate-900">{option.name}</p>
          {option.isRequired && (
            <span className="text-xs bg-slate-900 text-white rounded-full px-2 py-0.5 font-semibold">Obligatoire</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Choisissez-en {maxLabel} max.</p>
      </div>
      <div className="space-y-0 divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
        {option.values.map((value) => (
          <OptionValueRow
            key={value.id}
            value={value}
            isSelected={selected.includes(value.id)}
            isSingle={option.type === "single"}
            onToggle={() => onToggle(value.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function ItemModal({
  item, onClose, onAdd,
}: {
  item:    MenuItemDto;
  onClose: () => void;
  onAdd:   (entry: Omit<CartEntry, "cartId">) => void;
}) {
  const [selections, setSelections] = useState<OptionSelection>({});
  const [notes,      setNotes]      = useState("");
  const [quantity,   setQuantity]   = useState(1);
  const photoUrl = item.photoUrl ? `${API_BASE}/${item.photoUrl}` : null;

  const toggleValue = (option: MenuItemOptionDto, valueId: string) => {
    setSelections((previous) => {
      const current = previous[option.id] ?? [];
      if (option.type === "single") {
        return { ...previous, [option.id]: current[0] === valueId ? [] : [valueId] };
      }
      return {
        ...previous,
        [option.id]: current.includes(valueId)
          ? current.filter((id) => id !== valueId)
          : [...current, valueId],
      };
    });
  };

  const extraTotal = item.options.flatMap((option) =>
    (selections[option.id] ?? []).map((valueId) => {
      const value = option.values.find((optionValue) => optionValue.id === valueId);
      return value?.extraPrice ?? 0;
    }),
  ).reduce((sum, price) => sum + price, 0);

  const unitTotal  = item.price + extraTotal;
  const grandTotal = unitTotal * quantity;

  const handleAdd = () => {
    const selectedOptions: SelectedOptionValue[] = item.options.flatMap((option) =>
      (selections[option.id] ?? []).flatMap((valueId) => {
        const value = option.values.find((optionValue) => optionValue.id === valueId);
        if (!value) return [];
        return [{ optionId: option.id, optionName: option.name, valueId, valueName: value.label, extraPrice: value.extraPrice }];
      }),
    );
    onAdd({ item, selectedOptions, notes, quantity });
  };

  const canAdd = item.options
    .filter((option) => option.isRequired)
    .every((option) => (selections[option.id] ?? []).length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:mx-4 sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-600">
            ✕
          </button>
          <p className="text-sm font-bold text-slate-900">{item.name}</p>
          <div className="w-8" />
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto flex-1">

          {/* Photo */}
          {photoUrl && (
            <div className="relative h-56 bg-slate-100">
              <Image src={photoUrl} alt={item.name} fill sizes="100vw" className="object-cover" />
            </div>
          )}

          <div className="p-5 space-y-6">

            {/* Nom + description */}
            <div>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-black text-slate-900">{item.name}</h2>
                <span className="text-xl font-black text-slate-900 shrink-0 ml-4">{item.price.toFixed(2)} €</span>
              </div>
              {item.description && (
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
              )}
            </div>

            {/* Options */}
            {item.options.map((option) => (
              <OptionGroup
                key={option.id}
                option={option}
                selected={selections[option.id] ?? []}
                onToggle={(valueId) => toggleValue(option, valueId)}
              />
            ))}

            {/* Instructions spécifiques */}
            <div>
              <p className="text-base font-bold text-slate-900 mb-2">Instructions spécifiques</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez un commentaire…"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {/* Sélecteur de quantité */}
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={() => setQuantity((quantityValue) => Math.max(1, quantityValue - 1))}
                className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-900 hover:bg-slate-300 transition">
                −
              </button>
              <span className="text-lg font-black w-8 text-center text-slate-900">{quantity}</span>
              <button type="button" onClick={() => setQuantity((quantityValue) => quantityValue + 1)}
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-xl font-bold text-white hover:bg-slate-700 transition">
                +
              </button>
            </div>

          </div>
        </div>

        {/* Bouton ajouter */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={handleAdd} disabled={!canAdd}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 flex items-center justify-between px-5 disabled:opacity-40 hover:bg-slate-800 transition">
            <span className="text-sm font-bold">En ajouter {quantity} à la commande</span>
            <span className="text-sm font-black">{grandTotal.toFixed(2)} €</span>
          </button>
          {!canAdd && (
            <p className="text-xs text-red-500 text-center mt-2">
              Veuillez compléter les options obligatoires
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

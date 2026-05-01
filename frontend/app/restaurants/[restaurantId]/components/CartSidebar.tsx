import type { CartEntry } from "../types";
import { cartEntryTotal } from "../types";

export function CartSidebar({
  cart, cartTotal, onClose, onRemove, onCheckout,
}: {
  cart:       CartEntry[];
  cartTotal:  number;
  onClose:    () => void;
  onRemove:   (cartId: string) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full max-w-sm flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-base font-black text-slate-900">Mon panier</p>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-500">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.map((entry) => (
            <div key={entry.cartId} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{entry.item.name}</p>
                  <p className="text-sm font-bold text-slate-900 shrink-0 ml-2">
                    {cartEntryTotal(entry).toFixed(2)} €
                  </p>
                </div>
                  <p className="text-xs text-slate-400 mt-0.5">× {entry.quantity}</p>
                {entry.selectedOptions.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {entry.selectedOptions.map((option) => option.valueName).join(", ")}
                  </p>
                )}
                {entry.notes && (
                  <p className="text-xs text-slate-400 italic mt-0.5">&quot;{entry.notes}&quot;</p>
                )}
              </div>
              <button type="button" onClick={() => onRemove(entry.cartId)}
                className="text-red-400 hover:text-red-600 transition text-lg shrink-0 mt-0.5">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-lg font-black text-slate-900">{cartTotal.toFixed(2)} €</span>
          </div>
          <button type="button" onClick={onCheckout}
            className="w-full bg-orange-600 text-white rounded-2xl py-4 text-sm font-bold hover:bg-orange-700 transition">
            Passer la commande →
          </button>
        </div>
      </div>
    </div>
  );
}

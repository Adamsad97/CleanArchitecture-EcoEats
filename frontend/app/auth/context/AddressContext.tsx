"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "ecoeats_addresses";

const loadStoredAddresses = (): { addresses: SavedAddress[]; activeId: string | null } => {
  if (typeof window === "undefined") return { addresses: [], activeId: null };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { addresses: [], activeId: null };

    const parsed = JSON.parse(stored) as SavedAddress[];
    if (!Array.isArray(parsed) || parsed.length === 0) return { addresses: [], activeId: null };

    return {
      addresses: parsed,
      activeId: parsed.find((address) => address.isDefault)?.id ?? parsed[0].id,
    };
  } catch {
    return { addresses: [], activeId: null };
  }
};

export type SavedAddress = {
  id:         string;
  label:      string;
  street:     string;
  postalCode: string;
  city:       string;
  isDefault:  boolean;
};

type AddressContextValue = {
  addresses:       SavedAddress[];
  activeAddress:   SavedAddress | null;
  setActiveId:     (id: string) => void;
  addAddress:      (label: string, street: string, postalCode: string, city: string) => void;
  removeAddress:   (id: string) => void;
};

const AddressContext = createContext<AddressContextValue | null>(null);

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const initialState = loadStoredAddresses();
  const [addresses, setAddresses] = useState<SavedAddress[]>(initialState.addresses);
  const [activeId, setActiveId] = useState<string | null>(initialState.activeId);

  /* ── Persistance ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  }, [addresses]);

  const activeAddress = addresses.find((address) => address.id === activeId) ?? addresses[0] ?? null;

  const addAddress = useCallback((label: string, street: string, postalCode: string, city: string) => {
    const newAddr: SavedAddress = {
      id:         `addr-${Date.now()}`,
      label:      label.trim() || "Adresse",
      street:     street.trim(),
      postalCode: postalCode.trim(),
      city:       city.trim(),
      isDefault:  false,
    };
    setAddresses((previousAddresses) => {
      /* La première adresse ajoutée devient la principale */
      if (previousAddresses.length === 0) newAddr.isDefault = true;
      const updated = [...previousAddresses, newAddr];
      return updated;
    });
    setActiveId(newAddr.id);
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((previousAddresses) => {
      const updated = previousAddresses.filter((address) => address.id !== id);
      /* Si on supprime la principale, la nouvelle première devient principale */
      if (updated.length > 0 && !updated.some((address) => address.isDefault)) {
        updated[0] = { ...updated[0], isDefault: true };
      }
      return updated;
    });
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  return (
    <AddressContext.Provider value={{ addresses, activeAddress, setActiveId, addAddress, removeAddress }}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddresses() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddresses doit être utilisé dans AddressProvider");
  return ctx;
}

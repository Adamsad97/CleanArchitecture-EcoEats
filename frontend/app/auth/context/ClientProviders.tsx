"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "./AuthContext";
import { NotificationProvider } from "./NotificationContext";
import { CartProvider } from "./CartContext";
import { AddressProvider } from "./AddressContext";
import { useAuth } from "./AuthContext";

/* Chargement différé : ces overlays ne sont jamais nécessaires au rendu initial */
const GlobalCartSidebar    = dynamic(() => import("../../components/GlobalCartSidebar").then((module) => ({ default: module.GlobalCartSidebar })),    { ssr: false });
const GlobalCheckoutOverlay = dynamic(() => import("../../components/GlobalCheckoutOverlay").then((module) => ({ default: module.GlobalCheckoutOverlay })), { ssr: false });

function NotificationBridge({ children }: { children: React.ReactNode }) {
  const { tokens, user } = useAuth();
  return (
    <NotificationProvider
      accessToken={tokens?.accessToken ?? null}
      userId={user?.id ?? null}
    >
      {children}
    </NotificationProvider>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationBridge>
        <AddressProvider>
          <CartProvider>
            <GlobalCartSidebar />
            <GlobalCheckoutOverlay />
            {children}
          </CartProvider>
        </AddressProvider>
      </NotificationBridge>
    </AuthProvider>
  );
}

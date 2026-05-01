"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { connectSocket, disconnectSocket } from "../services/socketService";
import type { NotificationPayload } from "../services/socketService";

export type NotificationRecord = NotificationPayload & {
  id:         string;
  receivedAt: Date;
  read:       boolean;
};

type NotificationContextValue = {
  toasts:       NotificationRecord[];
  history:      NotificationRecord[];
  unreadCount:  number;
  dismissToast: (id: string) => void;
  markAllRead:  () => void;
};

const storageKey = (userId: string) => `ecoeats_notifications_${userId}`;

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 heures

const loadHistory = (userId: string): NotificationRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return (JSON.parse(raw) as NotificationRecord[])
      .map((notification) => ({ ...notification, receivedAt: new Date(notification.receivedAt) }))
      .filter((notification) => notification.receivedAt.getTime() > cutoff);
  } catch {
    return [];
  }
};

const saveHistory = (userId: string, history: NotificationRecord[]): void => {
  localStorage.setItem(storageKey(userId), JSON.stringify(history.slice(0, 50)));
};

const NotificationContext = createContext<NotificationContextValue>({
  toasts:       [],
  history:      [],
  unreadCount:  0,
  dismissToast: () => undefined,
  markAllRead:  () => undefined,
});

export const NotificationProvider = ({
  children,
  accessToken,
  userId,
}: {
  children:    React.ReactNode;
  accessToken: string | null;
  userId:      string | null;
}) => {
  const [history, setHistory] = useState<NotificationRecord[]>(() => userId ? loadHistory(userId) : []);
  const [toasts, setToasts] = useState<NotificationRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Recharge l'historique quand l'utilisateur change de compte
  useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(userId ? loadHistory(userId) : []);
      setToasts([]);
    }, 0);

    return () => clearTimeout(timer);
  }, [userId]);

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    setHistory((previous) => {
      const updated = previous.map((notification) => ({ ...notification, read: true }));
      saveHistory(userId, updated);
      return updated;
    });
  }, [userId]);

  const addNotification = useCallback((payload: NotificationPayload) => {
    const record: NotificationRecord = {
      ...payload,
      id:         `${Date.now()}-${Math.random()}`,
      receivedAt: new Date(),
      read:       false,
    };

    setHistory((previous) => {
      const cutoff = Date.now() - MAX_AGE_MS;
      const updated = [record, ...previous.filter((notification) => notification.receivedAt.getTime() > cutoff)];
      if (userId) saveHistory(userId, updated);
      return updated;
    });
    setToasts((previous) => [...previous, record]);

    const timer = setTimeout(() => dismissToast(record.id), 3000);
    timersRef.current.set(record.id, timer);
  }, [userId, dismissToast]);

  /* Ref stable → le socket ne se reconnecte pas à chaque render */
  const addNotificationRef = useRef(addNotification);
  useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);

  useEffect(() => {
    if (!accessToken) return;

    const handler = (payload: NotificationPayload) => addNotificationRef.current(payload);
    const socket = connectSocket(accessToken);
    socket.on("notification", handler);

    return () => { socket.off("notification", handler); };
    /* Pas de disconnectSocket() ici : la connexion reste ouverte entre les re-renders */
  }, [accessToken]);

  const unreadCount = history.filter((notification) => !notification.read).length;

  return (
    <NotificationContext.Provider value={{ toasts, history, unreadCount, dismissToast, markAllRead }}>
      {children}
      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

/* ── Toast stack ──────────────────────────────────────────────────────────── */

import { IconCheck, IconX as IconXIcon, IconX as IconXClose, IconOrderConfirmed, IconFood, IconScooter, IconBicycle, IconWarning, IconInfo } from "../../components/Icons";

export const NOTIFICATION_STYLES: Record<string, { bg: string; badge: string; icon: React.ReactNode }> = {
  document_validated:    { bg: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700", icon: <IconCheck className="h-3.5 w-3.5" />           },
  document_rejected:     { bg: "bg-red-600",     badge: "bg-red-100 text-red-700",         icon: <IconXIcon className="h-3.5 w-3.5" />            },
  account_activated:     { bg: "bg-orange-600",  badge: "bg-orange-100 text-orange-700",   icon: <IconOrderConfirmed className="h-3.5 w-3.5" />   },
  order_confirmed:       { bg: "bg-blue-600",    badge: "bg-blue-100 text-blue-700",       icon: <IconCheck className="h-3.5 w-3.5" />            },
  order_prepared:        { bg: "bg-green-600",   badge: "bg-green-100 text-green-700",     icon: <IconFood className="h-3.5 w-3.5" />             },
  order_driver_assigned: { bg: "bg-indigo-600",  badge: "bg-indigo-100 text-indigo-700",   icon: <IconScooter className="h-3.5 w-3.5" />          },
  order_delivering:      { bg: "bg-orange-600",  badge: "bg-orange-100 text-orange-700",   icon: <IconBicycle className="h-3.5 w-3.5" />          },
  order_delivered:       { bg: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700", icon: <IconOrderConfirmed className="h-3.5 w-3.5" />   },
  order_cancelled:       { bg: "bg-red-600",     badge: "bg-red-100 text-red-700",         icon: <IconWarning className="h-3.5 w-3.5" />          },
};

function NotificationToastStack({
  toasts,
  onDismiss,
}: {
  toasts:    NotificationRecord[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = NOTIFICATION_STYLES[toast.type] ?? { bg: "bg-slate-800", icon: <IconInfo className="h-4 w-4" /> };
        return (
          <div key={toast.id}
            className={`${style.bg} text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3`}
          >
            <span className="shrink-0 mt-0.5">{style.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">{toast.title}</p>
              <p className="text-xs text-white/80 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-white/60 hover:text-white transition">
              <IconXClose className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

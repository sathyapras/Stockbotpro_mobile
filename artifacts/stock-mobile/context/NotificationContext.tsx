import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchAllPicks } from "@/services/stockpickService";
import { fetchSmartMoneyFlow } from "@/services/smartMoneyService";
import { fetchRadarMarket } from "@/services/radarMarketService";
import {
  type AppNotification,
  applyReadStatus,
  generateNotifications,
  loadReadIds,
  markAllRead,
  saveReadIds,
} from "@/services/notificationService";

// ─── Context shape ────────────────────────────────────────────

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [], unreadCount: 0, isLoading: true,
  markRead: () => {}, markAllAsRead: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

// ─── Provider ─────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readLoaded, setReadLoaded] = useState(false);

  // Load persisted read IDs once
  useEffect(() => {
    loadReadIds().then(ids => {
      setReadIds(ids);
      setReadLoaded(true);
    });
  }, []);

  const { data: picks, isLoading: l1 } = useQuery({
    queryKey: ["stockpick-all"],
    queryFn: fetchAllPicks,
    staleTime: 30 * 60 * 1000,
  });

  const { data: smRaw, isLoading: l2 } = useQuery({
    queryKey: ["smart-money-flow"],
    queryFn: fetchSmartMoneyFlow,
    staleTime: 30 * 60 * 1000,
  });

  const { data: radarAll = [], isLoading: l3 } = useQuery({
    queryKey: ["radar-market"],
    queryFn: fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
  });

  const isLoading = l1 || l2 || l3 || !readLoaded;

  // Generate and apply read status
  const notifications = useMemo<AppNotification[]>(() => {
    if (isLoading) return [];
    const bow  = picks?.bow ?? [];
    const bos  = picks?.bos ?? [];
    const sm   = smRaw?.data ?? [];
    const raw  = generateNotifications(bow, bos, sm, radarAll);
    return applyReadStatus(raw, readIds);
  }, [picks, smRaw, radarAll, readIds, isLoading]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const ids = notifications.map(n => n.id);
    setReadIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      saveReadIds(next);
      return next;
    });
    markAllRead(ids);
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, isLoading, markRead, markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

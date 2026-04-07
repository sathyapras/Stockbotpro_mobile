import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (code: string) => void;
  removeFromWatchlist: (code: string) => void;
  isWatched: (code: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isWatched: () => false,
});

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('stock_watchlist').then(data => {
      if (data) {
        try {
          setWatchlist(JSON.parse(data));
        } catch (_) {}
      }
    });
  }, []);

  const addToWatchlist = useCallback((code: string) => {
    setWatchlist(prev => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      AsyncStorage.setItem('stock_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((code: string) => {
    setWatchlist(prev => {
      const next = prev.filter(c => c !== code);
      AsyncStorage.setItem('stock_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isWatched = useCallback(
    (code: string) => watchlist.includes(code),
    [watchlist]
  );

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}

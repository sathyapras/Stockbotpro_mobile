import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockRow } from '@/components/StockRow';
import { useWatchlist } from '@/context/WatchlistContext';
import { useColors } from '@/hooks/useColors';
import { getAllStocks } from '@/services/stockData';

const ALL_STOCKS = getAllStocks();

export default function WatchlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { watchlist, removeFromWatchlist } = useWatchlist();

  const watched = watchlist
    .map(code => ALL_STOCKS.find(s => s.code === code))
    .filter(Boolean) as ReturnType<typeof getAllStocks>;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 8;

  const handleRemove = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Remove', `Remove ${code} from watchlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeFromWatchlist(code),
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Watchlist</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {watched.length} {watched.length === 1 ? 'stock' : 'stocks'}
        </Text>
      </View>

      <FlatList
        data={watched}
        keyExtractor={item => item.code}
        renderItem={({ item }) => (
          <StockRow
            stock={item}
            rightElement={
              <View style={styles.rightActions}>
                <View style={styles.priceGroup}>
                  <Text style={[styles.price, { color: colors.foreground }]}>
                    {item.price.toLocaleString('id-ID')}
                  </Text>
                  <Text
                    style={[
                      styles.change,
                      { color: item.change >= 0 ? colors.up : colors.down },
                    ]}
                  >
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemove(item.code)}
                  style={[styles.removeBtn, { backgroundColor: colors.destructive + '18' }]}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="bookmark" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No stocks saved
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Add stocks from the Market tab to track them here
            </Text>
            <TouchableOpacity
              style={[styles.marketBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.navigate('/' as never)}
            >
              <Feather name="bar-chart-2" size={14} color={colors.primaryForeground} />
              <Text style={[styles.marketBtnText, { color: colors.primaryForeground }]}>
                Browse Market
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === 'web' ? 100 : 90,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceGroup: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  change: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  marketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  marketBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
});

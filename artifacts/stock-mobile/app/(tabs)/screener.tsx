import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignalBadge } from '@/components/SignalBadge';
import { StockRow } from '@/components/StockRow';
import { useColors } from '@/hooks/useColors';
import {
  getAllStocks,
  getIndicators,
  type Stock,
  formatPrice,
} from '@/services/stockData';

type SignalFilter = 'ALL' | 'BUY' | 'SELL' | 'NEUTRAL';
type RSIFilter = 'ALL' | 'oversold' | 'normal' | 'overbought';

const ALL_STOCKS = getAllStocks();

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? activeColor + '22' : colors.card,
          borderColor: active ? activeColor : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? activeColor : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ScreenerRow({ stock }: { stock: Stock }) {
  const colors = useColors();
  const ind = getIndicators(stock.code);

  return (
    <StockRow
      stock={stock}
      showSector
      rightElement={
        <View style={styles.screenerRight}>
          <Text style={[styles.priceText, { color: colors.foreground }]}>
            {formatPrice(stock.price)}
          </Text>
          <View style={styles.screenerMeta}>
            <SignalBadge signal={ind.signal} size="sm" />
            <Text style={[styles.rsiText, { color: colors.mutedForeground }]}>
              RSI {ind.rsi.toFixed(0)}
            </Text>
          </View>
        </View>
      }
    />
  );
}

export default function ScreenerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [rsiFilter, setRSIFilter] = useState<RSIFilter>('ALL');

  const results = useMemo(() => {
    return ALL_STOCKS.filter(stock => {
      const ind = getIndicators(stock.code);
      if (signalFilter !== 'ALL' && ind.signal !== signalFilter) return false;
      if (rsiFilter === 'oversold' && ind.rsi >= 40) return false;
      if (rsiFilter === 'overbought' && ind.rsi <= 65) return false;
      if (rsiFilter === 'normal' && (ind.rsi < 40 || ind.rsi > 65)) return false;
      return true;
    });
  }, [signalFilter, rsiFilter]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 8;

  const buyCount = ALL_STOCKS.filter(s => getIndicators(s.code).signal === 'BUY').length;
  const sellCount = ALL_STOCKS.filter(s => getIndicators(s.code).signal === 'SELL').length;
  const neutralCount = ALL_STOCKS.filter(s => getIndicators(s.code).signal === 'NEUTRAL').length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Screener</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {results.length} stocks found
        </Text>
      </View>

      <View style={[styles.filtersSection, { backgroundColor: colors.background }]}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Signal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <FilterChip label="All" active={signalFilter === 'ALL'} onPress={() => setSignalFilter('ALL')} />
            <FilterChip
              label={`Buy (${buyCount})`}
              active={signalFilter === 'BUY'}
              onPress={() => setSignalFilter('BUY')}
              color={colors.up}
            />
            <FilterChip
              label={`Sell (${sellCount})`}
              active={signalFilter === 'SELL'}
              onPress={() => setSignalFilter('SELL')}
              color={colors.down}
            />
            <FilterChip
              label={`Neutral (${neutralCount})`}
              active={signalFilter === 'NEUTRAL'}
              onPress={() => setSignalFilter('NEUTRAL')}
              color={colors.neutral}
            />
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>RSI</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <FilterChip label="All RSI" active={rsiFilter === 'ALL'} onPress={() => setRSIFilter('ALL')} />
            <FilterChip
              label="Oversold < 40"
              active={rsiFilter === 'oversold'}
              onPress={() => setRSIFilter('oversold')}
              color={colors.up}
            />
            <FilterChip
              label="Normal 40-65"
              active={rsiFilter === 'normal'}
              onPress={() => setRSIFilter('normal')}
            />
            <FilterChip
              label="Overbought > 65"
              active={rsiFilter === 'overbought'}
              onPress={() => setRSIFilter('overbought')}
              color={colors.down}
            />
          </ScrollView>
        </View>

        {(signalFilter !== 'ALL' || rsiFilter !== 'ALL') && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setSignalFilter('ALL');
              setRSIFilter('ALL');
            }}
          >
            <Feather name="x" size={12} color={colors.mutedForeground} />
            <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>
              Clear filters
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.code}
        renderItem={({ item }) => <ScreenerRow stock={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="filter" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No stocks match
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Try adjusting the filters
            </Text>
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
    paddingBottom: 10,
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
  filtersSection: {
    paddingBottom: 8,
  },
  filterGroup: {
    marginBottom: 2,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 8,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  screenerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  screenerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rsiText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockRow } from '@/components/StockRow';
import { useColors } from '@/hooks/useColors';
import {
  getAllStocks,
  getMarketBreadth,
  getTopGainers,
  getTopLosers,
  type Stock,
  formatChange,
  formatPrice,
} from '@/services/stockData';

const STOCKS = getAllStocks();
const BREADTH = getMarketBreadth();
const GAINERS = getTopGainers(5);
const LOSERS = getTopLosers(5);

function MoverCard({ stock }: { stock: Stock }) {
  const colors = useColors();
  const isUp = stock.change >= 0;
  const changeColor = isUp ? colors.up : colors.down;

  return (
    <TouchableOpacity
      style={[styles.moverCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/stock/${stock.code}` as never)}
      activeOpacity={0.7}
    >
      <View style={[styles.moverCodeBadge, { backgroundColor: changeColor + '22' }]}>
        <Text style={[styles.moverCode, { color: changeColor }]}>{stock.code}</Text>
      </View>
      <Text style={[styles.moverName, { color: colors.mutedForeground }]} numberOfLines={1}>
        {stock.name.split(' ').slice(0, 2).join(' ')}
      </Text>
      <Text style={[styles.moverPrice, { color: colors.foreground }]}>
        {formatPrice(stock.price)}
      </Text>
      <Text style={[styles.moverChange, { color: changeColor }]}>
        {formatChange(stock.change)}
      </Text>
    </TouchableOpacity>
  );
}

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return STOCKS;
    const q = query.toUpperCase();
    return STOCKS.filter(
      s => s.code.includes(q) || s.name.toUpperCase().includes(q)
    );
  }, [query]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 8;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>IDX Market</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={[styles.liveTag, { backgroundColor: colors.up + '22' }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.up }]} />
            <Text style={[styles.liveText, { color: colors.up }]}>LIVE</Text>
          </View>
        </View>

        <View style={[styles.breadthCard, { backgroundColor: colors.card }]}>
          <View style={styles.breadthItem}>
            <Text style={[styles.breadthNum, { color: colors.up }]}>{BREADTH.advance}</Text>
            <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Advance</Text>
          </View>
          <View style={[styles.breadthDivider, { backgroundColor: colors.border }]} />
          <View style={styles.breadthItem}>
            <Text style={[styles.breadthNum, { color: colors.neutral }]}>{BREADTH.unchanged}</Text>
            <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Unchanged</Text>
          </View>
          <View style={[styles.breadthDivider, { backgroundColor: colors.border }]} />
          <View style={styles.breadthItem}>
            <Text style={[styles.breadthNum, { color: colors.down }]}>{BREADTH.decline}</Text>
            <Text style={[styles.breadthLabel, { color: colors.mutedForeground }]}>Decline</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.code}
        renderItem={({ item }) => <StockRow stock={item} />}
        ListHeaderComponent={
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Gainers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moversRow}>
                {GAINERS.map(s => <MoverCard key={s.code} stock={s} />)}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Losers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moversRow}>
                {LOSERS.map(s => <MoverCard key={s.code} stock={s} />)}
              </ScrollView>
            </View>

            <View style={[styles.searchWrapper, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Stocks</Text>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search code or name..."
                  placeholderTextColor={colors.mutedForeground}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="characters"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No stocks found for "{query}"
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  breadthCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
  },
  breadthItem: {
    flex: 1,
    alignItems: 'center',
  },
  breadthNum: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  breadthLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  breadthDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  moversRow: {
    gap: 10,
    paddingBottom: 4,
  },
  moverCard: {
    width: 110,
    padding: 12,
    borderRadius: 12,
  },
  moverCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 6,
  },
  moverCode: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  moverName: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  moverPrice: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  moverChange: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CandlestickChart } from '@/components/CandlestickChart';
import { HakaHakiCard } from '@/components/HakaHakiCard';
import { IndicatorCard } from '@/components/IndicatorCard';
import { MoneyFlowCard } from '@/components/MoneyFlowCard';
import { SignalBadge } from '@/components/SignalBadge';
import { useWatchlist } from '@/context/WatchlistContext';
import { useColors } from '@/hooks/useColors';
import {
  getBrokerFlow,
  getHakaHaki,
  getIndicators,
  getOHLCV,
  getStock,
  formatChange,
  formatPrice,
  formatVolume,
} from '@/services/stockData';

type Period = '1W' | '1M' | '3M' | '6M' | '1Y';
const PERIODS: Period[] = ['1W', '1M', '3M', '6M', '1Y'];

export default function StockDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const colors = useColors();
  const { isWatched, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [period, setPeriod] = useState<Period>('1M');

  const stockCode = code ?? '';
  const stock = getStock(stockCode);
  const indicators = getIndicators(stockCode);
  const brokerFlow = getBrokerFlow(stockCode);
  const hakaHaki = getHakaHaki(stockCode);
  const chartData = getOHLCV(stockCode, period);

  const watched = isWatched(stockCode);
  const isUp = (stock?.change ?? 0) >= 0;
  const changeColor = (stock?.change ?? 0) === 0 ? colors.neutral : isUp ? colors.up : colors.down;

  const handleToggleWatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (watched) removeFromWatchlist(stockCode);
    else addToWatchlist(stockCode);
  };

  if (!stock) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Stock not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.foreground,
          headerRight: () => (
            <TouchableOpacity onPress={handleToggleWatch} style={styles.watchBtn}>
              <Feather
                name={watched ? 'bookmark' : 'bookmark'}
                size={20}
                color={watched ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 100 : 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.priceHeader}>
          <View style={styles.codeRow}>
            <View style={[styles.codePill, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.codeText, { color: colors.primary }]}>{stock.code}</Text>
            </View>
            <SignalBadge signal={indicators.signal} />
          </View>
          <Text style={[styles.stockName, { color: colors.mutedForeground }]} numberOfLines={2}>
            {stock.name}
          </Text>
          <Text style={[styles.bigPrice, { color: colors.foreground }]}>
            {formatPrice(stock.price)}
          </Text>
          <View style={styles.changeRow}>
            <View style={[styles.changePill, { backgroundColor: changeColor + '22' }]}>
              <Feather
                name={isUp ? 'trending-up' : 'trending-down'}
                size={12}
                color={changeColor}
              />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {formatChange(stock.change)}
              </Text>
              <Text style={[styles.changeAbs, { color: changeColor }]}>
                ({isUp ? '+' : ''}{formatPrice(stock.changeValue)})
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Open</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatPrice(stock.open)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>High</Text>
              <Text style={[styles.statValue, { color: colors.up }]}>{formatPrice(stock.high)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Low</Text>
              <Text style={[styles.statValue, { color: colors.down }]}>{formatPrice(stock.low)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Volume</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatVolume(stock.volume)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.periodRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodBtn,
                  period === p && { backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: period === p ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <CandlestickChart data={chartData} />
        </View>

        <View style={styles.section}>
          <IndicatorCard indicators={indicators} currentPrice={stock.price} />
        </View>

        <View style={styles.section}>
          <MoneyFlowCard flow={brokerFlow} />
        </View>

        <View style={styles.section}>
          <HakaHakiCard data={hakaHaki} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  watchBtn: {
    padding: 8,
    marginRight: 4,
  },
  priceHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  codePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
  },
  stockName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  bigPrice: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  changeAbs: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
  section: {
    paddingHorizontal: 16,
  },
});

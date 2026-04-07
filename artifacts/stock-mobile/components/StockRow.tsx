import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { type Stock, formatChange, formatPrice, formatVolume } from '@/services/stockData';

interface StockRowProps {
  stock: Stock;
  showSector?: boolean;
  rightElement?: React.ReactNode;
}

export function StockRow({ stock, showSector = false, rightElement }: StockRowProps) {
  const colors = useColors();
  const isUp = stock.change >= 0;
  const changeColor = stock.change === 0 ? colors.neutral : isUp ? colors.up : colors.down;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={() => router.push(`/stock/${stock.code}` as never)}
      activeOpacity={0.7}
      testID={`stock-row-${stock.code}`}
    >
      <View style={styles.left}>
        <View style={[styles.codeBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.code, { color: colors.primary }]}>{stock.code}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {stock.name}
          </Text>
          {showSector && (
            <Text style={[styles.sector, { color: colors.mutedForeground }]}>{stock.sector}</Text>
          )}
          <Text style={[styles.volume, { color: colors.mutedForeground }]}>
            Vol {formatVolume(stock.volume)}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {rightElement ?? (
          <>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {formatPrice(stock.price)}
            </Text>
            <View style={[styles.changeBadge, { backgroundColor: changeColor + '22' }]}>
              <Feather
                name={stock.change >= 0 ? 'trending-up' : 'trending-down'}
                size={10}
                color={changeColor}
              />
              <Text style={[styles.change, { color: changeColor }]}>
                {formatChange(stock.change)}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  code: {
    fontSize: 13,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  sector: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  volume: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
});

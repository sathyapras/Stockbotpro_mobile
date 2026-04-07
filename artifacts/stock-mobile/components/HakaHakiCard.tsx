import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { type HakaHaki, formatMoney } from '@/services/stockData';

interface HakaHakiCardProps {
  data: HakaHaki;
}

function FlowRow({ label, buy, sell, net, buyColor, sellColor }: {
  label: string;
  buy: number;
  sell: number;
  net: number;
  buyColor: string;
  sellColor: string;
}) {
  const colors = useColors();
  const netColor = net >= 0 ? colors.up : colors.down;
  const total = buy + sell;
  const buyRatio = total > 0 ? buy / total : 0.5;

  return (
    <View style={styles.flowRow}>
      <View style={styles.flowLabelRow}>
        <Text style={[styles.flowLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.netAmount, { color: netColor }]}>{formatMoney(net)}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${buyRatio * 100}%`, backgroundColor: buyColor }]} />
      </View>
      <View style={styles.flowAmounts}>
        <Text style={[styles.amountLabel, { color: buyColor }]}>B {formatMoney(buy)}</Text>
        <Text style={[styles.amountLabel, { color: sellColor }]}>S {formatMoney(sell)}</Text>
      </View>
    </View>
  );
}

export function HakaHakiCard({ data }: HakaHakiCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>FOREIGN / LOCAL ACTIVITY</Text>

      <FlowRow
        label="Foreign (Asing)"
        buy={data.foreignBuy}
        sell={data.foreignSell}
        net={data.foreignNet}
        buyColor={colors.up}
        sellColor={colors.down}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <FlowRow
        label="Local (Domestik)"
        buy={data.localBuy}
        sell={data.localSell}
        net={data.localNet}
        buyColor={colors.up}
        sellColor={colors.down}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Foreign Net
          </Text>
          <Text style={[
            styles.summaryValue,
            { color: data.foreignNet >= 0 ? colors.up : colors.down },
          ]}>
            {formatMoney(data.foreignNet)} IDR
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Local Net
          </Text>
          <Text style={[
            styles.summaryValue,
            { color: data.localNet >= 0 ? colors.up : colors.down },
          ]}>
            {formatMoney(data.localNet)} IDR
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: 14,
  },
  flowRow: {
    paddingVertical: 8,
  },
  flowLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  flowLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  netAmount: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  flowAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingTop: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
  },
});

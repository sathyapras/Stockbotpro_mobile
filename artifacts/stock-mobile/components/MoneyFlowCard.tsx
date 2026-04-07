import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { type BrokerFlow, formatMoney } from '@/services/stockData';

interface MoneyFlowCardProps {
  flow: BrokerFlow;
}

export function MoneyFlowCard({ flow }: MoneyFlowCardProps) {
  const colors = useColors();
  const netColor = flow.netBuy >= 0 ? colors.up : colors.down;
  const total = flow.totalBuy + flow.totalSell;
  const buyRatio = total > 0 ? flow.totalBuy / total : 0.5;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>BROKER MONEY FLOW</Text>

      <View style={styles.netRow}>
        <Text style={[styles.netLabel, { color: colors.mutedForeground }]}>Net Flow</Text>
        <Text style={[styles.netValue, { color: netColor }]}>
          {formatMoney(flow.netBuy)} IDR
        </Text>
      </View>

      <View style={[styles.flowBar, { backgroundColor: colors.border }]}>
        <View
          style={[styles.buyBar, { width: `${buyRatio * 100}%`, backgroundColor: colors.up }]}
        />
        <View
          style={[styles.sellBar, { width: `${(1 - buyRatio) * 100}%`, backgroundColor: colors.down }]}
        />
      </View>

      <View style={styles.flowLabels}>
        <Text style={[styles.flowLabel, { color: colors.up }]}>
          Buy {formatMoney(flow.totalBuy)}
        </Text>
        <Text style={[styles.flowLabel, { color: colors.down }]}>
          Sell {formatMoney(flow.totalSell)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.brokersRow}>
        <View style={styles.brokerCol}>
          <Text style={[styles.brokerColTitle, { color: colors.up }]}>Top Buyers</Text>
          {flow.topBuyers.map((b, i) => (
            <View key={i} style={styles.brokerItem}>
              <View style={[styles.brokerCodeBadge, { backgroundColor: colors.up + '22' }]}>
                <Text style={[styles.brokerCode, { color: colors.up }]}>{b.broker}</Text>
              </View>
              <Text style={[styles.brokerValue, { color: colors.foreground }]}>
                {formatMoney(b.value)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />

        <View style={styles.brokerCol}>
          <Text style={[styles.brokerColTitle, { color: colors.down }]}>Top Sellers</Text>
          {flow.topSellers.map((s, i) => (
            <View key={i} style={styles.brokerItem}>
              <View style={[styles.brokerCodeBadge, { backgroundColor: colors.down + '22' }]}>
                <Text style={[styles.brokerCode, { color: colors.down }]}>{s.broker}</Text>
              </View>
              <Text style={[styles.brokerValue, { color: colors.foreground }]}>
                {formatMoney(s.value)}
              </Text>
            </View>
          ))}
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
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  netLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  netValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  flowBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
  },
  buyBar: {
    height: 8,
  },
  sellBar: {
    height: 8,
  },
  flowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  flowLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  brokersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  brokerCol: {
    flex: 1,
  },
  brokerColTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  brokerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  brokerCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brokerCode: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  brokerValue: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  vertDivider: {
    width: StyleSheet.hairlineWidth,
  },
});

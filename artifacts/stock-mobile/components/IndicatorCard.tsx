import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { type Indicators, formatPrice } from '@/services/stockData';

interface IndicatorCardProps {
  indicators: Indicators;
  currentPrice: number;
}

function IndicatorRow({ label, value, color, subtext }: {
  label: string;
  value: string;
  color?: string;
  subtext?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.indRow}>
      <Text style={[styles.indLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.indValueGroup}>
        <Text style={[styles.indValue, { color: color ?? colors.foreground }]}>{value}</Text>
        {subtext && <Text style={[styles.indSub, { color: colors.mutedForeground }]}>{subtext}</Text>}
      </View>
    </View>
  );
}

export function IndicatorCard({ indicators, currentPrice }: IndicatorCardProps) {
  const colors = useColors();

  const rsiColor =
    indicators.rsi < 30 ? colors.up :
    indicators.rsi > 70 ? colors.down :
    indicators.rsi < 45 ? colors.up + 'CC' :
    colors.foreground;

  const macdColor = indicators.macdHist >= 0 ? colors.up : colors.down;

  const rsiWidth = `${indicators.rsi}%` as `${number}%`;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>TECHNICAL INDICATORS</Text>

      <View style={styles.rsiBlock}>
        <View style={styles.rsiHeader}>
          <Text style={[styles.indLabel, { color: colors.mutedForeground }]}>RSI (14)</Text>
          <Text style={[styles.rsiValue, { color: rsiColor }]}>{indicators.rsi.toFixed(1)}</Text>
        </View>
        <View style={[styles.rsiTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.rsiOversold, { backgroundColor: colors.up + '44' }]} />
          <View style={[styles.rsiOverbought, { backgroundColor: colors.down + '44' }]} />
          <View
            style={[
              styles.rsiThumb,
              { left: rsiWidth, backgroundColor: rsiColor },
            ]}
          />
        </View>
        <View style={styles.rsiLabels}>
          <Text style={[styles.rsiLabelText, { color: colors.mutedForeground }]}>Oversold 30</Text>
          <Text style={[styles.rsiLabelText, { color: colors.mutedForeground }]}>Overbought 70</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <IndicatorRow
        label="MACD"
        value={indicators.macd.toFixed(2)}
        color={macdColor}
        subtext={`Signal: ${indicators.macdSignal.toFixed(2)}  Hist: ${indicators.macdHist >= 0 ? '+' : ''}${indicators.macdHist.toFixed(2)}`}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.smaGrid}>
        <View style={styles.smaItem}>
          <Text style={[styles.indLabel, { color: colors.mutedForeground }]}>SMA 20</Text>
          <Text style={[styles.smaValue, { color: currentPrice > indicators.sma20 ? colors.up : colors.down }]}>
            {formatPrice(indicators.sma20)}
          </Text>
          <Text style={[styles.smaSub, { color: currentPrice > indicators.sma20 ? colors.up : colors.down }]}>
            {currentPrice > indicators.sma20 ? 'Above' : 'Below'}
          </Text>
        </View>
        <View style={styles.smaItem}>
          <Text style={[styles.indLabel, { color: colors.mutedForeground }]}>SMA 50</Text>
          <Text style={[styles.smaValue, { color: currentPrice > indicators.sma50 ? colors.up : colors.down }]}>
            {formatPrice(indicators.sma50)}
          </Text>
          <Text style={[styles.smaSub, { color: currentPrice > indicators.sma50 ? colors.up : colors.down }]}>
            {currentPrice > indicators.sma50 ? 'Above' : 'Below'}
          </Text>
        </View>
        <View style={styles.smaItem}>
          <Text style={[styles.indLabel, { color: colors.mutedForeground }]}>SMA 200</Text>
          <Text style={[styles.smaValue, { color: currentPrice > indicators.sma200 ? colors.up : colors.down }]}>
            {formatPrice(indicators.sma200)}
          </Text>
          <Text style={[styles.smaSub, { color: currentPrice > indicators.sma200 ? colors.up : colors.down }]}>
            {currentPrice > indicators.sma200 ? 'Above' : 'Below'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <IndicatorRow
        label="Bollinger Bands"
        value={`${formatPrice(indicators.bollingerLower)} – ${formatPrice(indicators.bollingerUpper)}`}
        color={colors.foreground}
      />
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
  rsiBlock: {
    marginBottom: 12,
  },
  rsiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rsiValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  rsiTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  rsiOversold: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '30%',
    height: 6,
    borderRadius: 3,
  },
  rsiOverbought: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '30%',
    height: 6,
    borderRadius: 3,
  },
  rsiThumb: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  rsiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rsiLabelText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  indRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  indLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  indValueGroup: {
    alignItems: 'flex-end',
  },
  indValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  indSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  smaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  smaItem: {
    alignItems: 'center',
    flex: 1,
  },
  smaValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  smaSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});

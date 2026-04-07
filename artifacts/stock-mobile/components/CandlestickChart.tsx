import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { type OHLCVBar } from '@/services/stockData';

interface CandlestickChartProps {
  data: OHLCVBar[];
}

const CANDLE_WIDTH = 7;
const CANDLE_GAP = 3;
const CHART_HEIGHT = 200;
const VOLUME_HEIGHT = 50;
const TOTAL_HEIGHT = CHART_HEIGHT + VOLUME_HEIGHT + 10;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 4;
const Y_LABEL_WIDTH = 52;

export function CandlestickChart({ data }: CandlestickChartProps) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.mutedForeground }}>No data available</Text>
      </View>
    );
  }

  const prices = data.flatMap(d => [d.high, d.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...data.map(d => d.volume));

  const totalWidth = data.length * (CANDLE_WIDTH + CANDLE_GAP);
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const toY = (price: number) =>
    PADDING_TOP + ((maxPrice - price) / priceRange) * chartH;

  const toVolumeH = (volume: number) =>
    (volume / maxVolume) * VOLUME_HEIGHT;

  const priceLabels = [
    maxPrice,
    minPrice + (priceRange * 0.75),
    minPrice + (priceRange * 0.5),
    minPrice + (priceRange * 0.25),
    minPrice,
  ];

  const dateStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <View style={styles.wrapper}>
      <View style={styles.yAxisContainer}>
        <View style={{ width: Y_LABEL_WIDTH, height: CHART_HEIGHT }}>
          {priceLabels.map((price, i) => (
            <Text
              key={i}
              style={[
                styles.yLabel,
                { color: colors.mutedForeground, top: toY(price) - 7 },
              ]}
            >
              {price >= 1000 ? Math.round(price).toLocaleString('id-ID') : price.toFixed(0)}
            </Text>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <Svg width={totalWidth} height={TOTAL_HEIGHT}>
          {data.map((bar, i) => {
            const isUp = bar.close >= bar.open;
            const upColor = colors.up;
            const downColor = colors.down;
            const color = isUp ? upColor : downColor;
            const x = i * (CANDLE_WIDTH + CANDLE_GAP) + CANDLE_WIDTH / 2;

            const bodyTop = toY(Math.max(bar.open, bar.close));
            const bodyBottom = toY(Math.min(bar.open, bar.close));
            const bodyHeight = Math.max(bodyBottom - bodyTop, 1.5);

            const volH = toVolumeH(bar.volume);

            return (
              <G key={i}>
                <Line
                  x1={x}
                  y1={toY(bar.high)}
                  x2={x}
                  y2={toY(bar.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                <Rect
                  x={i * (CANDLE_WIDTH + CANDLE_GAP)}
                  y={bodyTop}
                  width={CANDLE_WIDTH}
                  height={bodyHeight}
                  fill={isUp ? color : 'transparent'}
                  stroke={color}
                  strokeWidth={1}
                />
                <Rect
                  x={i * (CANDLE_WIDTH + CANDLE_GAP)}
                  y={CHART_HEIGHT + 6 + VOLUME_HEIGHT - volH}
                  width={CANDLE_WIDTH}
                  height={volH}
                  fill={color}
                  opacity={0.5}
                />
                {i % dateStep === 0 && (
                  <SvgText
                    x={x}
                    y={CHART_HEIGHT + 4}
                    fontSize={9}
                    fill={colors.mutedForeground}
                    textAnchor="middle"
                  >
                    {bar.date.slice(5)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  yAxisContainer: {
    justifyContent: 'flex-start',
  },
  yLabel: {
    position: 'absolute',
    fontSize: 9,
    textAlign: 'right',
    width: 48,
    fontFamily: 'Inter_400Regular',
  },
  empty: {
    height: TOTAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

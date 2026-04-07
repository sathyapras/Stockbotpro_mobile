import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface SignalBadgeProps {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  size?: 'sm' | 'md';
}

export function SignalBadge({ signal, size = 'md' }: SignalBadgeProps) {
  const colors = useColors();

  const config = {
    BUY: { bg: colors.up + '22', text: colors.up, label: 'BUY' },
    SELL: { bg: colors.down + '22', text: colors.down, label: 'SELL' },
    NEUTRAL: { bg: colors.neutral + '22', text: colors.neutral, label: 'NEUTRAL' },
  };

  const c = config[signal];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, isSmall && styles.sm]}>
      <Text style={[styles.text, { color: c.text }, isSmall && styles.textSm]}>
        {c.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
});

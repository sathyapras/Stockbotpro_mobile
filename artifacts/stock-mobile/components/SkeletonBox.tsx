import React, { useEffect, useRef } from "react";
import { Animated, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: Props) {
  const colors   = useColors();
  const shimmer  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View style={[{
      width: width as any, height, borderRadius,
      backgroundColor: colors.muted,
      opacity,
    }, style]} />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const colors = useColors();
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 14, padding: 16,
      marginHorizontal: 16, marginBottom: 10,
      gap: 10,
    }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="60%" height={14} />
          <SkeletonBox width="40%" height={11} />
        </View>
        <SkeletonBox width={60} height={24} borderRadius={10} />
      </View>
      <SkeletonBox height={10} borderRadius={5} />
      <SkeletonBox width="80%" height={10} borderRadius={5} />
    </View>
  );
}

export function SkeletonListScreen({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

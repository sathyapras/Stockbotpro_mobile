import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { fetchMe, getAuthToken, clearAuthToken } from "@/services/userService";

export default function SplashScreen() {
  const router  = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0, duration: 700, useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(checkAndNavigate, 1600);
    return () => clearTimeout(timer);
  }, []);

  async function checkAndNavigate() {
    try {
      const token = await getAuthToken();
      if (token) {
        try {
          await fetchMe();
        } catch (e: any) {
          if (e?.message === "UNAUTHORIZED") {
            await clearAuthToken();
          }
        }
      }
    } catch {}
    router.replace("/(tabs)");
  }

  return (
    <View style={{
      flex: 1, backgroundColor: "#0a0f1e",
      alignItems: "center", justifyContent: "center",
    }}>
      <Animated.View style={{ opacity, transform: [{ translateY: slideY }],
        alignItems: "center" }}>

        {/* Icon glow */}
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: "#0ea5e915",
          alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          shadowColor: "#0ea5e9", shadowOpacity: 0.4,
          shadowRadius: 20, elevation: 8,
        }}>
          <Text style={{ fontSize: 42 }}>📈</Text>
        </View>

        {/* Logo text */}
        <Text style={{
          color: "#fff", fontWeight: "900",
          fontSize: 42, letterSpacing: -1.5,
        }}>
          StockBot
        </Text>
        <Text style={{
          color: "#0ea5e9", fontWeight: "900",
          fontSize: 42, letterSpacing: -1.5, marginTop: -6,
        }}>
          PRO
        </Text>

        {/* Tagline */}
        <Text style={{
          color: "#475569", fontSize: 12,
          letterSpacing: 1.8, marginTop: 14,
          textTransform: "uppercase",
        }}>
          Analisa Saham IDX Terpercaya
        </Text>

        {/* Animated dots */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 48 }}>
          {[0, 1, 2].map(i => (
            <PulseDot key={i} delay={i * 200} />
          ))}
        </View>
      </Animated.View>

      <Text style={{
        position: "absolute", bottom: 32,
        color: "#1e293b", fontSize: 11,
      }}>
        Stock Insight Mobile · IDX Market
      </Text>
    </View>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacityV = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,    { toValue: 1,   duration: 500, useNativeDriver: true }),
          Animated.timing(opacityV, { toValue: 1,   duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,    { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(opacityV, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: "#0ea5e9",
      transform: [{ scale }], opacity: opacityV,
    }} />
  );
}

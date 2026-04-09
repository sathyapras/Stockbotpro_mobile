import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Text, View } from "react-native";

import { fetchMe, getAuthToken, clearAuthToken } from "@/services/userService";
import { playStartupSound } from "@/services/soundService";

export default function SplashScreen() {
  const router  = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(24)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Play startup sound
    playStartupSound();

    // Fade-in + slide animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0, duration: 700, useNativeDriver: true,
      }),
    ]).start();

    // Ring pulse animation after 400ms
    const ringTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.8, duration: 900, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 0.6, duration: 0,   useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.5, duration: 0,   useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 400);

    const navTimer = setTimeout(checkAndNavigate, 2200);
    return () => {
      clearTimeout(ringTimer);
      clearTimeout(navTimer);
    };
  }, []);

  async function checkAndNavigate() {
    try {
      const token = await getAuthToken();
      if (token) {
        try { await fetchMe(); } catch (e: any) {
          if (e?.message === "UNAUTHORIZED") await clearAuthToken();
        }
      }
    } catch {}
    router.replace("/(tabs)");
  }

  return (
    <View style={{
      flex: 1, backgroundColor: "#070c1a",
      alignItems: "center", justifyContent: "center",
    }}>
      <Animated.View style={{ opacity, transform: [{ translateY: slideY }],
        alignItems: "center" }}>

        {/* Icon with pulse ring */}
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          {/* Outer pulse ring */}
          <Animated.View style={{
            position: "absolute",
            width: 100, height: 100, borderRadius: 50,
            borderWidth: 2, borderColor: "#0ea5e9",
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }} />
          {/* Icon container */}
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: "#0ea5e915",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#0ea5e930",
            shadowColor: "#0ea5e9", shadowOpacity: 0.5,
            shadowRadius: 24, elevation: 10,
          }}>
            <Text style={{ fontSize: 40 }}>🤖</Text>
          </View>
        </View>

        {/* Logo text */}
        <Text style={{
          color: "#fff", fontWeight: "900",
          fontSize: 40, letterSpacing: -1.5,
        }}>
          StockBot
        </Text>
        <Text style={{
          color: "#0ea5e9", fontWeight: "900",
          fontSize: 40, letterSpacing: -1.5, marginTop: -6,
        }}>
          PRO
        </Text>

        {/* AI status bar */}
        <View style={{
          marginTop: 18, flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: "#0ea5e910", paddingHorizontal: 14, paddingVertical: 7,
          borderRadius: 20, borderWidth: 1, borderColor: "#0ea5e920",
        }}>
          <StatusBlip />
          <Text style={{ color: "#0ea5e9", fontSize: 11, letterSpacing: 1, fontWeight: "600" }}>
            AI INITIALIZING
          </Text>
        </View>

        {/* Animated dots */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 40 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <PulseDot key={i} delay={i * 150} />
          ))}
        </View>
      </Animated.View>

      {/* Scan line effect */}
      <ScanLine opacity={opacity} />

      <Text style={{
        position: "absolute", bottom: 32,
        color: "#1e293b", fontSize: 11, letterSpacing: 0.5,
      }}>
        Stock Insight Mobile · IDX Market
      </Text>
    </View>
  );
}

function StatusBlip() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: "#34d399",
      transform: [{ scale }],
    }} />
  );
}

function PulseDot({ delay }: { delay: number }) {
  const scale    = useRef(new Animated.Value(0.5)).current;
  const opacityV = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,    { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(opacityV, { toValue: 1,   duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,    { toValue: 0.5, duration: 400, useNativeDriver: true }),
          Animated.timing(opacityV, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 3.5,
      backgroundColor: "#0ea5e9",
      transform: [{ scale }], opacity: opacityV,
    }} />
  );
}

function ScanLine({ opacity }: { opacity: Animated.Value }) {
  const pos = useRef(new Animated.Value(-600)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pos, { toValue: 800, duration: 1800, useNativeDriver: true }),
        Animated.timing(pos, { toValue: -600, duration: 0,   useNativeDriver: true }),
        Animated.delay(400),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      position: "absolute",
      left: 0, right: 0, height: 1.5,
      backgroundColor: "#0ea5e9",
      opacity: Animated.multiply(opacity, new Animated.Value(0.15)),
      transform: [{ translateY: pos }],
      pointerEvents: "none",
    } as any} />
  );
}

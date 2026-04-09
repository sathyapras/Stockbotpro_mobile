import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, Text, View } from "react-native";
import Svg, {
  AnimateMotion,
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { playStartupSound } from "@/services/soundService";
import { clearAuthToken, fetchMe, getAuthToken } from "@/services/userService";

const { width: SW } = Dimensions.get("window");
const SVG_W = Math.min(SW - 32, 300);
const SVG_H = Math.round(SVG_W * (320 / 300));

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect   = Animated.createAnimatedComponent(Rect);
const AnimatedG      = Animated.createAnimatedComponent(G);

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase]           = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  const progress        = useRef(new Animated.Value(0)).current;
  const fadeOut         = useRef(new Animated.Value(0)).current;

  // Path draw (start hidden = full dash length, animate to 0)
  const dash1 = useRef(new Animated.Value(120)).current;
  const dash2 = useRef(new Animated.Value(120)).current;
  const dash3 = useRef(new Animated.Value(95)).current;
  // Secondary mesh
  const mesh1 = useRef(new Animated.Value(190)).current;
  const mesh2 = useRef(new Animated.Value(220)).current;
  const mesh3 = useRef(new Animated.Value(220)).current;

  // Brain
  const orbitRot        = useRef(new Animated.Value(0)).current;
  const brainR          = useRef(new Animated.Value(1.5)).current;
  const brainOp         = useRef(new Animated.Value(0.9)).current;

  // Robot float (idle up-down)
  const floatBD  = useRef(new Animated.Value(0)).current;
  const floatSP  = useRef(new Animated.Value(0)).current;
  const floatHFT = useRef(new Animated.Value(0)).current;

  // Eye opacities
  const eyeBDL  = useRef(new Animated.Value(0.2)).current;
  const eyeBDR  = useRef(new Animated.Value(0.2)).current;
  const eyeSP   = useRef(new Animated.Value(0.1)).current;
  const eyeHFTL = useRef(new Animated.Value(0.8)).current;
  const eyeHFTR = useRef(new Animated.Value(0.8)).current;

  // Antenna / signal pulse
  const antBD = useRef(new Animated.Value(0.2)).current;
  const antSP = useRef(new Animated.Value(0.1)).current;

  // Status lights
  const stBD  = useRef(new Animated.Value(0.3)).current;
  const stHFT = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    playStartupSound();

    // Progress listener
    const listenerId = progress.addListener(({ value }) =>
      setProgressPct(Math.round(value))
    );

    // Progress 0→100 in 2800ms
    Animated.timing(progress, {
      toValue: 100, duration: 2800,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();

    // Brain orbit spin (continuous)
    Animated.loop(
      Animated.timing(orbitRot, {
        toValue: 360, duration: 8000,
        easing: Easing.linear, useNativeDriver: false,
      })
    ).start();

    // Brain core pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(brainR,  { toValue: 2.5, duration: 1000, useNativeDriver: false }),
          Animated.timing(brainOp, { toValue: 0.4, duration: 1000, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(brainR,  { toValue: 1.5, duration: 1000, useNativeDriver: false }),
          Animated.timing(brainOp, { toValue: 0.9, duration: 1000, useNativeDriver: false }),
        ]),
      ])
    ).start();

    // Idle float loops
    const makeFloat = (val: Animated.Value, dur: number, del = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(del),
          Animated.timing(val, { toValue: -1.5, duration: dur, useNativeDriver: false }),
          Animated.timing(val, { toValue: 0,    duration: dur, useNativeDriver: false }),
        ])
      );
    makeFloat(floatBD,  1500, 0).start();
    makeFloat(floatSP,  1750, 300).start();
    makeFloat(floatHFT, 1400, 700).start();

    // ── Phase 1 @ 800ms ──────────────────────────────────────────
    const t1 = setTimeout(() => {
      setPhase(1);

      // Draw main paths
      Animated.timing(dash1, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(dash2, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(dash3, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();

      // Eye BD left
      Animated.loop(
        Animated.sequence([
          Animated.timing(eyeBDL, { toValue: 1,   duration: 900, useNativeDriver: false }),
          Animated.timing(eyeBDL, { toValue: 0.2, duration: 900, useNativeDriver: false }),
        ])
      ).start();
      // Eye BD right (offset)
      Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(eyeBDR, { toValue: 1,   duration: 900, useNativeDriver: false }),
          Animated.timing(eyeBDR, { toValue: 0.2, duration: 900, useNativeDriver: false }),
        ])
      ).start();
      // Eye SP
      Animated.loop(
        Animated.sequence([
          Animated.timing(eyeSP, { toValue: 0.7, duration: 750, useNativeDriver: false }),
          Animated.timing(eyeSP, { toValue: 0.1, duration: 750, useNativeDriver: false }),
        ])
      ).start();
      // Eyes HFT fast blink
      Animated.loop(
        Animated.sequence([
          Animated.timing(eyeHFTL, { toValue: 0,   duration: 200, useNativeDriver: false }),
          Animated.timing(eyeHFTL, { toValue: 0.8, duration: 200, useNativeDriver: false }),
          Animated.delay(400),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(eyeHFTR, { toValue: 0,   duration: 200, useNativeDriver: false }),
          Animated.timing(eyeHFTR, { toValue: 0.8, duration: 200, useNativeDriver: false }),
          Animated.delay(400),
        ])
      ).start();
      // Antennas
      Animated.loop(
        Animated.sequence([
          Animated.timing(antBD, { toValue: 0.9, duration: 500, useNativeDriver: false }),
          Animated.timing(antBD, { toValue: 0.2, duration: 500, useNativeDriver: false }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(antSP, { toValue: 0.9, duration: 600, useNativeDriver: false }),
          Animated.timing(antSP, { toValue: 0.1, duration: 600, useNativeDriver: false }),
        ])
      ).start();
      // Status lights
      Animated.loop(
        Animated.sequence([
          Animated.timing(stBD,  { toValue: 1,   duration: 1250, useNativeDriver: false }),
          Animated.timing(stBD,  { toValue: 0.3, duration: 1250, useNativeDriver: false }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(stHFT, { toValue: 1,   duration: 1000, useNativeDriver: false }),
          Animated.timing(stHFT, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
        ])
      ).start();
    }, 800);

    // ── Phase 2 @ 1600ms — secondary mesh ────────────────────────
    const t2 = setTimeout(() => {
      setPhase(2);
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(mesh1, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(mesh2, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]).start();
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(mesh3, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]).start();
    }, 1600);

    // ── Phase 3 @ 2400ms ─────────────────────────────────────────
    const t3 = setTimeout(() => setPhase(3), 2400);

    // Fade-out @ 2800ms
    const tFade = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
    }, 2800);

    // Navigate @ 3300ms
    const tNav = setTimeout(checkAndNavigate, 3300);

    return () => {
      progress.removeListener(listenerId);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(tFade); clearTimeout(tNav);
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

  const progressWidth = progress.interpolate({
    inputRange: [0, 100], outputRange: ["0%", "100%"],
  });

  const statusLabel =
    phase >= 3 ? "Neural-Chain Ready" :
    phase >= 2 ? "Calibrating Signals..." :
    phase >= 1 ? "Data Flowing..." :
                 "Verifying Signal Neural-Chain...";

  return (
    <View style={{ flex: 1, backgroundColor: "#020912",
      alignItems: "center", justifyContent: "center" }}>

      {/* Radial glow behind SVG */}
      <View style={{
        position: "absolute", width: SVG_W * 1.6, height: SVG_W * 0.8,
        borderRadius: SVG_W * 0.4, backgroundColor: "rgba(0,180,255,0.055)",
        alignSelf: "center", top: "15%",
      }} />

      {/* ── SVG Canvas ── */}
      <Svg width={SVG_W} height={SVG_H} viewBox="0 0 300 320">
        <Defs>
          <SvgGradient id="pg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor="#00d4ff" stopOpacity={0.9} />
            <Stop offset="50%"  stopColor="#00d4ff" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#00d4ff" stopOpacity={0.9} />
          </SvgGradient>
        </Defs>

        {/* ── Secondary mesh (phase ≥ 2) ── */}
        {phase >= 2 && (
          <>
            <AnimatedPath d="M 58 68 C 100 68, 200 68, 242 68"
              stroke="#00d4ff" strokeWidth={0.4} opacity={0.2} fill="none"
              strokeDasharray={190} strokeDashoffset={mesh1 as any} />
            <AnimatedPath d="M 58 68 C 100 180, 130 240, 150 252"
              stroke="#00d4ff" strokeWidth={0.35} opacity={0.15} fill="none"
              strokeDasharray={220} strokeDashoffset={mesh2 as any} />
            <AnimatedPath d="M 242 68 C 200 180, 170 240, 150 252"
              stroke="#00d4ff" strokeWidth={0.35} opacity={0.15} fill="none"
              strokeDasharray={220} strokeDashoffset={mesh3 as any} />
          </>
        )}

        {/* ── Main paths (brain → robots) ── */}
        <AnimatedPath d="M 150 150 C 120 120, 90 95, 58 68"
          stroke="url(#pg1)" strokeWidth={1.2} fill="none" opacity={0.7}
          strokeDasharray={120} strokeDashoffset={dash1 as any} />
        <AnimatedPath d="M 150 150 C 180 120, 210 95, 242 68"
          stroke="url(#pg1)" strokeWidth={1.2} fill="none" opacity={0.7}
          strokeDasharray={120} strokeDashoffset={dash2 as any} />
        <AnimatedPath d="M 150 160 C 150 195, 150 215, 150 252"
          stroke="url(#pg1)" strokeWidth={1.2} fill="none" opacity={0.7}
          strokeDasharray={95} strokeDashoffset={dash3 as any} />

        {/* ── Data packets (phase ≥ 1) ── */}
        {phase >= 1 && (
          <>
            <Circle r={2} fill="#00d4ff" opacity={0.85}>
              <AnimateMotion path="M 150 150 C 120 120, 90 95, 58 68"
                dur="2.2s" repeatCount="indefinite" />
            </Circle>
            <Circle r={2} fill="#00d4ff" opacity={0.85}>
              <AnimateMotion path="M 150 150 C 180 120, 210 95, 242 68"
                dur="2.4s" begin="0.5s" repeatCount="indefinite" />
            </Circle>
            <Circle r={2} fill="#00d4ff" opacity={0.85}>
              <AnimateMotion path="M 150 160 C 150 195, 150 215, 150 252"
                dur="1.8s" begin="0.3s" repeatCount="indefinite" />
            </Circle>
            <Circle r={2} fill="#00ffaa" opacity={0.85}>
              <AnimateMotion path="M 58 68 C 90 95, 120 120, 150 150"
                dur="3.0s" begin="1.1s" repeatCount="indefinite" />
            </Circle>
            <Circle r={2} fill="#00ffaa" opacity={0.85}>
              <AnimateMotion path="M 242 68 C 210 95, 180 120, 150 150"
                dur="3.2s" begin="1.6s" repeatCount="indefinite" />
            </Circle>
          </>
        )}

        {/* ── Mini Candlesticks (phase ≥ 2) ── */}
        {phase >= 2 && (
          <>
            {/* Left path area (~100, 105) */}
            <Line x1={97}  y1={109} x2={97}  y2={101} stroke="#ef4444" strokeWidth={0.6} opacity={0.85} />
            <Rect x={95.5} y={102} width={3} height={6} fill="#ef4444" opacity={0.85} />
            <Line x1={102} y1={107} x2={102} y2={101} stroke="#22c55e" strokeWidth={0.6} opacity={0.85} />
            <Rect x={100.5} y={103} width={3} height={3} fill="#22c55e" opacity={0.85} />
            <Line x1={107} y1={106} x2={107} y2={99}  stroke="#ef4444" strokeWidth={0.6} opacity={0.85} />
            <Rect x={105.5} y={100} width={3} height={5} fill="#ef4444" opacity={0.85} />
            {/* Right path area (~200, 105) */}
            <Line x1={197} y1={109} x2={197} y2={103} stroke="#ef4444" strokeWidth={0.6} opacity={0.85} />
            <Rect x={195.5} y={104} width={3} height={4} fill="#ef4444" opacity={0.85} />
            <Line x1={202} y1={108} x2={202} y2={102} stroke="#22c55e" strokeWidth={0.6} opacity={0.85} />
            <Rect x={200.5} y={103} width={3} height={4} fill="#22c55e" opacity={0.85} />
            <Line x1={207} y1={108} x2={207} y2={104} stroke="#ef4444" strokeWidth={0.6} opacity={0.85} />
            <Rect x={205.5} y={105} width={3} height={2} fill="#ef4444" opacity={0.85} />
          </>
        )}

        {/* ── BRAIN (150, 150) ── */}
        <G x={150} y={150}>
          {/* Orbit ring (static dashed, visually spins via AnimatedG below) */}
          <AnimatedG rotation={orbitRot as any} originX={0} originY={0}>
            <Circle r={30} fill="none" stroke="#00d4ff"
              strokeWidth={0.5} opacity={0.3} strokeDasharray="6 4" />
          </AnimatedG>
          {/* Hemispheres */}
          <Path d="M-2,-14 C-18,-14 -26,-6 -25,2 C-26,8 -22,14 -14,16 C-8,18 -4,16 -2,14 Z"
            fill="#001a2a" stroke="#00d4ff" strokeWidth={1.4} />
          <Path d="M2,-14 C18,-14 26,-6 25,2 C26,8 22,14 14,16 C8,18 4,16 2,14 Z"
            fill="#001a2a" stroke="#00d4ff" strokeWidth={1.4} />
          <Line x1={0} y1={-14} x2={0} y2={14} stroke="#00d4ff" strokeWidth={0.6} opacity={0.4} />
          {/* Brain folds */}
          <Path d="M-20,0 C-16,-4 -12,4 -8,0"  fill="none" stroke="#00d4ff" strokeWidth={0.8} opacity={0.6} />
          <Path d="M-18,8 C-14,4 -10,10 -6,6"  fill="none" stroke="#00d4ff" strokeWidth={0.8} opacity={0.5} />
          <Path d="M20,0 C16,-4 12,4 8,0"       fill="none" stroke="#00d4ff" strokeWidth={0.8} opacity={0.6} />
          <Path d="M18,8 C14,4 10,10 6,6"       fill="none" stroke="#00d4ff" strokeWidth={0.8} opacity={0.5} />
          {/* Core pulse */}
          <Circle cx={0} cy={1} r={3.5} fill="#00d4ff" opacity={0.4} />
          <AnimatedCircle cx={0} cy={1} r={brainR as any} fill="#00ffff" opacity={brainOp as any} />
        </G>

        {/* ── ROBOT BD (58, 68) ── */}
        <AnimatedG x={58} y={floatBD.interpolate({ inputRange: [-1.5, 0], outputRange: [66.5, 68] }) as any}>
          <Rect x={-12} y={-18} width={24} height={18} rx={4}
            fill="#040f1a" stroke="#00d4ff" strokeWidth={1.2}
            opacity={phase >= 1 ? 1 : 0.3} />
          <Ellipse cx={-5} cy={-10} rx={3.5} ry={3.5} fill="#000f1a" stroke="#00d4ff" strokeWidth={0.8} />
          <AnimatedCircle cx={-5} cy={-10} r={1.5} fill="#00d4ff" opacity={eyeBDL as any} />
          {phase >= 1 && (
            <Line x1={-9} y1={-10} x2={9} y2={-10} stroke="#00ffff" strokeWidth={0.6} opacity={0.5} />
          )}
          <Ellipse cx={5} cy={-10} rx={3.5} ry={3.5} fill="#000f1a" stroke="#00d4ff" strokeWidth={0.8} />
          <AnimatedCircle cx={5} cy={-10} r={1.5} fill="#00d4ff" opacity={eyeBDR as any} />
          <Line x1={0} y1={-18} x2={0} y2={-24} stroke="#00d4ff" strokeWidth={0.8} opacity={0.7} />
          <AnimatedCircle cx={0} cy={-25.5} r={1.5} fill="#00ffff" opacity={antBD as any} />
          <Rect x={-10} y={1} width={20} height={12} rx={2}
            fill="#040f1a" stroke="#00d4ff" strokeWidth={0.8}
            opacity={phase >= 1 ? 0.9 : 0.3} />
          <AnimatedCircle cx={7} cy={7} r={2}
            fill={phase >= 1 ? "#22c55e" : "#334155"} opacity={stBD as any} />
          <SvgText x={0} y={22} textAnchor="middle" fontSize={4.5}
            fill="#00d4ff" opacity={0.4} fontFamily="monospace">BD</SvgText>
        </AnimatedG>

        {/* ── ROBOT SP (242, 68) ── */}
        <AnimatedG x={242} y={floatSP.interpolate({ inputRange: [-1.5, 0], outputRange: [66.5, 68] }) as any}>
          <Polygon points="0,-22 12,-14 12,2 0,10 -12,2 -12,-14"
            fill="#040f1a" stroke="#00d4ff" strokeWidth={1.2}
            opacity={phase >= 1 ? 1 : 0.3} />
          <Line x1={0} y1={-22} x2={0} y2={-28} stroke="#00d4ff" strokeWidth={0.8} opacity={0.7} />
          <Path d="M -3.5,-22 Q 0,-24.5 3.5,-22"   fill="none" stroke="#00d4ff" strokeWidth={0.7} opacity={antSP as any} />
          <Path d="M -7,-22 Q 0,-27 7,-22"           fill="none" stroke="#00d4ff" strokeWidth={0.7} opacity={antSP as any} />
          <Path d="M -10.5,-22 Q 0,-29.5 10.5,-22"  fill="none" stroke="#00d4ff" strokeWidth={0.7} opacity={antSP as any} />
          <Circle cx={0} cy={-7} r={5} fill="#000f1a" stroke="#00d4ff" strokeWidth={0.8} />
          <AnimatedCircle cx={0} cy={-7} r={2.5} fill="#00d4ff" opacity={eyeSP as any} />
          <Circle cx={0} cy={-7} r={1} fill="white" opacity={phase >= 1 ? 0.9 : 0.1} />
          <Rect x={-8} y={11} width={16} height={10} rx={2}
            fill="#040f1a" stroke="#00d4ff" strokeWidth={0.8} />
          <Circle cx={6} cy={16} r={2} fill={phase >= 1 ? "#3b82f6" : "#334155"} />
          <SvgText x={0} y={30} textAnchor="middle" fontSize={4.5}
            fill="#00d4ff" opacity={0.4} fontFamily="monospace">SP</SvgText>
        </AnimatedG>

        {/* ── ROBOT HFT (150, 264) ── */}
        <AnimatedG x={150} y={floatHFT.interpolate({ inputRange: [-1.5, 0], outputRange: [262.5, 264] }) as any}>
          <Rect x={-14} y={-16} width={28} height={22} rx={6}
            fill="#040f1a" stroke="#00d4ff" strokeWidth={1.2} />
          <Line x1={-10} y1={-8} x2={10} y2={-8} stroke="#00d4ff" strokeWidth={0.5} opacity={0.5} />
          <Line x1={-10} y1={-4} x2={10} y2={-4} stroke="#00d4ff" strokeWidth={0.5} opacity={0.4} />
          <Line x1={-10} y1={0}  x2={10} y2={0}  stroke="#00d4ff" strokeWidth={0.5} opacity={0.3} />
          <AnimatedRect x={-10} y={-13} width={7} height={4} rx={1} fill="#00d4ff" opacity={eyeHFTL as any} />
          <AnimatedRect x={3}   y={-13} width={7} height={4} rx={1} fill="#00d4ff" opacity={eyeHFTR as any} />
          <Rect x={-12} y={7} width={24} height={11} rx={2}
            fill="#040f1a" stroke="#00d4ff" strokeWidth={0.8} />
          <AnimatedCircle cx={-6} cy={10} r={1.8} fill="#22c55e" opacity={stHFT as any} />
          <AnimatedCircle cx={-2} cy={10} r={1.8} fill="#3b82f6" opacity={stHFT as any} />
          <AnimatedCircle cx={2}  cy={10} r={1.8} fill="#eab308" opacity={stHFT as any} />
          <AnimatedCircle cx={6}  cy={10} r={1.8} fill="#22c55e" opacity={stHFT as any} />
          <SvgText x={0} y={27} textAnchor="middle" fontSize={4.5}
            fill="#00d4ff" opacity={0.4} fontFamily="monospace">HFT</SvgText>
        </AnimatedG>
      </Svg>

      {/* ── Bottom: Logo + Progress ── */}
      <View style={{ width: SVG_W, marginTop: 12, alignItems: "center", gap: 8 }}>
        {/* Logo + PRO badge */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={require("../assets/images/logo-stockbot.png")}
            style={{ height: 30, width: 110 }}
            resizeMode="contain"
          />
          <View style={{
            backgroundColor: "rgba(0,212,255,0.12)",
            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
            borderWidth: 1, borderColor: "rgba(245,166,0,0.35)",
          }}>
            <Text style={{
              color: "hsl(45,100%,65%)", fontSize: 10, fontWeight: "700", letterSpacing: 2,
            }}>PRO</Text>
          </View>
        </View>

        {/* Tagline */}
        <Text style={{
          color: "#00d4ff", fontSize: 9, fontFamily: "monospace",
          letterSpacing: 1.2, textTransform: "uppercase",
          opacity: 0.7, textAlign: "center",
        }}>
          Trace the Flow. See the Unseen. Master the Market
        </Text>

        {/* Progress bar */}
        <View style={{ width: "100%", gap: 4 }}>
          <View style={{
            height: 6, borderRadius: 3, overflow: "hidden",
            backgroundColor: "rgba(0,180,255,0.1)",
            borderWidth: 1, borderColor: "rgba(0,180,255,0.15)",
          }}>
            <Animated.View style={{ height: "100%", width: progressWidth }}>
              <LinearGradient
                colors={["#0066aa", "#00b4d8", "#00ffff", "#00d4ff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "rgba(0,180,255,0.6)", fontSize: 9, fontFamily: "monospace" }}>
              {statusLabel}
            </Text>
            <Text style={{ color: "rgba(0,212,255,0.8)", fontSize: 9, fontFamily: "monospace" }}>
              {progressPct}%
            </Text>
          </View>
        </View>
      </View>

      {/* Fade-out overlay */}
      <Animated.View style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#020912",
        opacity: fadeOut,
        pointerEvents: "none",
      } as any} />
    </View>
  );
}

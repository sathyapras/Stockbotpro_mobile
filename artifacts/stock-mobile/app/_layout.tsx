import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { VerificationProvider } from "@/context/VerificationContext";
import { useColors } from "@/hooks/useColors";
import { fetchGlobalSentiment } from "@/services/globalSentimentService";
import { fetchMasterStock } from "@/services/masterStockService";
import { fetchRadarMarket } from "@/services/radarMarketService";
import { fetchSettings } from "@/services/settingsService";
import { fetchSmartMoneyFlow } from "@/services/smartMoneyService";
import { fetchAllPicks } from "@/services/stockpickService";
import { fetchScreener } from "@/services/stockToolsService";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function prefetchAll() {
  queryClient.prefetchQuery({
    queryKey: ["global-sentiment"],
    queryFn: fetchGlobalSentiment,
    staleTime: 10 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["master-stock"],
    queryFn: fetchMasterStock,
    staleTime: 60 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["radar-market"],
    queryFn: fetchRadarMarket,
    staleTime: 60 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["smart-money-flow"],
    queryFn: fetchSmartMoneyFlow,
    staleTime: 30 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["stocktools-screener"],
    queryFn: fetchScreener,
    staleTime: 60 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["stockpick-all"],
    queryFn: fetchAllPicks,
    staleTime: 30 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ["app-settings"],
    queryFn: fetchSettings,
    staleTime: 60 * 60 * 1000,
  });
}

function RootLayoutNav({ fontsReady }: { fontsReady: boolean }) {
  const colors    = useColors();
  const router    = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (fontsReady && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/splash");
    }
  }, [fontsReady]);

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
      }}
    >
      <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
      <Stack.Screen name="splash"           options={{ headerShown: false, animation: "none" }} />
      <Stack.Screen name="login"            options={{ headerShown: false }} />
      <Stack.Screen name="sign-up"          options={{ headerShown: false }} />
      <Stack.Screen name="stock/[code]"     options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="tool/[toolId]"    options={{ headerShown: false }} />
      <Stack.Screen name="market-intel"     options={{ headerShown: false }} />
      <Stack.Screen name="menu"             options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="affiliate"        options={{ headerShown: false }} />
      <Stack.Screen name="subscribe"        options={{ headerShown: false }} />
      <Stack.Screen name="midtrans-webview" options={{ headerShown: false }} />
      <Stack.Screen name="payment-success"  options={{ headerShown: false }} />
      <Stack.Screen name="payment-pending"  options={{ headerShown: false }} />
      <Stack.Screen name="contact-us"       options={{ headerShown: false }} />
      <Stack.Screen name="about-us"         options={{ headerShown: false }} />
      <Stack.Screen name="tutorial"         options={{ headerShown: false }} />
      <Stack.Screen name="notifications"    options={{ headerShown: false }} />
      <Stack.Screen name="settings"         options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile"     options={{ headerShown: false }} />
      <Stack.Screen name="change-password"    options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password"    options={{ headerShown: false }} />
      <Stack.Screen name="bos"               options={{ headerShown: false }} />
      <Stack.Screen name="buka-rekening"     options={{ headerShown: false }} />
      <Stack.Screen name="sector-rotation"   options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (colorScheme === "dark") {
      SystemUI.setBackgroundColorAsync("#0A0B14");
    } else {
      SystemUI.setBackgroundColorAsync("#F4F6F9");
    }
  }, [colorScheme]);

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
      prefetchAll();
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <VerificationProvider>
            <QueryClientProvider client={queryClient}>
              <WatchlistProvider>
                <NotificationProvider>
                  <GestureHandlerRootView>
                    <RootLayoutNav fontsReady={fontsReady} />
                  </GestureHandlerRootView>
                </NotificationProvider>
              </WatchlistProvider>
            </QueryClientProvider>
          </VerificationProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

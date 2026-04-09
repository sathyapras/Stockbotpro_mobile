import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { useColors } from "@/hooks/useColors";
import { fetchGlobalSentiment } from "@/services/globalSentimentService";
import { fetchMasterStock } from "@/services/masterStockService";
import { fetchRadarMarket } from "@/services/radarMarketService";
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
}

function RootLayoutNav() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="stock/[code]" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="tool/[toolId]" options={{ headerShown: false }} />
      <Stack.Screen name="market-intel" options={{ headerShown: false }} />
      <Stack.Screen name="menu" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="about-us" options={{ headerShown: false }} />
      <Stack.Screen name="tutorial" options={{ headerShown: false }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      prefetchAll();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <WatchlistProvider>
            <GestureHandlerRootView>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </WatchlistProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

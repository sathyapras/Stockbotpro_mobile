import React from "react";
import { TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { hapticLight } from "@/hooks/useHaptic";

interface Props extends TouchableOpacityProps {
  haptic?: "light" | "none";
}

/**
 * Drop-in replacement for TouchableOpacity that fires a light haptic on press.
 */
export function HapticButton({ onPress, haptic = "light", ...props }: Props) {
  function handlePress(e: any) {
    if (haptic === "light") hapticLight();
    onPress?.(e);
  }
  return <TouchableOpacity {...props} onPress={handlePress} />;
}

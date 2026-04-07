import React from "react";
import { Rect, Svg } from "react-native-svg";

interface Props {
  data: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 100, height = 28 }: Props) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(Math.abs), 1);
  const barW = Math.max(1, (width / data.length) - 1);
  const mid = height / 2;

  return (
    <Svg width={width} height={height}>
      {data.map((val, i) => {
        const h = Math.max(2, (Math.abs(val) / max) * (mid - 1));
        const y = val >= 0 ? mid - h : mid;
        return (
          <Rect
            key={i}
            x={i * (barW + 1)}
            y={y}
            width={barW}
            height={h}
            fill={val >= 0 ? "#34d399" : "#f87171"}
            rx={1}
          />
        );
      })}
    </Svg>
  );
}

"use client";

import { useId } from "react";
import { ReferenceArea } from "recharts";
import { COVID_GAP_LABEL } from "@/lib/covid-gap";

type AreaShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function HatchedGapShape({
  x,
  y,
  width,
  height,
  label,
  clipId,
}: AreaShapeProps & { label: string; clipId: string }) {
  if (
    x == null ||
    y == null ||
    width == null ||
    height == null ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 2 ||
    height < 2
  ) {
    return null;
  }

  const spacing = 6;
  const lines: React.ReactNode[] = [];
  for (let i = -height; i < width + height; i += spacing) {
    lines.push(
      <line
        key={i}
        x1={x + i}
        y1={y + height}
        x2={x + i + height}
        y2={y}
        stroke="rgba(11, 79, 108, 0.4)"
        strokeWidth={2}
      />,
    );
  }

  return (
    <g className="covid-gap-hatch" aria-label={label}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(11, 79, 108, 0.1)"
        stroke="rgba(11, 79, 108, 0.4)"
        strokeWidth={1.25}
        strokeDasharray="4 2"
      />
      <g clipPath={`url(#${clipId})`}>{lines}</g>
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0b4f6c"
        fontSize={11}
        fontStyle="italic"
        fontWeight={700}
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

export function CovidGapBand({ x0, x1 }: { x0: number; x1: number }) {
  const clipId = useId().replace(/:/g, "");
  return (
    <ReferenceArea
      x1={x0}
      x2={x1}
      ifOverflow="visible"
      shape={(props) => (
        <HatchedGapShape
          {...props}
          label={COVID_GAP_LABEL}
          clipId={`covid-gap-${clipId}`}
        />
      )}
    />
  );
}

export function CovidAwareYearTick({
  x,
  y,
  payload,
  tickLabels,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  tickLabels: Map<number, string>;
}) {
  if (x == null || y == null || payload?.value == null) return null;
  const label = tickLabels.get(payload.value) ?? "";
  const isGap = label === COVID_GAP_LABEL;
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fill={isGap ? "#0b4f6c" : "#3d4f66"}
      fontSize={isGap ? 10 : 12}
      fontStyle={isGap ? "italic" : "normal"}
      fontWeight={isGap ? 700 : 400}
    >
      {label}
    </text>
  );
}

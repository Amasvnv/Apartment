import { Box } from "@mantine/core";
import type { ReactNode } from "react";

export type CardArtKind =
  | "home"
  | "apartments"
  | "door"
  | "bolt"
  | "droplet"
  | "trash"
  | "wrench"
  | "sparkles"
  | "chart"
  | "invoice"
  | "coins"
  | "clock"
  | "check"
  | "wallet";

const ART = {
  viewBox: "0 0 120 120",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

const SHAPES: Record<CardArtKind, ReactNode> = {
  home: (
    <svg {...ART}>
      <path d="M16 58 L60 22 L104 58" />
      <path d="M28 52 V100 H92 V52" />
      <path d="M52 100 V76 H68 V100" />
      <path d="M38 62 H46" />
      <circle cx="78" cy="68" r="7" />
    </svg>
  ),
  apartments: (
    <svg {...ART}>
      <path d="M32 100 V24 H88 V100" />
      <path d="M32 100 H88" />
      <path d="M46 40 H56" />
      <path d="M64 40 H74" />
      <path d="M46 58 H56" />
      <path d="M64 58 H74" />
      <path d="M46 76 H56" />
      <path d="M64 76 H74" />
    </svg>
  ),
  door: (
    <svg {...ART}>
      <path d="M36 102 V26 H84 V102" />
      <path d="M30 102 H90" />
      <path d="M72 62 V68" />
    </svg>
  ),
  bolt: (
    <svg {...ART}>
      <path d="M68 14 L34 68 H58 L50 108 L88 52 H62 Z" fill="currentColor" fillOpacity={0.5} />
    </svg>
  ),
  droplet: (
    <svg {...ART}>
      <path d="M60 14 C60 14 28 54 28 74 a32 32 0 0 0 64 0 C92 54 60 14 60 14 Z" />
      <path d="M42 78 q9 -9 18 0 t18 0" />
      <path d="M42 92 q9 -9 18 0 t18 0" />
    </svg>
  ),
  trash: (
    <svg {...ART}>
      <path d="M26 38 H94" />
      <path d="M48 38 V28 H72 V38" />
      <path d="M34 38 L40 102 H80 L86 38" />
      <path d="M52 54 V86" />
      <path d="M68 54 V86" />
    </svg>
  ),
  wrench: (
    <svg {...ART}>
      <path d="M74 20 a18 18 0 0 0 -20 27 L22 79 a9 9 0 0 0 13 13 l32 -32 a18 18 0 0 0 27 -20 l-13 13 -12 -12 Z" />
    </svg>
  ),
  sparkles: (
    <svg {...ART}>
      <path d="M54 16 l6 20 20 6 -20 6 -6 20 -6 -20 -20 -6 20 -6 Z" fill="currentColor" fillOpacity={0.4} />
      <path d="M88 66 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 Z" />
      <path d="M34 74 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 Z" />
    </svg>
  ),
  chart: (
    <svg {...ART}>
      <path d="M26 100 V56" strokeWidth={9} />
      <path d="M46 100 V72" strokeWidth={9} />
      <path d="M66 100 V44" strokeWidth={9} />
      <path d="M86 100 V28" strokeWidth={9} />
    </svg>
  ),
  invoice: (
    <svg {...ART}>
      <path d="M34 22 H86 V98 L78 92 L70 98 L62 92 L54 98 L46 92 L38 98 L34 94 Z" />
      <path d="M48 42 H72" />
      <path d="M48 58 H72" />
      <path d="M48 74 H62" />
    </svg>
  ),
  coins: (
    <svg {...ART}>
      <circle cx="60" cy="38" r="16" />
      <path d="M44 58 c0 9 7 16 16 16 s16 -7 16 -16" />
      <path d="M44 76 c0 9 7 16 16 16 s16 -7 16 -16" />
      <path d="M60 30 V46" />
    </svg>
  ),
  clock: (
    <svg {...ART}>
      <circle cx="60" cy="60" r="36" />
      <path d="M60 40 V60 L76 70" />
    </svg>
  ),
  check: (
    <svg {...ART}>
      <circle cx="60" cy="60" r="36" />
      <path d="M44 61 L55 72 L78 48" />
    </svg>
  ),
  wallet: (
    <svg {...ART}>
      <path d="M24 44 a8 8 0 0 1 8 -8 h48 a8 8 0 0 1 8 8 h-56 a8 8 0 0 0 -8 8 Z" />
      <path d="M24 52 V84 a8 8 0 0 0 8 8 h56 a8 8 0 0 0 8 -8 V52" />
      <path d="M96 66 H76 a9 9 0 0 0 0 18 H96" />
    </svg>
  )
};

export default function CardArt({ kind }: { kind: CardArtKind }) {
  return (
    <Box className="tile-art" aria-hidden>
      {SHAPES[kind]}
    </Box>
  );
}

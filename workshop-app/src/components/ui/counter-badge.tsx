"use client";

import { cn } from "workshop/lib/utils";

type CounterBadgeProps = {
  count: number;
  variant?: "default" | "active" | "muted";
  className?: string;
};

export function CounterBadge({ count, variant = "default", className }: CounterBadgeProps) {
  // Hide when count is 0
  if (count <= 0) return null;

  // Cap display at 99+
  const displayCount = count > 99 ? "99+" : count.toString();

  const variants = {
    default: "bg-[#D9D3C7] text-[#6B6560]",
    active: "bg-[#B5763A] text-[#F7F4EF]",
    muted: "bg-[#EFEBE3] text-[#9E9892]",
  };

  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-[5px] text-label-sm tabular-nums",
        variants[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
}

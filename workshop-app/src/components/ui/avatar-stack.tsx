"use client";

import { cn } from "workshop/lib/utils";

type Collaborator = {
  id: string;
  name: string | null;
  email: string | null;
};

type AvatarStackProps = {
  collaborators: Collaborator[];
  max?: number;
  className?: string;
};

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0];
    const second = parts[1]?.[0];
    if (first && second) return (first + second).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function AvatarStack({ collaborators, max = 3, className }: AvatarStackProps) {
  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - max;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((collab) => (
        <div
          key={collab.id}
          className="flex size-7 items-center justify-center rounded-full border-2 border-[#FDFBF8] bg-[#E3DDD4] text-[10px] font-medium text-[#1A1917]"
          title={collab.name ?? collab.email ?? "Collaborator"}
        >
          {getInitials(collab.name, collab.email)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-[#FDFBF8] bg-[#D9D3C7] text-[10px] font-medium text-[#6B6560]">
          +{overflow}
        </div>
      )}
    </div>
  );
}

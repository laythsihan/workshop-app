"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "workshop/components/ui/input";
import { Label } from "workshop/components/ui/label";
import { api } from "workshop/trpc/react";

type ProfileFormProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
    displayName: string;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utils = api.useUtils();

  const updateUserMutation = api.user.update.useMutation({
    onSuccess: () => {
      setSuccessMessage("Profile updated successfully.");
      setErrorMessage(null);
      void utils.user.me.invalidate();
      void utils.comment.list.invalidate();
      void utils.document.collaborators.invalidate();
      void utils.document.activity.invalidate();
    },
    onError: () => {
      setErrorMessage("Something went wrong. Please try again.");
      setSuccessMessage(null);
    },
  });

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const updates: { name?: string; displayName?: string } = {};

    if (name !== user.name && name.trim()) {
      updates.name = name.trim();
    }
    if (displayName !== user.displayName && displayName.trim()) {
      updates.displayName = displayName.trim();
    }

    if (Object.keys(updates).length === 0) {
      setSuccessMessage("Profile updated successfully.");
      return;
    }

    updateUserMutation.mutate(updates);
  };

  const isSaving = updateUserMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={isSaving}
          maxLength={100}
          className="max-w-md"
        />
        <p className="text-xs text-muted-foreground">
          Your full name as it appears on your account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-display-name">Display Name</Label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          disabled={isSaving}
          maxLength={50}
          className="max-w-md"
        />
        <p className="text-xs text-muted-foreground">
          This name will be shown in comments and mentions.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={user.email}
          disabled
          className="max-w-md bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Your email is managed by your sign-in provider.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="flex h-9 w-fit items-center gap-2 rounded-md bg-[#B5763A] px-4 text-label-sm font-medium text-[#F7F4EF] transition-colors duration-150 hover:bg-[#9E6530] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          {isSaving ? "Saving…" : "Save changes"}
        </button>

        {successMessage && (
          <p className="text-label-sm font-medium text-[#4A9B6F] transition-opacity duration-150">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="text-label-sm font-medium text-[#A63D2F]">
            {errorMessage}
          </p>
        )}
      </div>
    </form>
  );
}

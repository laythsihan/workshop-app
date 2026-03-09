import Link from "next/link";
import { Button } from "workshop/components/ui/button";

type AuthSectionProps = {
  session: { user: { name?: string | null; email?: string | null } } | null;
};

export function AuthSection({ session }: AuthSectionProps) {
  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/api/auth/signout?callbackUrl=%2Fauth%2Fsignin"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/auth/signin"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Log in
      </Link>
      <Button size="sm" asChild>
        <Link href="/auth/signin">Join</Link>
      </Button>
    </div>
  );
}

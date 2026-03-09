import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "workshop/server/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F4EF]">
      {/* Header — fixed, 64px, transparent */}
      <header className="fixed top-0 left-0 right-0 z-10 flex h-16 items-center justify-between bg-transparent px-8">
        <Link
          href="/"
          className="font-lora text-display-sm text-[#1A1917]"
          aria-label="Workshop home"
        >
          Workshop
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/signin"
            className="hidden text-label-md font-medium text-[#6B6560] transition-colors hover:text-[#1A1917] min-[480px]:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="flex h-9 items-center justify-center rounded-[4px] bg-[#B5763A] px-4 text-label-md font-medium text-white transition-colors hover:bg-[#9E6530]"
          >
            Try for free
          </Link>
        </div>
      </header>

      {/* Hero — fills space between header and footer, vertically centered */}
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 pt-16 pb-14">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center space-y-6">
          <p className="max-w-[380px] text-center text-body-lg text-[#6B6560]">
            A place to share your writing and get feedback from readers you trust.
          </p>
          <Link
            href="/auth/signup"
            className="flex h-11 w-full items-center justify-center rounded-[4px] bg-[#B5763A] text-label-md font-medium text-white transition-colors hover:bg-[#9E6530]"
          >
            Try for free
          </Link>
        </div>
      </main>

      {/* Footer — fixed, 56px, transparent, border-top */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 flex h-14 items-center justify-between border-t border-[#E3DDD4] bg-transparent px-8">
        <span className="text-caption text-[#B8B0A4]">
          © 2026 Workshop. All rights reserved.
        </span>
        <span className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-caption text-[#9E9892] transition-colors hover:text-[#B5763A]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-caption text-[#9E9892] transition-colors hover:text-[#B5763A]"
          >
            Terms of Service
          </Link>
          <Link
            href="/help"
            className="text-caption text-[#9E9892] transition-colors hover:text-[#B5763A]"
          >
            Help
          </Link>
        </span>
      </footer>
    </div>
  );
}

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
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center space-y-6">
          <h1 className="text-center font-lora text-display-xl text-[#1A1917]">
            Workshop
          </h1>
          <p className="max-w-[380px] text-center text-body-lg text-[#6B6560]">
            A place to share your writing and get feedback from readers you trust.
          </p>
          <Link
            href="/auth/signup"
            className="flex h-11 w-full items-center justify-center rounded-[4px] bg-[#B5763A] text-label-md font-medium text-white transition-colors hover:bg-[#9E6530]"
          >
            Try for free
          </Link>
          <p className="mt-3 text-center text-body-sm text-[#9E9892]">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-label-sm font-medium text-[#B5763A] hover:underline hover:text-[#9E6530]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <footer className="flex flex-shrink-0 flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:gap-0 text-caption text-[#B8B0A4]">
        <span>© 2026 Workshop. All rights reserved.</span>
        <span className="flex gap-4">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
        </span>
      </footer>
    </div>
  );
}

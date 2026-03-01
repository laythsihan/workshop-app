import "workshop/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "workshop/trpc/react";
import { AuthSessionProvider } from "workshop/components/auth/session-provider";
import { TooltipProvider } from "workshop/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Workshop – Document Workshopping",
  description: "Upload documents, invite reviewers, and collaborate on feedback.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body>
        <TooltipProvider>
          <AuthSessionProvider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </AuthSessionProvider>
        </TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

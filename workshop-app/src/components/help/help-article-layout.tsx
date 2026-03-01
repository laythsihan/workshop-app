import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function HelpArticleLayout({ title, children }: Props) {
  return (
    <div className="mx-auto max-w-[640px] space-y-8">
      <div className="space-y-4">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-label-sm text-[#6B6560] transition-colors duration-150 hover:text-[#1A1917]"
        >
          <ChevronLeft className="size-4" />
          Back to Help
        </Link>
        <h1 className="font-lora text-display-lg text-[#1A1917]">
          {title}
        </h1>
      </div>
      <div className="prose-workshop">
        {children}
      </div>
    </div>
  );
}

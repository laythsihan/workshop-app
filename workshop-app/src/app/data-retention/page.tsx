import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";

export default function DataRetentionPage() {
  const filePath = path.join(process.cwd(), "DATA_RETENTION.md");
  const content = readFileSync(filePath, "utf8");

  // Simple markdown-like rendering: ## for h2, ### for h3, paragraphs, and --- for hr
  const sections = content.split(/\n(?=## )/).filter(Boolean);
  const parts: React.ReactNode[] = [];

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const first = lines[0];
    if (first?.startsWith("## ")) {
      parts.push(
        <h2
          key={parts.length}
          className="mt-8 text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892] first:mt-0"
        >
          {first.slice(3)}
        </h2>
      );
      const rest = lines.slice(1).join("\n").trim();
      if (rest) {
        const blocks = rest.split(/\n\n+/);
        for (const block of blocks) {
          if (block.startsWith("### ")) {
            parts.push(
              <h3
                key={parts.length}
                className="mt-4 font-medium text-[#1A1917]"
              >
                {block.slice(4).split("\n")[0]}
              </h3>
            );
            const after = block.slice(4).split("\n").slice(1).join("\n").trim();
            if (after) {
              parts.push(
                <p key={parts.length} className="mt-1 text-body-md text-[#1A1917]">
                  {after}
                </p>
              );
            }
          } else if (block.startsWith("---")) {
            parts.push(<hr key={parts.length} className="my-6 border-[#D9D3C7]" />);
          } else {
            parts.push(
              <p key={parts.length} className="mt-2 text-body-md text-[#1A1917]">
                {block.replace(/\n/g, " ")}
              </p>
            );
          }
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-8 shadow-[0_4px_16px_rgba(26,25,23,0.08)]">
        <h1 className="font-lora text-display-md text-[#1A1917]">
          Data retention and your rights
        </h1>
        <p className="mt-2 text-body-sm text-[#6B6560]">
          Plain-language summary of what we collect, how long we keep it, and
          what happens when you delete your account.
        </p>
        <div className="prose mt-6">{parts}</div>
        <p className="mt-8">
          <Link
            href="/privacy"
            className="text-body-sm text-[#B5763A] hover:underline"
          >
            ← Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}

import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Upload, Share2, BarChart3, MessageSquare } from "lucide-react";
import { FaqAccordion } from "workshop/components/help/faq-accordion";
import { HelpAnchorNav } from "workshop/components/help/anchor-nav";

const APP_VERSION = "0.1.0";

const gettingStartedCards = [
  {
    title: "Uploading a Document",
    description: "Learn how to upload your manuscript for workshop review.",
    href: "/help/uploading",
    icon: Upload,
  },
  {
    title: "Sharing for Workshop",
    description: "Invite collaborators and share your work with reviewers.",
    href: "/help/sharing",
    icon: Share2,
  },
  {
    title: "Understanding Statuses",
    description: "Track your document through Draft, In Review, and Completed.",
    href: "/help/statuses",
    icon: BarChart3,
  },
  {
    title: "Leaving Comments",
    description: "Provide feedback by highlighting text and adding comments.",
    href: "/help/comments",
    icon: MessageSquare,
  },
];

const faqItems = [
  {
    question: "What file types can I upload?",
    answer: "DOCX, PDF, and TXT are supported. DOCX is recommended for best word count and formatting accuracy.",
  },
  {
    question: "Can my workshop peers edit my document?",
    answer: "No. Reviewers can read and comment but cannot edit the document itself. Only the author can make changes.",
  },
  {
    question: "How do I change a document's status?",
    answer: "Open the document and click the status badge in the top bar. Select the new status from the dropdown.",
  },
  {
    question: "Can I remove a reviewer after sharing?",
    answer: "Yes. Open the document, go to the collaborators panel, and remove the reviewer from the list.",
  },
  {
    question: "Is my writing private by default?",
    answer: "Yes. All documents are private until you explicitly share them with another user.",
  },
];

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact & Feedback" },
  { id: "version", label: "Version" },
];

export default async function HelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-12">
      {/* Anchor Nav - visible on wide viewports */}
      <HelpAnchorNav sections={sections} />
        <div>
          <h1 className="font-lora text-display-xl text-[#1A1917]">
            Help & Docs
          </h1>
        </div>

        {/* Getting Started */}
        <section id="getting-started" className="scroll-mt-8 space-y-4">
          <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Getting Started
          </h2>
          <p className="text-body-sm leading-relaxed text-[#6B6560]">
            Workshop is a collaborative platform for sharing creative writing and receiving
            thoughtful feedback. Here are the key concepts to help you get started.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {gettingStartedCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group flex items-center justify-between rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4 transition-all duration-150 hover:border-[#B8B0A4] hover:bg-[#EFEBE3]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EFEBE3] text-[#6B6560] transition-colors duration-150 group-hover:bg-[#E3DDD4]">
                    <card.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-label-md font-medium text-[#1A1917]">
                      {card.title}
                    </h3>
                    <p className="mt-0.5 text-body-sm text-[#6B6560]">
                      {card.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-2 size-4 shrink-0 text-[#9E9892] transition-colors duration-150 group-hover:text-[#B5763A]" />
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-8 space-y-4">
          <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Frequently Asked Questions
          </h2>
          <FaqAccordion items={faqItems} />
        </section>

        {/* Contact & Feedback */}
        <section id="contact" className="scroll-mt-8 space-y-4">
          <h2 className="text-label-sm font-medium uppercase tracking-[0.08em] text-[#9E9892]">
            Contact & Feedback
          </h2>
          <p className="text-body-sm leading-relaxed text-[#6B6560]">
            Have a question not covered here? We&apos;d love to hear from you.
          </p>
          <div className="space-y-2">
            <a
              href="mailto:feedback@workshop.app?subject=Workshop Feedback"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#D9D3C7] bg-[#F7F4EF] px-4 text-label-sm font-medium text-[#1A1917] transition-all duration-150 hover:border-[#B8B0A4] hover:bg-[#EFEBE3]"
            >
              Send Feedback
            </a>
            <p className="text-caption text-[#9E9892]">
              We typically respond within one business day.
            </p>
          </div>
        </section>

        {/* Version Footer */}
        <footer id="version" className="scroll-mt-8 space-y-2 border-t border-[#D9D3C7] pt-6">
          <p className="text-caption text-[#9E9892]">
            Workshop v{APP_VERSION}
          </p>
          <p className="text-center text-caption text-[#9E9892]">
            © 2026 Layth Sihan. All rights reserved.
          </p>
        </footer>
    </div>
  );
}

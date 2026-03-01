import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { HelpArticleLayout } from "workshop/components/help/help-article-layout";

export default async function StatusesHelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <HelpArticleLayout title="Understanding Statuses">
      <p className="text-body-sm leading-relaxed text-[#6B6560]">
        Every document in Workshop has a status that reflects where it is in the workshop process.
        Use statuses to signal to reviewers whether you&apos;re ready for feedback.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Status Types
      </h2>
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-800">
              Draft
            </span>
          </div>
          <p className="mt-3 text-body-sm text-[#6B6560]">
            Your document is a work in progress. You may still be editing, revising, or not yet ready
            to share. Documents start in Draft status by default.
          </p>
          <p className="mt-2 text-body-sm text-[#6B6560]">
            <strong className="text-[#1A1917]">Reviewers can:</strong> Access the document if shared, but the Draft status signals that feedback may be premature.
          </p>
        </div>

        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-800">
              In Review
            </span>
          </div>
          <p className="mt-3 text-body-sm text-[#6B6560]">
            You&apos;re actively seeking feedback. This status tells reviewers the document is ready for
            their input and you&apos;re waiting to hear from them.
          </p>
          <p className="mt-2 text-body-sm text-[#6B6560]">
            <strong className="text-[#1A1917]">Reviewers can:</strong> Read and comment with confidence that you want their feedback.
          </p>
        </div>

        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-green-800">
              Completed
            </span>
          </div>
          <p className="mt-3 text-body-sm text-[#6B6560]">
            The workshop round is finished. You&apos;ve received the feedback you needed and are moving on.
            Marking a document complete locks commenting.
          </p>
          <p className="mt-2 text-body-sm text-[#6B6560]">
            <strong className="text-[#1A1917]">Reviewers can:</strong> View the document and existing comments, but cannot add new comments.
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Changing Status
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        Only the document author can change the status. To update:
      </p>
      <ol className="mt-3 space-y-4 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">1</span>
          <span>Open your document.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">2</span>
          <span>Click the status badge in the document header (top of the page).</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">3</span>
          <span>Select the new status from the dropdown.</span>
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-[#D9D3C7] bg-[#EFEBE3] p-4">
        <p className="text-body-sm text-[#6B6560]">
          <strong className="text-[#1A1917]">Tip:</strong> You can reopen a Completed document by changing it back to In Review.
          This unlocks commenting again if you need another round of feedback.
        </p>
      </div>
    </HelpArticleLayout>
  );
}

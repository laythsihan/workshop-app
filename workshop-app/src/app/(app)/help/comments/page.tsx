import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { HelpArticleLayout } from "workshop/components/help/help-article-layout";

export default async function CommentsHelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <HelpArticleLayout title="Leaving Comments">
      <p className="text-body-sm leading-relaxed text-[#6B6560]">
        Comments are the heart of Workshop. They let you give specific, contextual feedback on
        any part of a document.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Creating a Comment
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        To leave a comment tied to specific text:
      </p>
      <ol className="mt-3 space-y-4 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">1</span>
          <span>Highlight the text you want to comment on by clicking and dragging.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">2</span>
          <span>A comment box will appear in the comments panel on the right.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">3</span>
          <span>Type your feedback and click <strong className="text-[#1A1917]">Save</strong>.</span>
        </li>
      </ol>
      <p className="mt-4 text-body-sm leading-relaxed text-[#6B6560]">
        Your comment will appear in the panel with the highlighted passage quoted above it, making it
        easy to see what you&apos;re referring to.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Replying to Comments
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        Workshop supports threaded conversations. To reply to an existing comment:
      </p>
      <ol className="mt-3 space-y-4 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">1</span>
          <span>Click <strong className="text-[#1A1917]">Reply</strong> below the comment you want to respond to.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">2</span>
          <span>Type your reply in the input that appears.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">3</span>
          <span>Click <strong className="text-[#1A1917]">Reply</strong> to post your response.</span>
        </li>
      </ol>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Editing and Deleting
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        You can edit or delete your own comments and replies at any time:
      </p>
      <ul className="mt-3 space-y-2 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Hover over your comment to reveal the <strong className="text-[#1A1917]">⋯</strong> menu.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Select <strong className="text-[#1A1917]">Edit</strong> to modify your text, then click Save.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Select <strong className="text-[#1A1917]">Delete</strong> to remove the comment. You&apos;ll be asked to confirm.</span>
        </li>
      </ul>
      <p className="mt-4 text-body-sm leading-relaxed text-[#6B6560]">
        Edited comments show an <span className="text-[#9E9892]">(edited)</span> label next to the timestamp.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Filtering Comments
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        When a document has many comments from multiple reviewers, you can filter to see only
        specific feedback:
      </p>
      <ul className="mt-3 space-y-2 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Use the filter pills at the top of the comments panel.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Click <strong className="text-[#1A1917]">All</strong> to see every comment.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span>Click a reviewer&apos;s name to see only their comments.</span>
        </li>
      </ul>

      <div className="mt-8 rounded-lg border border-[#D9D3C7] bg-[#EFEBE3] p-4">
        <p className="text-body-sm text-[#6B6560]">
          <strong className="text-[#1A1917]">Note:</strong> When a document is marked Completed, commenting is
          disabled. You can still read existing comments, but you cannot add new ones until the author
          reopens the document for review.
        </p>
      </div>
    </HelpArticleLayout>
  );
}

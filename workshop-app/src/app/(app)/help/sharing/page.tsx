import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { HelpArticleLayout } from "workshop/components/help/help-article-layout";

export default async function SharingHelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <HelpArticleLayout title="Sharing for Workshop">
      <p className="text-body-sm leading-relaxed text-[#6B6560]">
        Workshop is built for collaboration. Share your writing with trusted reviewers to get
        thoughtful feedback before you publish or submit.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Inviting Reviewers
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        You can invite reviewers to your document in two ways:
      </p>
      <ul className="mt-3 space-y-2 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span><strong className="text-[#1A1917]">Email invite</strong> — Enter the reviewer&apos;s email address. They&apos;ll receive an email with a link to access your document.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span><strong className="text-[#1A1917]">Share link</strong> — Generate a unique link you can send directly. Anyone with the link can access the document.</span>
        </li>
      </ul>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Author vs. Reviewer
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        Workshop distinguishes between two roles:
      </p>
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-medium text-[#B5763A]">(Author)</span>
          </div>
          <p className="mt-2 text-body-sm text-[#6B6560]">
            The person who uploaded the document. Authors have full control: they can edit the title,
            change the status, invite or remove reviewers, and delete the document.
          </p>
        </div>
        <div className="rounded-lg border border-[#D9D3C7] bg-[#F7F4EF] p-4">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-medium text-[#6B6560]">Reviewer</span>
          </div>
          <p className="mt-2 text-body-sm text-[#6B6560]">
            Anyone invited to the document. Reviewers can read the full document and leave comments,
            but cannot edit the document itself or change its settings.
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Revoking Access
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        Changed your mind about a reviewer? You can remove their access at any time:
      </p>
      <ol className="mt-3 space-y-4 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">1</span>
          <span>Open the document you want to manage.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">2</span>
          <span>Look at the <strong className="text-[#1A1917]">Collaborators</strong> section in the left sidebar.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">3</span>
          <span>Click the reviewer&apos;s name and select <strong className="text-[#1A1917]">Remove</strong> from the menu.</span>
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-[#D9D3C7] bg-[#EFEBE3] p-4">
        <p className="text-body-sm text-[#6B6560]">
          <strong className="text-[#1A1917]">Note:</strong> Removing a reviewer does not delete their existing comments.
          You&apos;ll still see any feedback they left before being removed.
        </p>
      </div>
    </HelpArticleLayout>
  );
}

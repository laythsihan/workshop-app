import { auth } from "workshop/server/auth";
import { redirect } from "next/navigation";
import { HelpArticleLayout } from "workshop/components/help/help-article-layout";

export default async function UploadingHelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <HelpArticleLayout title="Uploading a Document">
      <p className="text-body-sm leading-relaxed text-[#6B6560]">
        Workshop makes it easy to upload your writing for collaborative review. Follow these steps
        to get your document ready for workshop feedback.
      </p>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        Supported File Types
      </h2>
      <p className="mt-2 text-body-sm leading-relaxed text-[#6B6560]">
        Workshop accepts the following file formats:
      </p>
      <ul className="mt-3 space-y-2 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span><strong className="text-[#1A1917]">DOCX</strong> — Microsoft Word documents. Recommended for best word count accuracy and formatting preservation.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span><strong className="text-[#1A1917]">PDF</strong> — Portable Document Format. Great for final drafts with specific formatting.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#B5763A]" />
          <span><strong className="text-[#1A1917]">TXT</strong> — Plain text files. Best for simple prose without formatting requirements.</span>
        </li>
      </ul>

      <h2 className="mt-8 text-label-md font-medium text-[#1A1917]">
        How to Upload
      </h2>
      <ol className="mt-3 space-y-4 text-body-sm text-[#6B6560]">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">1</span>
          <span>From your dashboard, click the <strong className="text-[#1A1917]">Upload</strong> button in the top right corner.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">2</span>
          <span>Drag and drop your file into the upload area, or click to browse your files.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">3</span>
          <span>Workshop will automatically detect the word count and display it on your document card.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">4</span>
          <span>Optionally, set a <strong className="text-[#1A1917]">genre</strong> and <strong className="text-[#1A1917]">due date</strong> to help reviewers understand the context and timeline.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EFEBE3] text-label-sm font-medium text-[#6B6560]">5</span>
          <span>Your document starts in <strong className="text-[#1A1917]">Draft</strong> status. When you&apos;re ready for feedback, share it with reviewers and change the status to In Review.</span>
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-[#D9D3C7] bg-[#EFEBE3] p-4">
        <p className="text-body-sm text-[#6B6560]">
          <strong className="text-[#1A1917]">Tip:</strong> Give your document a clear, descriptive title so reviewers know what to expect before they open it.
        </p>
      </div>
    </HelpArticleLayout>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";
import { getSupabaseAdmin } from "workshop/server/supabase";
import { getGuestSession } from "workshop/server/guest-session";
import { DocumentPageContent } from "workshop/components/documents/document-page-content";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const inviteToken = typeof search.invite === "string" ? search.invite : undefined;

  if (inviteToken) {
    redirect(`/invite/${inviteToken}`);
  }

  const [session, guestSession] = await Promise.all([
    auth(),
    getGuestSession(),
  ]);

  if (session?.user) {
    const doc = await db.document.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.user.id },
          {
            invitations: {
              some: {
                userId: session.user.id,
                status: "ACCEPTED",
              },
            },
          },
        ],
      },
      include: { owner: { select: { name: true } } },
    });
    if (doc) {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase not configured");
      const { data: signedUrl } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storagePath, 3600);
      if (!signedUrl?.signedUrl) throw new Error("Failed to generate signed URL");
      return (
        <DocumentPageContent
          documentId={doc.id}
          fileUrl={signedUrl.signedUrl}
          mimeType={doc.mimeType}
          title={doc.title}
          documentStatus={doc.status}
          isOwner={doc.ownerId === session.user.id}
          currentUserId={session.user.id}
          documentOwnerId={doc.ownerId}
          isGuest={false}
        />
      );
    }
    const revokedInv = await db.invitation.findFirst({
      where: {
        documentId: id,
        userId: session.user.id,
        status: "REVOKED",
      },
      include: {
        document: { include: { owner: { select: { name: true } } } },
      },
    });
    if (revokedInv) {
      return (
        <RevokedAccessPage
          authorName={
            revokedInv.document?.owner?.name ?? "the author"
          }
        />
      );
    }
  }

  if (guestSession?.documentId === id) {
    const guest = await db.guest.findUnique({
      where: { id: guestSession.guestId },
      select: { documentId: true, email: true },
    });
    if (guest?.documentId === id) {
      const revoked = await db.invitation.findFirst({
        where: {
          documentId: id,
          email: guest.email,
          status: "REVOKED",
        },
      });
      if (revoked) {
        const doc = await db.document.findFirst({
          where: { id },
          include: { owner: { select: { name: true } } },
        });
        return (
          <RevokedAccessPage
            authorName={doc?.owner?.name ?? "the author"}
          />
        );
      }
      const doc = await db.document.findFirst({
        where: { id },
        include: { owner: { select: { name: true } } },
      });
      if (doc) {
        const supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase not configured");
        const { data: signedUrl } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storagePath, 3600);
        if (!signedUrl?.signedUrl) throw new Error("Failed to generate signed URL");
        return (
          <DocumentPageContent
            documentId={doc.id}
            fileUrl={signedUrl.signedUrl}
            mimeType={doc.mimeType}
            title={doc.title}
            documentStatus={doc.status}
            isOwner={false}
            currentUserId={`guest-${guestSession.guestId}`}
            documentOwnerId={doc.ownerId}
            isGuest={true}
          />
        );
      }
    }
  }

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/documents/${id}`)}`);
  }

  notFound();
}

function RevokedAccessPage({
  authorName,
}: {
  authorName: string | null;
}) {
  const name = authorName ?? "the author";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF] p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-[#E8E4DD] bg-white p-8 shadow-sm">
        <h1 className="font-lora text-display-sm text-[#1A1917]">
          Your access has been removed
        </h1>
        <p className="text-body-md text-[#6B6560]">
          Your access to this document has been removed by the author. Contact{" "}
          {name} if you think this is a mistake.
        </p>
      </div>
    </div>
  );
}

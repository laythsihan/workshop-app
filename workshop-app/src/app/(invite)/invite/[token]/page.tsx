import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "workshop/server/auth";
import { db } from "workshop/server/db";
import {
  verifyInviteToken,
  markInviteTokenUsed,
  InviteTokenAlreadyUsedError,
} from "workshop/server/invite-token";
import { randomBytes } from "crypto";
import { InviteEntryClient } from "./invite-entry-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  // 1. Try DB lookup first (email invite: opaque token stored on Invitation)
  const invitationByToken = await db.invitation.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          filename: true,
          ownerId: true,
          owner: { select: { name: true, email: true } },
        },
      },
      invitedBy: { select: { name: true, email: true, displayName: true } },
    },
  });

  if (invitationByToken) {
    const inv = invitationByToken;
    const doc = inv.document;
    const inviterName =
      inv.invitedBy?.displayName ??
      inv.invitedBy?.name ??
      inv.invitedBy?.email ??
      "Someone";
    const documentTitle = doc.title ?? doc.filename;

    if (inv.status === "ACCEPTED") {
      return (
        <InviteExpiredState
          reason="already_used"
          documentId={doc.id}
          inviterName={inviterName}
        />
      );
    }
    if (inv.status === "REVOKED") {
      return (
        <InviteRevokedState
          documentId={doc.id}
          authorName={doc.owner?.name ?? doc.owner?.email ?? "the author"}
        />
      );
    }
    if (inv.expiresAt && inv.expiresAt < new Date()) {
      return (
        <InviteExpiredState
          reason="expired"
          documentId={doc.id}
          inviterName={inviterName}
        />
      );
    }

    // PENDING email invite
    if (session?.user?.id) {
      if (doc.ownerId === session.user.id) {
        redirect(`/documents/${doc.id}`);
      }
      await db.invitation.update({
        where: { id: inv.id },
        data: {
          userId: session.user.id,
          status: "ACCEPTED",
          email: session.user.email ?? inv.email,
        },
      });
      await db.activityLog.create({
        data: {
          type: "DOCUMENT_SHARED",
          documentId: doc.id,
          userId: inv.invitedById!,
          metadata: {
            recipientName: session.user.name ?? session.user.email ?? undefined,
          },
        },
      });
      await db.document.updateMany({
        where: { id: doc.id, status: "DRAFT" },
        data: { status: "IN_REVIEW" },
      });
      redirect(`/documents/${doc.id}`);
    }

    return (
      <InviteEntryClient
        documentTitle={documentTitle}
        inviterName={inviterName}
        inviteToken={token}
      />
    );
  }

  // 2. Fall back to JWT (copy-link flow)
  const verifyResult = await verifyInviteToken(token);

  if (!verifyResult.valid) {
    let inviterName = "the document owner";
    if (verifyResult.payload?.invitedById) {
      const inviter = await db.user.findUnique({
        where: { id: verifyResult.payload.invitedById },
        select: { name: true, email: true },
      });
      inviterName = inviter?.name ?? inviter?.email ?? "the document owner";
    }
    return (
      <InviteExpiredState
        reason={verifyResult.reason}
        documentId={verifyResult.payload?.documentId}
        inviterName={inviterName}
      />
    );
  }

  const { documentId, invitedById } = verifyResult.payload;

  const doc = await db.document.findFirst({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      filename: true,
      ownerId: true,
      owner: { select: { name: true, email: true } },
    },
  });

  if (!doc) {
    let inviterName = "the document owner";
    const inviter = await db.user.findUnique({
      where: { id: invitedById },
      select: { name: true, email: true },
    });
    if (inviter) inviterName = inviter.name ?? inviter.email ?? inviterName;
    return (
      <InviteExpiredState
        reason="invalid"
        documentId={documentId}
        inviterName={inviterName}
      />
    );
  }

  const inviterName = doc.owner.name ?? doc.owner.email ?? "Someone";
  const documentTitle = doc.title ?? doc.filename;

  if (session?.user?.id) {
    if (doc.ownerId === session.user.id) {
      redirect(`/documents/${doc.id}`);
    }

    try {
      await markInviteTokenUsed({
        jti: verifyResult.payload.jti,
        documentId,
      });
    } catch (e) {
      if (e instanceof InviteTokenAlreadyUsedError) {
        return (
          <InviteExpiredState
            reason="already_used"
            documentId={documentId}
            inviterName={inviterName}
          />
        );
      }
      throw e;
    }

    const existingInvitation = await db.invitation.findFirst({
      where: {
        documentId,
        userId: session.user.id,
      },
    });

    if (!existingInvitation) {
      await db.invitation.create({
        data: {
          token: randomBytes(32).toString("hex"),
          documentId,
          userId: session.user.id,
          email: session.user.email ?? "",
          status: "ACCEPTED",
          invitedById,
        },
      });

      await db.activityLog.create({
        data: {
          type: "DOCUMENT_SHARED",
          documentId,
          userId: invitedById,
          metadata: {
            recipientName: session.user.name ?? session.user.email ?? undefined,
          },
        },
      });

      await db.document.updateMany({
        where: { id: documentId, status: "DRAFT" },
        data: { status: "IN_REVIEW" },
      });
    }

    redirect(`/documents/${doc.id}`);
  }

  return (
    <InviteEntryClient
      documentTitle={documentTitle}
      inviterName={inviterName}
      inviteToken={token}
    />
  );
}

function InviteRevokedState({
  documentId: _documentId,
  authorName,
}: {
  documentId: string;
  authorName: string;
}) {
  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-8 shadow-sm">
      <h1 className="font-lora text-display-sm text-[#1A1917]">
        Your access has been removed
      </h1>
      <p className="text-body-md text-[#6B6560]">
        Your access to this document has been removed by the author. Contact{" "}
        {authorName} if you think this is a mistake.
      </p>
    </div>
  );
}

function InviteExpiredState({
  reason,
  documentId,
  inviterName = "the document owner",
}: {
  reason: "expired" | "invalid" | "already_used";
  documentId: string | undefined;
  inviterName?: string;
}) {
  const messages: Record<typeof reason, { title: string; body: (name: string) => string }> = {
    expired: {
      title: "This invite link has expired",
      body: (name) => `Invite links are valid for 30 days. Ask ${name} to send you a new link.`,
    },
    invalid: {
      title: "Invalid invite link",
      body: (name) => `This link may be malformed or corrupted. Ask ${name} to send you a new link.`,
    },
    already_used: {
      title: "This invite link has already been used",
      body: (name) => `Each invite link can only be used once. Ask ${name} to send you a new link.`,
    },
  };

  const { title, body } = messages[reason];
  const bodyText = body(inviterName);

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border border-[#E8E4DD] bg-[#F7F4EF] p-8 shadow-sm">
      <h1 className="font-lora text-display-sm text-[#1A1917]">{title}</h1>
      <p className="text-body-md text-[#1A1917]/80">{bodyText}</p>
      <div className="flex flex-col gap-3 pt-2">
        <Link
          href={
            documentId
              ? `/auth/signin?callbackUrl=${encodeURIComponent(`/documents/${documentId}`)}`
              : "/auth/signin"
          }
          className="inline-flex w-full items-center justify-center rounded-[4px] border border-[#D9D3C7] bg-transparent px-4 py-2.5 text-label-md font-medium text-[#1A1917] transition hover:border-[#B8B0A4] hover:bg-[#EFEBE3]"
        >
          Sign in to your account
        </Link>
        <p className="text-caption text-[#9E9892]">
          If you don&apos;t have an account, ask {inviterName} to send you a new invite link.
        </p>
      </div>
    </div>
  );
}

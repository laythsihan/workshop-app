/**
 * Email sending via Resend.
 * Requires RESEND_API_KEY in env. If not set, emails are logged and not sent.
 */

import { Resend } from "resend";
import { env } from "workshop/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = "Workshop <onboarding@resend.dev>";

export async function sendAccountDeletionNotificationToCollaborators(
  collaboratorEmails: string[],
  documentTitles: string[],
  ownerName: string
): Promise<{ success: boolean; error?: string }> {
  const titlesList = documentTitles.length > 0 ? documentTitles.join(", ") : "a document";
  const body = `Hi there,

${ownerName} has deleted their Workshop account. They shared the following with you: ${titlesList}.

Your access to these documents will be removed in 7 days. If you need to save any feedback or notes, please do so before then.

Take care,
The Workshop Team`;

  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set. Would send:", {
      to: collaboratorEmails,
      subject: "A document owner has deleted their account",
      body,
    });
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: collaboratorEmails,
      subject: "A document owner has deleted their account",
      text: body,
    });
    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const text = `Hi there,

You requested a password reset for your Workshop account. Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

Take care,
The Workshop Team`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#F7F4EF;font-family:ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1A1917;"><div style="max-width:480px;margin:0 auto;padding:32px 24px;"><p style="margin:0 0 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A1917;">Workshop</p><p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">You requested a password reset for your Workshop account.</p><p style="margin:0 0 24px 0;text-align:center;"><a href="${resetUrl.replace(/&/g, "&amp;")}" style="display:inline-block;background:#B5763A;color:#fff;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:4px;">Reset your password</a></p><p style="margin:0 0 32px 0;font-size:14px;color:#6B6560;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p><p style="margin:0;font-size:12px;color:#9E9892;">Take care,<br>The Workshop Team</p></div></body></html>`;

  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set. Would send password reset:", {
      to,
      resetUrl,
      body: text,
    });
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Reset your Workshop password",
      html,
      text,
    });
    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
  const displayName = firstName.trim() || "there";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#F7F4EF;font-family:ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1A1917;"><div style="max-width:480px;margin:0 auto;padding:32px 24px;"><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#1A1917;margin:0 0 24px 0;">Welcome to Workshop</h1><p style="margin:0 0 24px 0;">Hi ${displayName},</p><p style="margin:0 0 24px 0;">Your account is ready. Upload your first document and invite a reviewer to get started.</p><p style="margin:0 0 24px 0;"><a href="${dashboardUrl}" style="display:inline-block;background:#B5763A;color:#F7F4EF;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:4px;">Go to your dashboard</a></p><p style="margin:0;color:#9E9892;font-size:14px;">Take care,<br>The Workshop Team</p></div></body></html>`;
  const text = `Hi ${displayName},\n\nWelcome to Workshop! Your account is ready. Upload your first document and invite a reviewer to get started.\n\nGo to your dashboard: ${dashboardUrl}\n\nTake care,\nThe Workshop Team`;

  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set. Would send welcome:", { to, subject: "Welcome to Workshop", body: text });
    return { success: true };
  }
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject: "Welcome to Workshop", html, text });
    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function sendDocumentInviteEmail(
  to: string,
  inviterName: string,
  documentTitle: string,
  claimUrl: string
): Promise<{ success: boolean; error?: string }> {
  const safeTitle = documentTitle.trim() || "Untitled";
  const safeInviter = inviterName.trim() || "Someone";
  const subject = `${safeInviter} invited you to review "${safeTitle}"`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#F7F4EF;font-family:ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1A1917;"><div style="max-width:480px;margin:0 auto;padding:32px 24px;"><p style="margin:0 0 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A1917;">Workshop</p><p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">${escapeHtml(safeInviter)} has invited you to review their work on Workshop.</p><p style="margin:0 0 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#1A1917;">${escapeHtml(safeTitle)}</p><p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#6B6560;">Workshop is a space for writers to share their work and receive feedback from readers and peers.</p><p style="margin:0 0 24px 0;text-align:center;"><a href="${escapeHtml(claimUrl)}" style="display:inline-block;background:#B5763A;color:#fff;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:4px;">Review ${escapeHtml(safeTitle)}</a></p><p style="margin:0 0 32px 0;font-size:12px;color:#9E9892;">This link expires in 14 days. If you weren't expecting this invite, you can ignore this email.</p><p style="margin:0;font-size:12px;color:#9E9892;">Take care,<br>The Workshop Team</p></div></body></html>`;
  const text = `${safeInviter} has invited you to review their work on Workshop.\n\nDocument: ${safeTitle}\n\nWorkshop is a space for writers to share their work and receive feedback from readers and peers.\n\nReview this document: ${claimUrl}\n\nThis link expires in 14 days. If you weren't expecting this invite, you can ignore this email.\n\nTake care,\nThe Workshop Team`;

  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set. Would send document invite:", {
      to,
      subject,
      body: text,
    });
    return { success: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

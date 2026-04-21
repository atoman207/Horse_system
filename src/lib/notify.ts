import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * Lightweight notification layer.
 *
 * - Emits to a pluggable transport. By default the transport is a
 *   no-op + audit_logs insert so notifications are auditable even
 *   before an SMTP / Resend integration is wired.
 * - Set NOTIFY_TRANSPORT=resend and RESEND_API_KEY=... to send real mail.
 */

export type NotifyKind =
  | "donation_thanks"
  | "booking_confirmed"
  | "booking_canceled"
  | "payment_failed"
  | "plan_changed"
  | "support_changed";

export type NotifyPayload = {
  kind: NotifyKind;
  to: string | null;
  to_name?: string | null;
  subject: string;
  body_text: string;
  meta?: Record<string, unknown>;
};

function fromAddress(): string {
  return process.env.NOTIFY_FROM_EMAIL ?? "no-reply@retouch-members.local";
}

async function sendViaResend(p: NotifyPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !p.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `Retouchメンバーズ <${fromAddress()}>`,
        to: [p.to],
        subject: p.subject,
        text: p.body_text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notify(payload: NotifyPayload): Promise<{ sent: boolean; transport: string }> {
  const transport = (process.env.NOTIFY_TRANSPORT ?? "audit").toLowerCase();
  let sent = false;
  if (transport === "resend") {
    sent = await sendViaResend(payload);
  }
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("audit_logs").insert({
      action: `notify.${payload.kind}`,
      target_table: "notifications",
      meta: {
        to: payload.to,
        to_name: payload.to_name ?? null,
        subject: payload.subject,
        preview: payload.body_text.slice(0, 400),
        transport,
        sent,
        ...(payload.meta ?? {}),
      },
    });
  } catch {
    // logging must not break the caller
  }
  return { sent, transport };
}

export function donationThanksTemplate(params: {
  name: string | null;
  amount: number;
}): Pick<NotifyPayload, "subject" | "body_text"> {
  const yen = `¥${Math.round(params.amount).toLocaleString("ja-JP")}`;
  const who = params.name?.trim() || "ご支援者";
  return {
    subject: "ご寄付ありがとうございます — Retouchメンバーズ",
    body_text:
      `${who}様\n\n` +
      `このたびは引退競走馬への温かいご寄付（${yen}）をありがとうございます。\n` +
      `いただいたご支援は、馬たちのケアと見学会運営にありがたく活用させていただきます。\n\n` +
      `マイページ: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://retouch-members.local"}/mypage\n\n` +
      `— Retouchメンバーズサイト 運営チーム`,
  };
}

export function paymentFailedTemplate(params: {
  name: string | null;
  contractId: string;
}): Pick<NotifyPayload, "subject" | "body_text"> {
  const who = params.name?.trim() || "会員";
  return {
    subject: "【要対応】お支払いに失敗しました — Retouchメンバーズ",
    body_text:
      `${who}様\n\n` +
      `ご登録のカードでの決済が失敗いたしました。\n` +
      `恐れ入りますが、マイページから「お支払い情報を変更」ボタンでカード情報をご確認ください。\n\n` +
      `マイページ: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://retouch-members.local"}/mypage\n\n` +
      `— Retouchメンバーズサイト 運営チーム`,
  };
}

export function bookingConfirmedTemplate(params: {
  name: string | null;
  eventTitle: string;
  startsAt: string | Date;
}): Pick<NotifyPayload, "subject" | "body_text"> {
  const who = params.name?.trim() || "会員";
  const d = typeof params.startsAt === "string" ? new Date(params.startsAt) : params.startsAt;
  const when = Number.isNaN(d.getTime())
    ? String(params.startsAt)
    : `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return {
    subject: `ご予約を受け付けました — ${params.eventTitle}`,
    body_text:
      `${who}様\n\n` +
      `以下の見学会のご予約を受け付けました。\n` +
      `・${params.eventTitle}\n` +
      `・開始: ${when}\n\n` +
      `当日の詳細は別途ご連絡いたします。\n` +
      `キャンセル・変更はマイページから行えます。\n\n` +
      `— Retouchメンバーズサイト 運営チーム`,
  };
}

export function planChangedTemplate(params: {
  name: string | null;
  planName: string;
  monthly: number;
}): Pick<NotifyPayload, "subject" | "body_text"> {
  const yen = `¥${Math.round(params.monthly).toLocaleString("ja-JP")}`;
  const who = params.name?.trim() || "会員";
  return {
    subject: `会員種別を変更しました — ${params.planName}`,
    body_text:
      `${who}様\n\n` +
      `会員種別を「${params.planName}（月額 ${yen}）」に変更いたしました。\n` +
      `引き続きご支援のほどよろしくお願いいたします。\n\n` +
      `— Retouchメンバーズサイト 運営チーム`,
  };
}

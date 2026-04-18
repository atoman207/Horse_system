import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature error: ${e.message}` }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donationId = (session.metadata?.donation_id ?? session.client_reference_id) as string | undefined;
        if (session.mode === "payment" && donationId) {
          await admin
            .from("donations")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: (session.payment_intent as string) ?? null,
              donated_at: new Date(session.created * 1000).toISOString(),
            })
            .eq("id", donationId);
          const { data: donation } = await admin.from("donations").select("*").eq("id", donationId).maybeSingle();
          if (donation) {
            await admin.from("payments").insert({
              customer_id: (donation as any).customer_id,
              donation_id: (donation as any).id,
              kind: "donation",
              amount: (donation as any).amount,
              currency: "jpy",
              status: "succeeded",
              stripe_event_id: event.id,
              stripe_payment_intent_id: (session.payment_intent as string) ?? null,
              occurred_at: new Date(session.created * 1000).toISOString(),
              raw: session as any,
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeCustomerId = sub.customer as string;
        const { data: customer } = await admin
          .from("customers")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        if (customer) {
          await admin.from("contracts").upsert(
            {
              customer_id: (customer as any).id,
              stripe_subscription_id: sub.id,
              status:
                sub.status === "active" ? "active" :
                sub.status === "past_due" ? "past_due" :
                sub.status === "canceled" ? "canceled" :
                sub.status === "paused" ? "paused" : "incomplete",
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
            },
            { onConflict: "stripe_subscription_id" },
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from("contracts")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;
        const { data: customer } = await admin
          .from("customers")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        const { data: contract } = invoice.subscription
          ? await admin
              .from("contracts")
              .select("id")
              .eq("stripe_subscription_id", invoice.subscription as string)
              .maybeSingle()
          : { data: null } as any;

        await admin.from("payments").insert({
          customer_id: (customer as any)?.id ?? null,
          contract_id: (contract as any)?.id ?? null,
          kind: "subscription",
          amount: invoice.amount_paid || invoice.amount_due || 0,
          currency: invoice.currency,
          status: event.type === "invoice.payment_succeeded" ? "succeeded" : "failed",
          stripe_event_id: event.id,
          stripe_invoice_id: invoice.id,
          failure_reason: event.type === "invoice.payment_failed" ? (invoice.last_finalization_error?.message ?? null) : null,
          occurred_at: new Date((invoice.status_transitions.paid_at ?? invoice.created) * 1000).toISOString(),
          raw: invoice as any,
        });

        if (event.type === "invoice.payment_failed" && contract) {
          await admin.from("contracts").update({ status: "past_due" }).eq("id", (contract as any).id);
        }
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

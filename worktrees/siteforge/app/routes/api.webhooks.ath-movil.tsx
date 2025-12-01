/**
 * ATH Móvil Webhook Handler
 *
 * Receives payment notifications from ATH Móvil when customers complete payments
 */

import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { processATHMovilWebhook, verifyWebhookSignature } from "~/lib/ath-movil";
import { updateJob } from "~/lib/job-tracking";
import { sendTemplatedMessage } from "~/lib/communications";

export async function action({ request, context }: ActionFunctionArgs) {
  // Only accept POST requests
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Get webhook signature from headers (if ATH Móvil provides it)
    const signature = request.headers.get("x-ath-movil-signature");

    // Parse webhook payload
    const payload = await request.text();
    let webhookData: any;

    try {
      webhookData = JSON.parse(payload);
    } catch (error) {
      return json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Verify webhook signature if configured
    if (signature && context.env.ATH_MOVIL_WEBHOOK_SECRET) {
      const isValid = await verifyWebhookSignature(
        payload,
        signature,
        context.env.ATH_MOVIL_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error("ATH Móvil webhook signature verification failed");
        return json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Process the webhook
    const payment = await processATHMovilWebhook(context, {
      transaction_id: webhookData.transaction_id || webhookData.id,
      status: webhookData.status || webhookData.payment_status,
      amount: webhookData.amount || webhookData.total,
      customer_phone: webhookData.customer_phone || webhookData.phone,
      reference: webhookData.reference || webhookData.ref,
      timestamp: webhookData.timestamp || webhookData.created_at,
      metadata: webhookData.metadata || {},
    });

    // If payment completed, send confirmation to customer
    if (payment.payment_status === "completed") {
      // Get job details
      const job = await context.env.DB.prepare(
        "SELECT * FROM jobs WHERE id = ?"
      )
        .bind(payment.job_id)
        .first<any>();

      if (job) {
        // Send payment confirmation via SMS/WhatsApp
        const customerPhone = job.customer_phone;
        const language = job.customer_city?.toLowerCase().includes("puerto rico") ||
          job.customer_state === "PR"
          ? "es"
          : "en";

        try {
          await sendTemplatedMessage(context, {
            job_id: job.id,
            template_key: "payment_received",
            type: "sms",
            recipient: customerPhone,
            language,
            variables: {
              amount: payment.amount.toFixed(2),
              payment_method: "ATH Móvil",
              job_code: job.job_code,
            },
          });
        } catch (error) {
          console.error("Failed to send payment confirmation:", error);
          // Don't fail the webhook if notification fails
        }

        // Update job status if it was completed
        if (job.status === "completed" && job.payment_status !== "paid") {
          await updateJob(
            context,
            job.id,
            {
              payment_status: "paid",
              payment_method: "ath_movil",
            },
            "ath_movil_webhook",
            "system"
          );
        }
      }
    }

    return json({
      success: true,
      payment_id: payment.id,
      status: payment.payment_status,
    });
  } catch (error: any) {
    console.error("ATH Móvil webhook error:", error);
    return json(
      {
        error: error.message || "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

// GET method to verify webhook endpoint is active
export async function loader() {
  return json({
    service: "ATH Móvil Webhook Handler",
    status: "active",
    methods: ["POST"],
  });
}

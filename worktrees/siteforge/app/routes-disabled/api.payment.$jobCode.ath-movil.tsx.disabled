/**
 * ATH Móvil Payment Link Generator
 *
 * API endpoint to generate payment links for customers
 * Used in customer portal and job completion flows
 */

import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getJobByCode } from "~/lib/job-tracking";
import { createPaymentRequest, listJobPayments } from "~/lib/ath-movil";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { jobCode } = params;

  if (!jobCode) {
    return json({ error: "Job code required" }, { status: 400 });
  }

  try {
    // Get job details
    const job = await getJobByCode(context, jobCode);

    // Check if job is eligible for payment
    if (job.total_amount <= 0) {
      return json({ error: "No payment required for this job" }, { status: 400 });
    }

    if (job.payment_status === "paid") {
      return json({ error: "This job has already been paid" }, { status: 400 });
    }

    // Check if a pending payment request already exists
    const existingPayments = await listJobPayments(context, job.id);
    const pendingPayment = existingPayments.find((p) => p.payment_status === "pending");

    let paymentRequest;

    if (pendingPayment) {
      // Return existing payment link
      paymentRequest = {
        id: pendingPayment.id,
        transaction_id: pendingPayment.transaction_id,
        job_id: job.id,
        tenant_id: job.tenant_id,
        amount: pendingPayment.amount,
        currency: pendingPayment.currency,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        description: `Payment for ${job.service_type} - Job ${job.job_code}`,
        payment_url: `https://www.athmovil.com/pay?ref=${pendingPayment.transaction_id}`,
        created_at: pendingPayment.created_at,
      };
    } else {
      // Create new payment request
      paymentRequest = await createPaymentRequest(context, {
        job_id: job.id,
        tenant_id: job.tenant_id,
        amount: job.total_amount,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone,
        customer_email: job.customer_email || undefined,
        description: `Payment for ${job.service_type} - Job ${job.job_code}`,
      });
    }

    // Redirect to ATH Móvil payment page
    return redirect(paymentRequest.payment_url || "/");
  } catch (error: any) {
    console.error("Payment link generation error:", error);
    return json(
      {
        error: error.message || "Failed to generate payment link",
      },
      { status: 500 }
    );
  }
}

// POST method to create payment link without redirect (for API usage)
export async function action({ params, context }: LoaderFunctionArgs) {
  const { jobCode } = params;

  if (!jobCode) {
    return json({ error: "Job code required" }, { status: 400 });
  }

  try {
    const job = await getJobByCode(context, jobCode);

    if (job.total_amount <= 0) {
      return json({ error: "No payment required for this job" }, { status: 400 });
    }

    if (job.payment_status === "paid") {
      return json({ error: "This job has already been paid" }, { status: 400 });
    }

    const paymentRequest = await createPaymentRequest(context, {
      job_id: job.id,
      tenant_id: job.tenant_id,
      amount: job.total_amount,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      customer_email: job.customer_email || undefined,
      description: `Payment for ${job.service_type} - Job ${job.job_code}`,
    });

    return json({
      success: true,
      payment: paymentRequest,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return json(
      {
        error: error.message || "Failed to create payment",
      },
      { status: 500 }
    );
  }
}

/**
 * ATH Móvil Integration
 *
 * Payment processing for Puerto Rico market using ATH Móvil,
 * the dominant mobile payment platform in PR.
 *
 * Note: This is a reference implementation. Actual ATH Móvil integration
 * requires merchant account setup and API credentials.
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

export interface ATHMovilConfig {
  merchant_id: string;
  api_key: string;
  api_secret: string;
  environment: "sandbox" | "production";
  callback_url: string;
}

export interface PaymentRequest {
  id: string;
  transaction_id: string;
  job_id: string;
  tenant_id: number;
  amount: number;
  currency: string;
  customer_name: string;
  customer_phone: string;
  description: string;
  payment_url?: string;
  qr_code?: string;
  expires_at: string;
  created_at: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  job_id: string;
  tenant_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  ath_movil_reference: string | null;
  ath_movil_transaction_id: string | null;
  ath_movil_customer_phone: string | null;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  webhook_data: Record<string, any> | null;
  processed_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate unique payment ID
 */
export function generatePaymentId(): string {
  return crypto.randomUUID();
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ATH${timestamp}${random}`.toUpperCase();
}

/**
 * Create payment request for ATH Móvil
 *
 * In production, this would call ATH Móvil API to create a payment request.
 * For now, we create a local record and simulate the payment flow.
 */
export async function createPaymentRequest(
  context: AppLoadContext,
  data: {
    job_id: string;
    tenant_id: number;
    amount: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    description: string;
  }
): Promise<PaymentRequest> {
  const paymentId = generatePaymentId();
  const transactionId = generateTransactionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Insert payment record
  await context.env.DB.prepare(`
    INSERT INTO payments (
      id, transaction_id, job_id, tenant_id, amount, currency,
      payment_method, payment_status, customer_name, customer_email,
      description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      paymentId,
      transactionId,
      data.job_id,
      data.tenant_id,
      data.amount,
      "USD",
      "ath_movil",
      "pending",
      data.customer_name,
      data.customer_email || null,
      data.description,
      now.toISOString(),
      now.toISOString()
    )
    .run();

  // In production, call ATH Móvil API here
  // const athMovilResponse = await callATHMovilAPI(config, paymentData);

  // For now, generate a simulated payment URL
  const baseUrl = "https://www.athmovil.com/pay"; // Production URL
  const paymentUrl = `${baseUrl}?ref=${transactionId}`;

  return {
    id: paymentId,
    transaction_id: transactionId,
    job_id: data.job_id,
    tenant_id: data.tenant_id,
    amount: data.amount,
    currency: "USD",
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    description: data.description,
    payment_url: paymentUrl,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };
}

/**
 * Process ATH Móvil webhook
 *
 * Handles payment notifications from ATH Móvil when payments are completed
 */
export async function processATHMovilWebhook(
  context: AppLoadContext,
  webhookData: {
    transaction_id: string;
    status: string;
    amount: number;
    customer_phone?: string;
    reference?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }
): Promise<Payment> {
  const payment = await context.env.DB.prepare(
    "SELECT * FROM payments WHERE transaction_id = ? OR ath_movil_reference = ?"
  )
    .bind(webhookData.transaction_id, webhookData.reference || "")
    .first<Payment>();

  if (!payment) {
    throw new Error("Payment not found");
  }

  const now = new Date().toISOString();
  const status = mapATHMovilStatus(webhookData.status);

  await context.env.DB.prepare(`
    UPDATE payments SET
      payment_status = ?,
      ath_movil_transaction_id = ?,
      ath_movil_customer_phone = ?,
      ath_movil_reference = ?,
      webhook_data = ?,
      processed_at = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      status,
      webhookData.transaction_id,
      webhookData.customer_phone || null,
      webhookData.reference || null,
      JSON.stringify(webhookData),
      status === "completed" ? now : null,
      now,
      payment.id
    )
    .run();

  // If payment completed, update job payment status
  if (status === "completed") {
    await context.env.DB.prepare(`
      UPDATE jobs SET
        payment_status = 'paid',
        payment_method = 'ath_movil',
        updated_at = ?
      WHERE id = ?
    `)
      .bind(now, payment.job_id)
      .run();
  }

  return getPaymentById(context, payment.id);
}

/**
 * Map ATH Móvil status codes to our internal status
 */
function mapATHMovilStatus(athStatus: string): Payment["payment_status"] {
  const statusMap: Record<string, Payment["payment_status"]> = {
    completed: "completed",
    success: "completed",
    approved: "completed",
    pending: "pending",
    processing: "pending",
    failed: "failed",
    error: "failed",
    cancelled: "failed",
    refunded: "refunded",
  };

  return statusMap[athStatus.toLowerCase()] || "failed";
}

/**
 * Get payment by ID
 */
export async function getPaymentById(
  context: AppLoadContext,
  paymentId: string
): Promise<Payment> {
  const payment = await context.env.DB.prepare(
    "SELECT * FROM payments WHERE id = ?"
  )
    .bind(paymentId)
    .first<Payment>();

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Parse JSON fields
  if (payment.metadata && typeof payment.metadata === "string") {
    payment.metadata = JSON.parse(payment.metadata);
  }
  if (payment.webhook_data && typeof payment.webhook_data === "string") {
    payment.webhook_data = JSON.parse(payment.webhook_data);
  }

  return payment;
}

/**
 * Get payment by transaction ID
 */
export async function getPaymentByTransactionId(
  context: AppLoadContext,
  transactionId: string
): Promise<Payment> {
  const payment = await context.env.DB.prepare(
    "SELECT * FROM payments WHERE transaction_id = ?"
  )
    .bind(transactionId)
    .first<Payment>();

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Parse JSON fields
  if (payment.metadata && typeof payment.metadata === "string") {
    payment.metadata = JSON.parse(payment.metadata);
  }
  if (payment.webhook_data && typeof payment.webhook_data === "string") {
    payment.webhook_data = JSON.parse(payment.webhook_data);
  }

  return payment;
}

/**
 * List payments for a job
 */
export async function listJobPayments(
  context: AppLoadContext,
  jobId: string
): Promise<Payment[]> {
  const results = await context.env.DB.prepare(
    "SELECT * FROM payments WHERE job_id = ? ORDER BY created_at DESC"
  )
    .bind(jobId)
    .all<Payment>();

  return (results.results || []).map((payment) => {
    // Parse JSON fields
    if (payment.metadata && typeof payment.metadata === "string") {
      payment.metadata = JSON.parse(payment.metadata);
    }
    if (payment.webhook_data && typeof payment.webhook_data === "string") {
      payment.webhook_data = JSON.parse(payment.webhook_data);
    }
    return payment;
  });
}

/**
 * List payments for a tenant
 */
export async function listTenantPayments(
  context: AppLoadContext,
  tenantId: number,
  filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
  }
): Promise<Payment[]> {
  let query = "SELECT * FROM payments WHERE tenant_id = ?";
  const bindings: any[] = [tenantId];

  if (filters?.status) {
    query += " AND payment_status = ?";
    bindings.push(filters.status);
  }

  if (filters?.date_from) {
    query += " AND created_at >= ?";
    bindings.push(filters.date_from);
  }

  if (filters?.date_to) {
    query += " AND created_at <= ?";
    bindings.push(filters.date_to);
  }

  query += " ORDER BY created_at DESC";

  const results = await context.env.DB.prepare(query)
    .bind(...bindings)
    .all<Payment>();

  return (results.results || []).map((payment) => {
    // Parse JSON fields
    if (payment.metadata && typeof payment.metadata === "string") {
      payment.metadata = JSON.parse(payment.metadata);
    }
    if (payment.webhook_data && typeof payment.webhook_data === "string") {
      payment.webhook_data = JSON.parse(payment.webhook_data);
    }
    return payment;
  });
}

/**
 * Process refund
 */
export async function processRefund(
  context: AppLoadContext,
  paymentId: string,
  reason: string
): Promise<Payment> {
  const payment = await getPaymentById(context, paymentId);

  if (payment.payment_status !== "completed") {
    throw new Error("Can only refund completed payments");
  }

  const now = new Date().toISOString();

  // In production, call ATH Móvil refund API here
  // const refundResponse = await callATHMovilRefundAPI(payment);

  await context.env.DB.prepare(`
    UPDATE payments SET
      payment_status = 'refunded',
      refunded_at = ?,
      refund_reason = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(now, reason, now, paymentId)
    .run();

  // Update job payment status
  await context.env.DB.prepare(`
    UPDATE jobs SET
      payment_status = 'refunded',
      updated_at = ?
    WHERE id = ?
  `)
    .bind(now, payment.job_id)
    .run();

  return getPaymentById(context, paymentId);
}

/**
 * Record manual payment (cash, card, check)
 */
export async function recordManualPayment(
  context: AppLoadContext,
  data: {
    job_id: string;
    tenant_id: number;
    amount: number;
    payment_method: "cash" | "card" | "check";
    customer_name: string;
    customer_email?: string;
    description?: string;
    metadata?: Record<string, any>;
  }
): Promise<Payment> {
  const paymentId = generatePaymentId();
  const transactionId = generateTransactionId();
  const now = new Date().toISOString();

  await context.env.DB.prepare(`
    INSERT INTO payments (
      id, transaction_id, job_id, tenant_id, amount, currency,
      payment_method, payment_status, customer_name, customer_email,
      description, metadata, processed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      paymentId,
      transactionId,
      data.job_id,
      data.tenant_id,
      data.amount,
      "USD",
      data.payment_method,
      "completed",
      data.customer_name,
      data.customer_email || null,
      data.description || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now,
      now,
      now
    )
    .run();

  // Update job payment status
  await context.env.DB.prepare(`
    UPDATE jobs SET
      payment_status = 'paid',
      payment_method = ?,
      total_amount = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(data.payment_method, data.amount, now, data.job_id)
    .run();

  return getPaymentById(context, paymentId);
}

/**
 * Get payment statistics for a tenant
 */
export async function getPaymentStats(
  context: AppLoadContext,
  tenantId: number
): Promise<{
  total_payments: number;
  total_revenue: number;
  pending_amount: number;
  refunded_amount: number;
  ath_movil_revenue: number;
  cash_revenue: number;
  card_revenue: number;
}> {
  const stats = await context.env.DB.prepare(`
    SELECT
      COUNT(*) as total_payments,
      SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN payment_status = 'refunded' THEN amount ELSE 0 END) as refunded_amount,
      SUM(CASE WHEN payment_method = 'ath_movil' AND payment_status = 'completed' THEN amount ELSE 0 END) as ath_movil_revenue,
      SUM(CASE WHEN payment_method = 'cash' AND payment_status = 'completed' THEN amount ELSE 0 END) as cash_revenue,
      SUM(CASE WHEN payment_method = 'card' AND payment_status = 'completed' THEN amount ELSE 0 END) as card_revenue
    FROM payments WHERE tenant_id = ?
  `)
    .bind(tenantId)
    .first<any>();

  return {
    total_payments: stats?.total_payments || 0,
    total_revenue: stats?.total_revenue || 0,
    pending_amount: stats?.pending_amount || 0,
    refunded_amount: stats?.refunded_amount || 0,
    ath_movil_revenue: stats?.ath_movil_revenue || 0,
    cash_revenue: stats?.cash_revenue || 0,
    card_revenue: stats?.card_revenue || 0,
  };
}

/**
 * Verify webhook signature (for security)
 *
 * In production, ATH Móvil signs webhook payloads with a secret.
 * This function would verify the signature to ensure the webhook is authentic.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBuffer = hexToBuffer(signature);
    const dataBuffer = encoder.encode(payload);

    return await crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Job Tracking System
 *
 * Handles job creation, status updates, and customer portal access
 * with unique 6-character codes for easy sharing and tracking.
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

export interface Job {
  id: string;
  job_code: string;
  tenant_id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  customer_lat: number | null;
  customer_lng: number | null;
  service_type: string;
  service_description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  estimated_duration_minutes: number | null;
  technician_id: string | null;
  total_amount: number;
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  payment_method: string | null;
  notes: string | null;
  internal_notes: string | null;
  photos_urls: string[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface JobStatusHistoryEntry {
  id: number;
  job_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_type: "system" | "technician" | "customer" | "admin";
  notes: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
}

export interface CreateJobInput {
  tenant_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  customer_lat?: number;
  customer_lng?: number;
  service_type: string;
  service_description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  estimated_duration_minutes?: number;
  notes?: string;
}

export interface UpdateJobInput {
  status?: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  technician_id?: string;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  total_amount?: number;
  payment_status?: "unpaid" | "pending" | "paid" | "refunded";
  payment_method?: string;
  notes?: string;
  internal_notes?: string;
  photos_urls?: string[];
}

/**
 * Generate a unique 6-character job code
 * Format: UPPERCASE letters and numbers, no ambiguous characters (0, O, I, 1)
 */
export function generateJobCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate unique job ID (UUID v4 format)
 */
export function generateJobId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new job
 */
export async function createJob(
  context: AppLoadContext,
  input: CreateJobInput
): Promise<Job> {
  const jobId = generateJobId();
  let jobCode = generateJobCode();

  // Ensure job code is unique
  let attempts = 0;
  while (attempts < 10) {
    const existing = await context.env.DB.prepare(
      "SELECT id FROM jobs WHERE job_code = ?"
    )
      .bind(jobCode)
      .first();

    if (!existing) break;
    jobCode = generateJobCode();
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error("Failed to generate unique job code");
  }

  const now = new Date().toISOString();

  await context.env.DB.prepare(`
    INSERT INTO jobs (
      id, job_code, tenant_id, customer_name, customer_email, customer_phone,
      customer_address, customer_city, customer_state, customer_zip,
      customer_lat, customer_lng, service_type, service_description,
      priority, status, scheduled_date, scheduled_time_start, scheduled_time_end,
      estimated_duration_minutes, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      jobId,
      jobCode,
      input.tenant_id,
      input.customer_name,
      input.customer_email || null,
      input.customer_phone,
      input.customer_address,
      input.customer_city,
      input.customer_state,
      input.customer_zip,
      input.customer_lat || null,
      input.customer_lng || null,
      input.service_type,
      input.service_description || null,
      input.priority || "normal",
      "pending",
      input.scheduled_date || null,
      input.scheduled_time_start || null,
      input.scheduled_time_end || null,
      input.estimated_duration_minutes || null,
      input.notes || null,
      now,
      now
    )
    .run();

  // Record initial status in history
  await recordStatusChange(context, {
    job_id: jobId,
    previous_status: null,
    new_status: "pending",
    changed_by: "system",
    changed_by_type: "system",
    notes: "Job created",
  });

  return getJobById(context, jobId);
}

/**
 * Get job by ID
 */
export async function getJobById(
  context: AppLoadContext,
  jobId: string
): Promise<Job> {
  const job = await context.env.DB.prepare(
    "SELECT * FROM jobs WHERE id = ?"
  )
    .bind(jobId)
    .first<Job>();

  if (!job) {
    throw new Error("Job not found");
  }

  // Parse JSON fields
  if (job.photos_urls && typeof job.photos_urls === "string") {
    job.photos_urls = JSON.parse(job.photos_urls);
  }

  return job;
}

/**
 * Get job by job code (for customer portal)
 */
export async function getJobByCode(
  context: AppLoadContext,
  jobCode: string
): Promise<Job> {
  const job = await context.env.DB.prepare(
    "SELECT * FROM jobs WHERE job_code = ?"
  )
    .bind(jobCode.toUpperCase())
    .first<Job>();

  if (!job) {
    throw new Error("Job not found");
  }

  // Parse JSON fields
  if (job.photos_urls && typeof job.photos_urls === "string") {
    job.photos_urls = JSON.parse(job.photos_urls);
  }

  return job;
}

/**
 * Update job
 */
export async function updateJob(
  context: AppLoadContext,
  jobId: string,
  input: UpdateJobInput,
  changedBy?: string,
  changedByType?: "system" | "technician" | "customer" | "admin"
): Promise<Job> {
  const job = await getJobById(context, jobId);
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  if (input.status !== undefined) {
    updates.push("status = ?");
    values.push(input.status);

    // Record status change
    await recordStatusChange(context, {
      job_id: jobId,
      previous_status: job.status,
      new_status: input.status,
      changed_by: changedBy || null,
      changed_by_type: changedByType || "system",
    });

    // If status is completed, record completion time
    if (input.status === "completed") {
      updates.push("completed_at = ?");
      values.push(now);
    }
  }

  if (input.technician_id !== undefined) {
    updates.push("technician_id = ?");
    values.push(input.technician_id);
  }

  if (input.scheduled_date !== undefined) {
    updates.push("scheduled_date = ?");
    values.push(input.scheduled_date);
  }

  if (input.scheduled_time_start !== undefined) {
    updates.push("scheduled_time_start = ?");
    values.push(input.scheduled_time_start);
  }

  if (input.scheduled_time_end !== undefined) {
    updates.push("scheduled_time_end = ?");
    values.push(input.scheduled_time_end);
  }

  if (input.total_amount !== undefined) {
    updates.push("total_amount = ?");
    values.push(input.total_amount);
  }

  if (input.payment_status !== undefined) {
    updates.push("payment_status = ?");
    values.push(input.payment_status);
  }

  if (input.payment_method !== undefined) {
    updates.push("payment_method = ?");
    values.push(input.payment_method);
  }

  if (input.notes !== undefined) {
    updates.push("notes = ?");
    values.push(input.notes);
  }

  if (input.internal_notes !== undefined) {
    updates.push("internal_notes = ?");
    values.push(input.internal_notes);
  }

  if (input.photos_urls !== undefined) {
    updates.push("photos_urls = ?");
    values.push(JSON.stringify(input.photos_urls));
  }

  if (updates.length === 0) {
    return job;
  }

  updates.push("updated_at = ?");
  values.push(now);

  values.push(jobId);

  await context.env.DB.prepare(`
    UPDATE jobs SET ${updates.join(", ")} WHERE id = ?
  `)
    .bind(...values)
    .run();

  return getJobById(context, jobId);
}

/**
 * Record status change in history
 */
export async function recordStatusChange(
  context: AppLoadContext,
  data: {
    job_id: string;
    previous_status: string | null;
    new_status: string;
    changed_by: string | null;
    changed_by_type: "system" | "technician" | "customer" | "admin";
    notes?: string;
    location_lat?: number;
    location_lng?: number;
  }
): Promise<void> {
  await context.env.DB.prepare(`
    INSERT INTO job_status_history (
      job_id, previous_status, new_status, changed_by, changed_by_type,
      notes, location_lat, location_lng
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      data.job_id,
      data.previous_status,
      data.new_status,
      data.changed_by,
      data.changed_by_type,
      data.notes || null,
      data.location_lat || null,
      data.location_lng || null
    )
    .run();
}

/**
 * Get job status history
 */
export async function getJobHistory(
  context: AppLoadContext,
  jobId: string
): Promise<JobStatusHistoryEntry[]> {
  const results = await context.env.DB.prepare(
    "SELECT * FROM job_status_history WHERE job_id = ? ORDER BY created_at ASC"
  )
    .bind(jobId)
    .all<JobStatusHistoryEntry>();

  return results.results || [];
}

/**
 * List jobs for a tenant
 */
export async function listJobs(
  context: AppLoadContext,
  tenantId: number,
  filters?: {
    status?: string;
    technician_id?: string;
    date_from?: string;
    date_to?: string;
  }
): Promise<Job[]> {
  let query = "SELECT * FROM jobs WHERE tenant_id = ?";
  const bindings: any[] = [tenantId];

  if (filters?.status) {
    query += " AND status = ?";
    bindings.push(filters.status);
  }

  if (filters?.technician_id) {
    query += " AND technician_id = ?";
    bindings.push(filters.technician_id);
  }

  if (filters?.date_from) {
    query += " AND scheduled_date >= ?";
    bindings.push(filters.date_from);
  }

  if (filters?.date_to) {
    query += " AND scheduled_date <= ?";
    bindings.push(filters.date_to);
  }

  query += " ORDER BY scheduled_date DESC, created_at DESC";

  const results = await context.env.DB.prepare(query)
    .bind(...bindings)
    .all<Job>();

  return (results.results || []).map((job) => {
    // Parse JSON fields
    if (job.photos_urls && typeof job.photos_urls === "string") {
      job.photos_urls = JSON.parse(job.photos_urls);
    }
    return job;
  });
}

/**
 * Get job statistics for a tenant
 */
export async function getJobStats(
  context: AppLoadContext,
  tenantId: number
): Promise<{
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_revenue: number;
  pending_payment: number;
}> {
  const stats = await context.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN payment_status IN ('unpaid', 'pending') THEN total_amount ELSE 0 END) as pending_payment
    FROM jobs WHERE tenant_id = ?
  `)
    .bind(tenantId)
    .first<any>();

  return {
    total: stats?.total || 0,
    pending: stats?.pending || 0,
    assigned: stats?.assigned || 0,
    in_progress: stats?.in_progress || 0,
    completed: stats?.completed || 0,
    cancelled: stats?.cancelled || 0,
    total_revenue: stats?.total_revenue || 0,
    pending_payment: stats?.pending_payment || 0,
  };
}

/**
 * Get customer-safe job data (excludes internal notes and sensitive info)
 */
export function getCustomerJobData(job: Job) {
  return {
    job_code: job.job_code,
    customer_name: job.customer_name,
    customer_address: job.customer_address,
    customer_city: job.customer_city,
    service_type: job.service_type,
    service_description: job.service_description,
    priority: job.priority,
    status: job.status,
    scheduled_date: job.scheduled_date,
    scheduled_time_start: job.scheduled_time_start,
    scheduled_time_end: job.scheduled_time_end,
    total_amount: job.total_amount,
    payment_status: job.payment_status,
    notes: job.notes,
    photos_urls: job.photos_urls,
    created_at: job.created_at,
    updated_at: job.updated_at,
    completed_at: job.completed_at,
  };
}

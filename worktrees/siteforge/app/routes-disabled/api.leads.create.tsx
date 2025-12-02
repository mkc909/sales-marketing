/**
 * Lead Capture API Route
 * POST /api/leads/create
 * Body: { name, phone, email, message, professional_id, source }
 * Returns: { success: true, lead_id: "..." }
 */

import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { ErrorTracker, ErrorLevel, ErrorCategory } from "~/lib/error-tracking";

interface LeadData {
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  professional_id?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const tracker = new ErrorTracker(context);

  if (request.method !== "POST") {
    return json(
      { success: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    // Parse request body
    const formData = await request.formData();
    const leadData: LeadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      message: formData.get("message") as string || undefined,
      professional_id: formData.get("professional_id") as string || undefined,
      source: formData.get("source") as string || "website",
    };

    // Validate required fields
    if (!leadData.name || leadData.name.trim() === "") {
      await tracker.logValidationError("name", leadData.name, "Name is required");
      return json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // At least phone or email required
    if (!leadData.phone && !leadData.email) {
      await tracker.logValidationError(
        "contact",
        "none",
        "Either phone or email is required"
      );
      return json(
        { success: false, error: "Either phone or email is required" },
        { status: 400 }
      );
    }

    // Basic phone validation (if provided)
    if (leadData.phone) {
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(leadData.phone)) {
        await tracker.logValidationError(
          "phone",
          leadData.phone,
          "Invalid phone format"
        );
        return json(
          { success: false, error: "Invalid phone number format" },
          { status: 400 }
        );
      }
    }

    // Basic email validation (if provided)
    if (leadData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadData.email)) {
        await tracker.logValidationError(
          "email",
          leadData.email,
          "Invalid email format"
        );
        return json(
          { success: false, error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Get IP and user agent for tracking
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";

    // Insert lead into database
    const result = await context.env.DB.prepare(`
      INSERT INTO leads (
        name,
        phone,
        email,
        message,
        professional_id,
        source,
        ip_address,
        user_agent,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `)
      .bind(
        leadData.name.trim(),
        leadData.phone || null,
        leadData.email || null,
        leadData.message || null,
        leadData.professional_id || null,
        leadData.source,
        ip,
        userAgent,
        Date.now()
      )
      .run();

    const leadId = `lead_${result.meta.last_row_id}`;

    // Track lead in analytics (if available)
    try {
      await context.env.DB.prepare(`
        INSERT INTO lead_analytics (
          lead_id,
          professional_id,
          source,
          created_at
        ) VALUES (?, ?, ?, ?)
      `).bind(
        leadId,
        leadData.professional_id || null,
        leadData.source,
        Date.now()
      ).run();
    } catch (analyticsError) {
      // Log but don't fail if analytics insert fails
      console.warn("Failed to track lead analytics:", analyticsError);
    }

    // TODO: Send notification to professional (email/SMS)
    // TODO: Add to CRM webhook if configured

    return json({
      success: true,
      lead_id: leadId,
      message: "Lead captured successfully",
      next_steps: leadData.professional_id
        ? "The professional will contact you within 24 hours"
        : "We'll match you with the best professionals in your area",
    });

  } catch (error) {
    await tracker.logError(
      error as Error,
      ErrorLevel.ERROR,
      ErrorCategory.DATABASE,
      { action: "create_lead" }
    );

    return json(
      {
        success: false,
        error: "Failed to capture lead",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Reject GET requests
export async function loader() {
  return json(
    { success: false, error: "Use POST method to create leads" },
    { status: 405 }
  );
}

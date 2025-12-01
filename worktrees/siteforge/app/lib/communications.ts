/**
 * Customer Communication System
 *
 * Multi-channel messaging for job updates: SMS, WhatsApp, Email
 * Supports bilingual messaging (English/Spanish) for Puerto Rico market
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

export interface CommunicationMessage {
  id: number;
  job_id: string;
  communication_type: "sms" | "whatsapp" | "email" | "internal_note";
  direction: "inbound" | "outbound";
  recipient: string | null;
  sender: string | null;
  subject: string | null;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  external_id: string | null;
  metadata: Record<string, any> | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageInput {
  job_id: string;
  type: "sms" | "whatsapp" | "email";
  recipient: string;
  message: string;
  subject?: string;
  metadata?: Record<string, any>;
}

export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  phone_number: string;
  whatsapp_number: string;
}

/**
 * Message Templates (Bilingual)
 */
export const messageTemplates = {
  job_created: {
    en: {
      subject: "Service Request Confirmed - Job {job_code}",
      sms: "Your service request {job_code} has been confirmed. Track your job at: {tracking_url}",
      email: `Hello {customer_name},

Your service request has been confirmed!

Job Code: {job_code}
Service: {service_type}
Scheduled: {scheduled_date} at {scheduled_time}

Track your job anytime at: {tracking_url}

Thank you for choosing us!`,
    },
    es: {
      subject: "Solicitud de Servicio Confirmada - Trabajo {job_code}",
      sms: "Su solicitud de servicio {job_code} ha sido confirmada. Rastree su trabajo en: {tracking_url}",
      email: `Hola {customer_name},

¡Su solicitud de servicio ha sido confirmada!

Código de Trabajo: {job_code}
Servicio: {service_type}
Programado: {scheduled_date} a las {scheduled_time}

Rastree su trabajo en cualquier momento en: {tracking_url}

¡Gracias por elegirnos!`,
    },
  },
  technician_assigned: {
    en: {
      subject: "Technician Assigned - Job {job_code}",
      sms: "Good news! {technician_name} has been assigned to your job {job_code}. Scheduled for {scheduled_date} at {scheduled_time}.",
      email: `Hello {customer_name},

Great news! We've assigned a technician to your service request.

Technician: {technician_name}
Phone: {technician_phone}
Scheduled: {scheduled_date} at {scheduled_time}

Your technician will arrive during your scheduled time window.

Track your job: {tracking_url}`,
    },
    es: {
      subject: "Técnico Asignado - Trabajo {job_code}",
      sms: "¡Buenas noticias! {technician_name} ha sido asignado a su trabajo {job_code}. Programado para {scheduled_date} a las {scheduled_time}.",
      email: `Hola {customer_name},

¡Buenas noticias! Hemos asignado un técnico a su solicitud de servicio.

Técnico: {technician_name}
Teléfono: {technician_phone}
Programado: {scheduled_date} a las {scheduled_time}

Su técnico llegará durante su ventana de tiempo programada.

Rastree su trabajo: {tracking_url}`,
    },
  },
  technician_on_way: {
    en: {
      subject: "Technician On The Way - Job {job_code}",
      sms: "{technician_name} is on the way to your location! ETA: {eta} minutes. Job {job_code}",
      whatsapp: "🚗 {technician_name} is heading your way!\n\nETA: {eta} minutes\nJob: {job_code}\n\nTrack in real-time: {tracking_url}",
    },
    es: {
      subject: "Técnico en Camino - Trabajo {job_code}",
      sms: "¡{technician_name} está en camino a su ubicación! Tiempo estimado: {eta} minutos. Trabajo {job_code}",
      whatsapp: "🚗 ¡{technician_name} está en camino!\n\nTiempo estimado: {eta} minutos\nTrabajo: {job_code}\n\nRastree en tiempo real: {tracking_url}",
    },
  },
  job_started: {
    en: {
      subject: "Service Started - Job {job_code}",
      sms: "Your service has started! {technician_name} is now working on your {service_type}. Job {job_code}",
    },
    es: {
      subject: "Servicio Iniciado - Trabajo {job_code}",
      sms: "¡Su servicio ha comenzado! {technician_name} está trabajando en su {service_type}. Trabajo {job_code}",
    },
  },
  job_completed: {
    en: {
      subject: "Service Completed - Job {job_code}",
      sms: "Your service is complete! Total: ${total_amount}. Pay with ATH Móvil: {payment_url}",
      email: `Hello {customer_name},

Your service has been completed successfully!

Service: {service_type}
Completed: {completed_at}
Total Amount: ${total_amount}

Payment Options:
• ATH Móvil: {payment_url}
• Cash
• Card

Thank you for your business!

View details: {tracking_url}`,
    },
    es: {
      subject: "Servicio Completado - Trabajo {job_code}",
      sms: "¡Su servicio está completo! Total: ${total_amount}. Pague con ATH Móvil: {payment_url}",
      email: `Hola {customer_name},

¡Su servicio se ha completado exitosamente!

Servicio: {service_type}
Completado: {completed_at}
Monto Total: ${total_amount}

Opciones de Pago:
• ATH Móvil: {payment_url}
• Efectivo
• Tarjeta

¡Gracias por su negocio!

Ver detalles: {tracking_url}`,
    },
  },
  payment_received: {
    en: {
      subject: "Payment Received - Job {job_code}",
      sms: "Payment of ${amount} received via {payment_method}. Thank you! Job {job_code}",
    },
    es: {
      subject: "Pago Recibido - Trabajo {job_code}",
      sms: "Pago de ${amount} recibido vía {payment_method}. ¡Gracias! Trabajo {job_code}",
    },
  },
  schedule_reminder: {
    en: {
      subject: "Service Reminder - Tomorrow {scheduled_time}",
      sms: "Reminder: Your {service_type} service is scheduled for tomorrow at {scheduled_time}. Job {job_code}",
    },
    es: {
      subject: "Recordatorio de Servicio - Mañana {scheduled_time}",
      sms: "Recordatorio: Su servicio de {service_type} está programado para mañana a las {scheduled_time}. Trabajo {job_code}",
    },
  },
};

/**
 * Replace template variables with actual data
 */
export function fillTemplate(
  template: string,
  data: Record<string, any>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, "g"), String(value || ""));
  }
  return result;
}

/**
 * Send message (SMS, WhatsApp, or Email)
 */
export async function sendMessage(
  context: AppLoadContext,
  input: SendMessageInput
): Promise<CommunicationMessage> {
  const now = new Date().toISOString();

  // Insert communication record
  const result = await context.env.DB.prepare(`
    INSERT INTO job_communications (
      job_id, communication_type, direction, recipient, sender,
      subject, message, status, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id
  `)
    .bind(
      input.job_id,
      input.type,
      "outbound",
      input.recipient,
      null, // sender filled by actual service
      input.subject || null,
      input.message,
      "pending",
      input.metadata ? JSON.stringify(input.metadata) : null,
      now
    )
    .first<{ id: number }>();

  const messageId = result?.id;

  if (!messageId) {
    throw new Error("Failed to create communication record");
  }

  try {
    let externalId: string | null = null;

    // Send via appropriate channel
    switch (input.type) {
      case "sms":
        externalId = await sendSMS(context, input.recipient, input.message);
        break;
      case "whatsapp":
        externalId = await sendWhatsApp(context, input.recipient, input.message);
        break;
      case "email":
        externalId = await sendEmail(
          context,
          input.recipient,
          input.subject || "Service Update",
          input.message
        );
        break;
    }

    // Update with external ID and sent status
    await context.env.DB.prepare(`
      UPDATE job_communications SET
        status = 'sent',
        external_id = ?,
        sent_at = ?
      WHERE id = ?
    `)
      .bind(externalId, now, messageId)
      .run();
  } catch (error: any) {
    // Update with error
    await context.env.DB.prepare(`
      UPDATE job_communications SET
        status = 'failed',
        error_message = ?
      WHERE id = ?
    `)
      .bind(error.message, messageId)
      .run();

    throw error;
  }

  return getCommunicationById(context, messageId);
}

/**
 * Send SMS via Twilio
 *
 * In production, this requires Twilio credentials in environment variables
 */
async function sendSMS(
  context: AppLoadContext,
  to: string,
  message: string
): Promise<string> {
  // Check for Twilio credentials in environment
  const accountSid = context.env.TWILIO_ACCOUNT_SID;
  const authToken = context.env.TWILIO_AUTH_TOKEN;
  const fromNumber = context.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured, SMS not sent");
    return `SIMULATED-SMS-${Date.now()}`;
  }

  try {
    // Twilio API call
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${error}`);
    }

    const data = await response.json<any>();
    return data.sid;
  } catch (error) {
    console.error("SMS send failed:", error);
    throw error;
  }
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsApp(
  context: AppLoadContext,
  to: string,
  message: string
): Promise<string> {
  const accountSid = context.env.TWILIO_ACCOUNT_SID;
  const authToken = context.env.TWILIO_AUTH_TOKEN;
  const fromNumber = context.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio WhatsApp credentials not configured, message not sent");
    return `SIMULATED-WHATSAPP-${Date.now()}`;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${fromNumber}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio WhatsApp API error: ${error}`);
    }

    const data = await response.json<any>();
    return data.sid;
  } catch (error) {
    console.error("WhatsApp send failed:", error);
    throw error;
  }
}

/**
 * Send Email
 *
 * In production, use Cloudflare Email Workers or external service
 */
async function sendEmail(
  context: AppLoadContext,
  to: string,
  subject: string,
  message: string
): Promise<string> {
  // For now, simulate email sending
  console.log("Email would be sent:", { to, subject, message });
  return `SIMULATED-EMAIL-${Date.now()}`;

  // In production, integrate with email service:
  // - Cloudflare Email Workers
  // - SendGrid
  // - Mailgun
  // - AWS SES
}

/**
 * Send templated message
 */
export async function sendTemplatedMessage(
  context: AppLoadContext,
  data: {
    job_id: string;
    template_key: keyof typeof messageTemplates;
    type: "sms" | "whatsapp" | "email";
    recipient: string;
    language: "en" | "es";
    variables: Record<string, any>;
  }
): Promise<CommunicationMessage> {
  const template = messageTemplates[data.template_key]?.[data.language];

  if (!template) {
    throw new Error(`Template not found: ${data.template_key} (${data.language})`);
  }

  const messageText =
    data.type === "email"
      ? template.email || template.sms
      : data.type === "whatsapp"
      ? template.whatsapp || template.sms
      : template.sms;

  const subject = template.subject;

  const filledMessage = fillTemplate(messageText, data.variables);
  const filledSubject = subject ? fillTemplate(subject, data.variables) : undefined;

  return sendMessage(context, {
    job_id: data.job_id,
    type: data.type,
    recipient: data.recipient,
    message: filledMessage,
    subject: filledSubject,
    metadata: {
      template_key: data.template_key,
      language: data.language,
    },
  });
}

/**
 * Get communication by ID
 */
export async function getCommunicationById(
  context: AppLoadContext,
  id: number
): Promise<CommunicationMessage> {
  const comm = await context.env.DB.prepare(
    "SELECT * FROM job_communications WHERE id = ?"
  )
    .bind(id)
    .first<CommunicationMessage>();

  if (!comm) {
    throw new Error("Communication not found");
  }

  // Parse JSON fields
  if (comm.metadata && typeof comm.metadata === "string") {
    comm.metadata = JSON.parse(comm.metadata);
  }

  return comm;
}

/**
 * List communications for a job
 */
export async function listJobCommunications(
  context: AppLoadContext,
  jobId: string
): Promise<CommunicationMessage[]> {
  const results = await context.env.DB.prepare(
    "SELECT * FROM job_communications WHERE job_id = ? ORDER BY created_at DESC"
  )
    .bind(jobId)
    .all<CommunicationMessage>();

  return (results.results || []).map((comm) => {
    // Parse JSON fields
    if (comm.metadata && typeof comm.metadata === "string") {
      comm.metadata = JSON.parse(comm.metadata);
    }
    return comm;
  });
}

/**
 * Update communication status (for webhooks)
 */
export async function updateCommunicationStatus(
  context: AppLoadContext,
  externalId: string,
  status: "delivered" | "failed" | "read",
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  const updates: string[] = ["status = ?"];
  const values: any[] = [status];

  if (status === "delivered") {
    updates.push("delivered_at = ?");
    values.push(now);
  } else if (status === "read") {
    updates.push("read_at = ?");
    values.push(now);
  }

  if (errorMessage) {
    updates.push("error_message = ?");
    values.push(errorMessage);
  }

  values.push(externalId);

  await context.env.DB.prepare(`
    UPDATE job_communications SET ${updates.join(", ")}
    WHERE external_id = ?
  `)
    .bind(...values)
    .run();
}

/**
 * Get communication statistics
 */
export async function getCommunicationStats(
  context: AppLoadContext,
  jobId: string
): Promise<{
  total: number;
  sms: number;
  whatsapp: number;
  email: number;
  sent: number;
  delivered: number;
  failed: number;
}> {
  const stats = await context.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN communication_type = 'sms' THEN 1 ELSE 0 END) as sms,
      SUM(CASE WHEN communication_type = 'whatsapp' THEN 1 ELSE 0 END) as whatsapp,
      SUM(CASE WHEN communication_type = 'email' THEN 1 ELSE 0 END) as email,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM job_communications WHERE job_id = ?
  `)
    .bind(jobId)
    .first<any>();

  return {
    total: stats?.total || 0,
    sms: stats?.sms || 0,
    whatsapp: stats?.whatsapp || 0,
    email: stats?.email || 0,
    sent: stats?.sent || 0,
    delivered: stats?.delivered || 0,
    failed: stats?.failed || 0,
  };
}

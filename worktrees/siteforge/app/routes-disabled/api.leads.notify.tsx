/**
 * API Route: Lead Notification Service
 * Sends SMS/Email notifications when new leads are captured
 * Processes leads from KV queue (ANALYTICS_BUFFER)
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

interface LeadNotification {
  name: string;
  phone: string;
  email: string;
  message: string;
  service: string;
  businessId: string;
  industry: string;
  city: string;
  emergency: boolean;
  timestamp: string;
  source: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Verify this is a scheduled or authorized request
  const authHeader = request.headers.get('Authorization');
  const cronHeader = request.headers.get('Cron');

  // Allow cron jobs or requests with valid auth token
  if (!cronHeader && authHeader !== `Bearer ${context.env.API_SECRET || 'dev-secret'}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process leads from KV queue
    const leads = await processLeadQueue(context);

    // Send notifications for each lead
    const results = await Promise.allSettled(
      leads.map(lead => sendNotifications(lead, context))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return json({
      success: true,
      processed: leads.length,
      successful,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lead notification error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Process leads from KV queue
 */
async function processLeadQueue(context: any): Promise<LeadNotification[]> {
  const leads: LeadNotification[] = [];
  const kv = context.env.ANALYTICS_BUFFER;

  // List all lead keys (they're prefixed with "lead:")
  const { keys } = await kv.list({ prefix: 'lead:' });

  for (const key of keys) {
    try {
      const leadDataStr = await kv.get(key.name);
      if (leadDataStr) {
        const leadData = JSON.parse(leadDataStr);
        leads.push(leadData);

        // Delete from queue after processing
        await kv.delete(key.name);
      }
    } catch (error) {
      console.error(`Failed to process lead ${key.name}:`, error);
    }
  }

  return leads;
}

/**
 * Send SMS and Email notifications for a lead
 */
async function sendNotifications(lead: LeadNotification, context: any): Promise<void> {
  // Get business contact info
  const business = await getBusinessInfo(lead.businessId, context);

  if (!business) {
    console.warn(`Business not found: ${lead.businessId}`);
    return;
  }

  // Prepare notification messages
  const smsMessage = formatSMSMessage(lead, business);
  const emailSubject = formatEmailSubject(lead, business);
  const emailBody = formatEmailBody(lead, business);

  // Send SMS (if business has phone)
  if (business.phone) {
    await sendSMS(business.phone, smsMessage, context);
  }

  // Send Email (if business has email)
  if (business.email) {
    await sendEmail(business.email, emailSubject, emailBody, context);
  }

  // Also send to platform admin if emergency
  if (lead.emergency) {
    const adminPhone = context.env.ADMIN_PHONE || '';
    const adminEmail = context.env.ADMIN_EMAIL || '';

    if (adminPhone) {
      await sendSMS(adminPhone, `🚨 EMERGENCY LEAD: ${smsMessage}`, context);
    }
    if (adminEmail) {
      await sendEmail(
        adminEmail,
        `🚨 Emergency Lead: ${lead.industry} in ${lead.city}`,
        `Emergency lead notification:\n\n${emailBody}`,
        context
      );
    }
  }
}

/**
 * Get business information from database
 */
async function getBusinessInfo(businessId: string, context: any) {
  if (!businessId || businessId.startsWith('ghost-')) {
    // Ghost profile - no real business yet
    return null;
  }

  try {
    const db = context.env.DB;
    const business = await db.prepare(`
      SELECT id, business_name, phone, email, industry
      FROM professionals
      WHERE id = ?
      LIMIT 1
    `).bind(businessId).first();

    return business;
  } catch (error) {
    console.error('Failed to get business info:', error);
    return null;
  }
}

/**
 * Format SMS message
 */
function formatSMSMessage(lead: LeadNotification, business: any): string {
  const emergency = lead.emergency ? '🚨 EMERGENCY ' : '';
  return `${emergency}New Lead! ${lead.name} (${lead.phone}) interested in ${lead.service || 'your services'}. ${lead.message ? `Message: ${lead.message.substring(0, 100)}` : ''} Reply ASAP!`;
}

/**
 * Format Email subject
 */
function formatEmailSubject(lead: LeadNotification, business: any): string {
  const emergency = lead.emergency ? '🚨 EMERGENCY - ' : '';
  return `${emergency}New Lead from ${lead.source === 'instant_quote' ? 'Instant Quote' : 'Contact Form'} - ${lead.name}`;
}

/**
 * Format Email body
 */
function formatEmailBody(lead: LeadNotification, business: any): string {
  return `
New Lead Received!

${lead.emergency ? '⚠️ THIS IS AN EMERGENCY REQUEST\n' : ''}
Contact Information:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Email: ${lead.email || 'Not provided'}

Service Details:
- Service: ${lead.service || 'Not specified'}
- Industry: ${lead.industry}
- City: ${lead.city}

Message:
${lead.message || 'No message provided'}

Lead Source: ${lead.source === 'instant_quote' ? 'Instant Quote Form' : 'Contact Form'}
Received: ${new Date(lead.timestamp).toLocaleString()}

${lead.emergency ? '\n⚠️ URGENT: Please respond immediately!\n' : '\nPlease respond within 15 minutes for best conversion rates.'}

---
EstateFlow Multi-Industry Platform
https://estateflow.com
  `.trim();
}

/**
 * Send SMS using Cloudflare Workers AI or external API
 * Note: Requires SMS API integration (Twilio, Vonage, etc.)
 */
async function sendSMS(to: string, message: string, context: any): Promise<void> {
  // TODO: Integrate with actual SMS provider
  // Example for Twilio:

  const twilioAccountSid = context.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = context.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = context.env.TWILIO_PHONE_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log('[SMS] Not configured, skipping:', { to, message });
    return;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.status}`);
    }

    console.log('[SMS] Sent successfully to:', to);
  } catch (error) {
    console.error('[SMS] Send failed:', error);
    throw error;
  }
}

/**
 * Send Email using Cloudflare Email Workers or external API
 * Note: Requires email service integration
 */
async function sendEmail(to: string, subject: string, body: string, context: any): Promise<void> {
  // TODO: Integrate with actual email provider
  // Options: Resend, SendGrid, Mailgun, AWS SES, etc.

  const resendApiKey = context.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('[Email] Not configured, skipping:', { to, subject });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EstateFlow Leads <leads@estateflow.com>',
        to: [to],
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.status}`);
    }

    console.log('[Email] Sent successfully to:', to);
  } catch (error) {
    console.error('[Email] Send failed:', error);
    throw error;
  }
}

/**
 * POST endpoint for manual trigger (testing)
 */
export async function action({ request, context }: LoaderFunctionArgs) {
  return loader({ request, context });
}

# Platform Integrations Guide

## WhatsApp Business Integration

### Overview
WhatsApp is the primary communication channel in Puerto Rico and Latin America. Our platform provides deep WhatsApp Business API integration for both directory-level concierge services and individual business automation.

### Architecture

#### Dual Bot System

```typescript
interface WhatsAppBotConfig {
  conciergeBot: {
    number: "+1 (787) 555-0100",
    name: "EnlacePR Assistant",
    role: "directory_search",
    languages: ["es", "en"]
  },
  businessBot: {
    enabledTiers: ["ai_admin", "enterprise"],
    monthlyPrice: 89,
    features: ["auto_reply", "booking", "quotes", "followup"]
  }
}
```

### Twilio WhatsApp Setup

#### 1. Account Configuration

```typescript
// Environment variables
const TWILIO_CONFIG = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM, // WhatsApp: +14155238886
  WEBHOOK_URL: "https://api.enlacepr.com/webhooks/whatsapp"
};
```

#### 2. Webhook Handler

```typescript
// app/routes/api/webhooks/whatsapp.ts
import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { validateTwilioWebhook } from "~/lib/twilio.server";
import { WhatsAppBotAgent } from "~/lib/agents/whatsapp-bot";

export async function action({ request, context }: ActionFunctionArgs) {
  // Validate webhook signature
  const signature = request.headers.get("X-Twilio-Signature");
  const body = await request.text();

  if (!validateTwilioWebhook(signature, body, context.env)) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse WhatsApp message
  const params = new URLSearchParams(body);
  const message = {
    from: params.get("From")?.replace("whatsapp:", ""),
    to: params.get("To")?.replace("whatsapp:", ""),
    body: params.get("Body"),
    mediaUrl: params.get("MediaUrl0"),
    messageId: params.get("MessageSid"),
    profileName: params.get("ProfileName")
  };

  // Process with bot agent
  const agent = new WhatsAppBotAgent(context.env);
  const response = await agent.execute({
    tenant: await getTenantByWhatsApp(message.to),
    data: message
  });

  // Send response
  await sendWhatsAppMessage(message.from, response.output);

  return json({ success: true });
}
```

### WhatsApp Message Templates

#### Business Templates (Spanish)

```typescript
const templates = {
  welcome: {
    es: "¡Hola {name}! 👋 Soy el asistente de {business}. ¿En qué puedo ayudarte hoy?",
    en: "Hi {name}! 👋 I'm {business}'s assistant. How can I help you today?"
  },

  serviceInquiry: {
    es: `Ofrecemos los siguientes servicios:
{services}

¿Cuál te interesa? Responde con el número.`,
    en: `We offer the following services:
{services}

Which interests you? Reply with the number.`
  },

  appointmentBooking: {
    es: `Perfecto! Para agendar tu cita de {service}:

📅 Fechas disponibles:
{availableDates}

Responde con tu preferencia (ejemplo: "1" para {firstDate})`,
    en: `Great! To book your {service} appointment:

📅 Available dates:
{availableDates}

Reply with your preference (example: "1" for {firstDate})`
  },

  priceQuote: {
    es: `💰 Cotización para {service}:
• Precio estimado: {priceRange}
• Duración: {duration}
• Incluye: {includes}

¿Deseas agendar o tienes preguntas?`,
    en: `💰 Quote for {service}:
• Estimated price: {priceRange}
• Duration: {duration}
• Includes: {includes}

Would you like to book or have questions?`
  },

  missedCallResponse: {
    es: `Hola! Vi que llamaste a {business}. 📞
Disculpa que no pudimos atender.

¿En qué podemos ayudarte? Puedes escribir aquí o llamar nuevamente al {phone}.`,
    en: `Hi! I saw you called {business}. 📞
Sorry we missed your call.

How can we help? You can message here or call again at {phone}.`
  }
};
```

### WhatsApp Business Features

#### 1. Concierge Bot Flow

```typescript
class ConciergeBotFlow {
  async handleMessage(message: WhatsAppMessage): Promise<string> {
    const intent = await this.detectIntent(message.body);

    switch (intent.type) {
      case 'service_search':
        return await this.searchServices(intent);

      case 'business_info':
        return await this.getBusinessInfo(intent);

      case 'directions':
        return await this.getDirections(intent);

      case 'booking':
        return await this.initiateBooking(intent);

      default:
        return this.getWelcomeMessage();
    }
  }

  private async searchServices(intent: ServiceSearchIntent) {
    const { service, location } = intent.parameters;

    // Search in database
    const businesses = await DB.prepare(`
      SELECT
        business_name,
        phone,
        whatsapp,
        address,
        AVG(rating) as rating
      FROM tenants
      WHERE
        status = 'active'
        AND city LIKE ?
        AND (
          industry = ? OR
          services LIKE ?
        )
      ORDER BY rating DESC
      LIMIT 5
    `).bind(
      `%${location}%`,
      service,
      `%${service}%`
    ).all();

    return this.formatBusinessList(businesses.results);
  }

  private formatBusinessList(businesses: Business[]): string {
    if (businesses.length === 0) {
      return "No encontré servicios en esa área. ¿Puedes ser más específico?";
    }

    let response = `Encontré ${businesses.length} opciones:\n\n`;

    businesses.forEach((b, i) => {
      response += `${i + 1}. *${b.business_name}* ⭐${b.rating || 'N/A'}\n`;
      response += `   📍 ${b.address}\n`;
      response += `   📞 ${b.phone}\n`;
      if (b.whatsapp) {
        response += `   💬 wa.me/${b.whatsapp.replace(/\D/g, '')}\n`;
      }
      response += '\n';
    });

    response += "_Responde con el número para más información._";

    return response;
  }
}
```

#### 2. Business Bot Automation

```typescript
class BusinessBotAutomation {
  private tenant: Tenant;
  private conversation: Conversation;

  async processMessage(message: WhatsAppMessage): Promise<BotResponse> {
    // Load conversation context
    this.conversation = await this.loadConversation(message.from);

    // Detect intent
    const intent = await this.detectIntent(message.body);

    // Generate response based on intent and context
    const response = await this.generateResponse(intent);

    // Save conversation
    await this.saveConversation(message, response);

    // Trigger follow-up actions if needed
    await this.triggerActions(intent, response);

    return response;
  }

  private async triggerActions(intent: Intent, response: BotResponse) {
    switch (intent.type) {
      case 'appointment_confirmed':
        // Create calendar event
        await this.createCalendarEvent(intent.parameters);
        // Send confirmation SMS
        await this.sendConfirmationSMS(intent.parameters);
        break;

      case 'quote_requested':
        // Generate quote
        const quote = await this.generateQuote(intent.parameters);
        // Create lead
        await this.createLead(intent.parameters, quote);
        // Notify business owner
        await this.notifyOwner(quote);
        break;

      case 'emergency_service':
        // Immediate escalation
        await this.escalateToOwner(intent.parameters);
        // Send emergency response
        await this.sendEmergencyResponse();
        break;
    }
  }
}
```

### WhatsApp Media Handling

```typescript
// Handle images (Gate Photos)
async function handleWhatsAppImage(mediaUrl: string, message: WhatsAppMessage) {
  // Download image from Twilio
  const image = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
    }
  });

  const blob = await image.blob();

  // Upload to R2
  const key = `gate-photos/${message.from}/${Date.now()}.jpg`;
  await R2.put(key, blob);

  // Extract GPS if available
  const exif = await extractExif(blob);
  const coordinates = exif.gps ? {
    lat: exif.gps.latitude,
    lng: exif.gps.longitude
  } : null;

  // Save to database
  await DB.prepare(`
    INSERT INTO gate_photos (
      tenant_id, photo_url, latitude, longitude, uploaded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    tenantId,
    `https://assets.enlacepr.com/${key}`,
    coordinates?.lat,
    coordinates?.lng,
    message.from
  ).run();

  return "Foto recibida! La usaremos para facilitar entregas futuras. 📸";
}
```

## ATH Móvil Integration

### Overview
ATH Móvil is Puerto Rico's dominant digital payment platform with 65% market share. It enables instant bank transfers via QR codes or phone numbers.

### Technical Integration

#### 1. Merchant Setup

```typescript
interface ATHMovilConfig {
  merchantId: string;
  publicToken: string;
  privateToken: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

// Environment configuration
const ATH_CONFIG: ATHMovilConfig = {
  merchantId: process.env.ATH_MOVIL_MERCHANT_ID,
  publicToken: process.env.ATH_MOVIL_PUBLIC_TOKEN,
  privateToken: process.env.ATH_MOVIL_PRIVATE_TOKEN,
  callbackUrl: "https://api.enlacepr.com/webhooks/ath-movil",
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
};
```

#### 2. Payment Request Creation

```typescript
// lib/ath-movil.server.ts
import crypto from 'crypto';

class ATHMovilClient {
  private baseUrl = this.config.environment === 'production'
    ? 'https://api.athmovil.com/v2'
    : 'https://sandbox.athmovil.com/v2';

  async createPaymentRequest(params: {
    amount: number;
    description: string;
    customerPhone?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentRequest> {
    // Generate unique reference
    const reference = crypto.randomBytes(16).toString('hex');

    // Create payment request
    const payload = {
      publicToken: this.config.publicToken,
      amount: params.amount.toFixed(2),
      description: params.description.substring(0, 40), // ATH limit
      reference,
      phone: params.customerPhone,
      metadata: JSON.stringify(params.metadata),
      callback: this.config.callbackUrl,
      timeout: 600 // 10 minutes
    };

    // Sign request
    const signature = this.signRequest(payload);

    const response = await fetch(`${this.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return {
      paymentId: data.paymentId,
      reference,
      qrCode: data.qrCodeUrl,
      paymentUrl: data.paymentUrl,
      expiresAt: new Date(Date.now() + 600000)
    };
  }

  private signRequest(payload: any): string {
    const message = Object.keys(payload)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.config.privateToken)
      .update(message)
      .digest('hex');
  }
}
```

#### 3. Payment Flow Implementation

```typescript
// app/routes/api/checkout.ts
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();

  const payment = {
    amount: Number(formData.get('amount')),
    description: formData.get('description'),
    tenantId: formData.get('tenantId'),
    jobId: formData.get('jobId')
  };

  // Create ATH Móvil payment
  const athClient = new ATHMovilClient(context.env);
  const paymentRequest = await athClient.createPaymentRequest({
    amount: payment.amount,
    description: payment.description,
    metadata: {
      tenantId: payment.tenantId,
      jobId: payment.jobId
    }
  });

  // Store payment request
  await context.env.DB.prepare(`
    INSERT INTO ath_movil_transactions (
      tenant_id,
      transaction_id,
      reference_number,
      amount,
      status,
      job_id,
      initiated_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))
  `).bind(
    payment.tenantId,
    paymentRequest.paymentId,
    paymentRequest.reference,
    payment.amount,
    payment.jobId
  ).run();

  // Return QR code and payment link
  return json({
    qrCode: paymentRequest.qrCode,
    paymentUrl: paymentRequest.paymentUrl,
    reference: paymentRequest.reference,
    expiresAt: paymentRequest.expiresAt
  });
}
```

#### 4. Webhook Handler

```typescript
// app/routes/api/webhooks/ath-movil.ts
export async function action({ request, context }: ActionFunctionArgs) {
  const signature = request.headers.get('X-Signature');
  const body = await request.text();

  // Verify webhook signature
  if (!verifyATHWebhook(signature, body, context.env)) {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  const data = JSON.parse(body);

  // Update transaction status
  await context.env.DB.prepare(`
    UPDATE ath_movil_transactions
    SET
      status = ?,
      customer_name = ?,
      customer_phone = ?,
      fee = ?,
      net_amount = ?,
      completed_at = datetime('now')
    WHERE transaction_id = ?
  `).bind(
    data.status, // 'completed', 'failed', 'expired'
    data.customerName,
    data.customerPhone,
    data.fee,
    data.amount - data.fee,
    data.paymentId
  ).run();

  // Update job if payment completed
  if (data.status === 'completed' && data.metadata?.jobId) {
    await updateJobPaymentStatus(data.metadata.jobId, 'paid');

    // Trigger reputation manager agent for review request
    await triggerAgent('reputation-manager', {
      jobId: data.metadata.jobId,
      tenantId: data.metadata.tenantId
    });
  }

  // Send confirmation to customer
  if (data.customerPhone && data.status === 'completed') {
    await sendSMS(data.customerPhone,
      `✅ Pago recibido! Monto: $${data.amount}. Referencia: ${data.reference}`
    );
  }

  return json({ received: true });
}
```

### ATH Móvil UI Components

#### QR Code Display

```tsx
// app/components/ATHMovilPayment.tsx
import { QRCodeSVG } from 'qrcode.react';

export function ATHMovilPayment({
  qrCode,
  paymentUrl,
  amount,
  reference,
  expiresAt
}: ATHMovilPaymentProps) {
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="text-center mb-4">
        <img
          src="/ath-movil-logo.svg"
          alt="ATH Móvil"
          className="h-12 mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-900">
          Pagar con ATH Móvil
        </h2>
        <p className="text-3xl font-bold text-green-600 mt-2">
          ${amount.toFixed(2)}
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-gray-50 p-6 rounded-lg mb-4">
        <QRCodeSVG
          value={qrCode}
          size={256}
          level="H"
          className="mx-auto"
        />
        <p className="text-sm text-gray-600 text-center mt-4">
          Escanea con la app de ATH Móvil
        </p>
      </div>

      {/* Alternative payment link */}
      <a
        href={paymentUrl}
        className="block w-full bg-[#00a859] text-white text-center py-3 rounded-lg font-semibold hover:bg-[#008a49] transition"
      >
        Abrir en ATH Móvil
      </a>

      {/* Timer */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Tiempo restante: {Math.floor(timeLeft / 60)}:
          {(timeLeft % 60).toString().padStart(2, '0')}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Referencia: {reference}
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-6 border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          ¿Cómo pagar?
        </h3>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Abre la app de ATH Móvil</li>
          <li>2. Selecciona "Pagar"</li>
          <li>3. Escanea el código QR</li>
          <li>4. Confirma el pago</li>
        </ol>
      </div>
    </div>
  );
}
```

### Payment Processor Selection

```typescript
// app/lib/payment.server.ts
export async function getPaymentProcessor(tenant: Tenant): PaymentProcessor {
  // Puerto Rico prefers ATH Móvil
  if (tenant.brand === 'PR' || tenant.country === 'PR') {
    return {
      primary: 'ath_movil',
      fallback: 'stripe',
      displayName: 'ATH Móvil',
      icon: '/icons/ath-movil.svg',
      features: ['instant', 'qr_code', 'no_fees']
    };
  }

  // US prefers Stripe
  if (tenant.brand === 'US' || tenant.country === 'US') {
    return {
      primary: 'stripe',
      fallback: 'paypal',
      displayName: 'Credit/Debit Card',
      icon: '/icons/stripe.svg',
      features: ['cards', 'ach', 'invoicing']
    };
  }

  // Default to Stripe
  return {
    primary: 'stripe',
    fallback: 'paypal',
    displayName: 'Card Payment',
    icon: '/icons/card.svg',
    features: ['global', 'multi_currency']
  };
}
```

## Twilio SMS Integration

### Configuration

```typescript
// lib/twilio.server.ts
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string, from?: string) {
  // Format phone numbers
  const toFormatted = formatPhoneNumber(to);
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

  try {
    const message = await twilioClient.messages.create({
      body,
      to: toFormatted,
      from: fromNumber,
      statusCallback: 'https://api.enlacepr.com/webhooks/sms/status'
    });

    // Log message
    await DB.prepare(`
      INSERT INTO messages (
        tenant_id, direction, channel, from_number, to_number, body, message_id, sent_at
      ) VALUES (?, 'outbound', 'sms', ?, ?, ?, ?, datetime('now'))
    `).bind(
      getCurrentTenantId(),
      fromNumber,
      toFormatted,
      body,
      message.sid
    ).run();

    return { success: true, messageId: message.sid };

  } catch (error) {
    console.error('SMS send failed:', error);
    return { success: false, error: error.message };
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Puerto Rico numbers
  if (digits.startsWith('787') || digits.startsWith('939')) {
    return `+1${digits}`;
  }

  // US numbers without country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Assume it has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as is with + prefix
  return `+${digits}`;
}
```

## Integration Best Practices

### Rate Limiting

```typescript
class RateLimiter {
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await KV.get(`rate:${key}`, { type: 'json' });

    if (!current) {
      await KV.put(`rate:${key}`, JSON.stringify({
        count: 1,
        resetAt: Date.now() + window
      }), { expirationTtl: window });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    await KV.put(`rate:${key}`, JSON.stringify(current), {
      expirationTtl: Math.floor((current.resetAt - Date.now()) / 1000)
    });

    return true;
  }
}

// Usage in WhatsApp handler
const canProceed = await rateLimiter.checkLimit(
  `whatsapp:${message.from}`,
  20, // 20 messages
  3600 // per hour
);

if (!canProceed) {
  return "Has alcanzado el límite de mensajes. Intenta más tarde.";
}
```

### Error Handling

```typescript
class IntegrationErrorHandler {
  async handle(error: any, integration: string): Promise<void> {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: { integration },
      extra: { context: this.context }
    });

    // Store in database for retry
    await DB.prepare(`
      INSERT INTO integration_errors (
        integration, error_type, error_message, context, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      integration,
      error.code || 'unknown',
      error.message,
      JSON.stringify(this.context)
    ).run();

    // Notify ops team if critical
    if (this.isCritical(error)) {
      await this.notifyOpsTeam(error, integration);
    }
  }

  private isCritical(error: any): boolean {
    const criticalCodes = ['AUTH_FAILED', 'RATE_LIMIT', 'INVALID_CONFIG'];
    return criticalCodes.includes(error.code);
  }
}
```

### Testing

```typescript
// tests/integrations/whatsapp.test.ts
describe('WhatsApp Integration', () => {
  test('handles Spanish service search', async () => {
    const message = {
      from: '+17875551234',
      body: 'Necesito un plomero en Caguas'
    };

    const response = await handleWhatsAppMessage(message);

    expect(response).toContain('Encontré');
    expect(response).toContain('plomero');
    expect(response).toContain('Caguas');
  });

  test('handles ATH Móvil payment confirmation', async () => {
    const webhook = {
      paymentId: 'test-123',
      status: 'completed',
      amount: 100.00,
      customerPhone: '+17875551234'
    };

    await handleATHWebhook(webhook);

    const transaction = await getTransaction('test-123');
    expect(transaction.status).toBe('completed');
  });
});
```

## Security Considerations

### Webhook Validation

```typescript
// Twilio signature validation
function validateTwilioWebhook(signature: string, body: string, env: Env): boolean {
  const authToken = env.TWILIO_AUTH_TOKEN;
  const url = env.WEBHOOK_URL;

  const params = new URLSearchParams(body);
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join('');

  const data = url + sortedParams;
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(data)
    .digest('base64');

  return signature === expectedSignature;
}

// ATH Móvil signature validation
function verifyATHWebhook(signature: string, body: string, env: Env): boolean {
  const privateToken = env.ATH_MOVIL_PRIVATE_TOKEN;

  const expectedSignature = crypto
    .createHmac('sha256', privateToken)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}
```

### Data Privacy

```typescript
// Encrypt sensitive data
function encryptPhoneNumber(phone: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}
```

---

These integrations form the backbone of the platform's communication and payment infrastructure, enabling seamless interaction with customers in their preferred channels and payment methods.
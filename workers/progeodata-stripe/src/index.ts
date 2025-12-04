import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DB: D1Database;
  PURCHASE_TOKENS: KVNamespace;
}

// Product configuration
const PRODUCTS = {
  florida: {
    price: 'price_1OTestFLProGeoData99',  // Replace with actual Stripe price ID
    amount: 9900, // $99.00 in cents
    name: 'Florida Professionals Data Pack',
    description: '1,600+ Florida real estate professionals'
  },
  texas: {
    price: 'price_1OTestTXProGeoData79',  // Replace with actual Stripe price ID
    amount: 7900, // $79.00 in cents
    name: 'Texas Professionals Data Pack',
    description: '150+ Texas real estate professionals'
  },
  all_states: {
    price: 'price_1OTestALLProGeoData299',  // Replace with actual Stripe price ID
    amount: 29900, // $299.00 in cents
    name: 'All States Data Pack',
    description: '1,800+ professionals across all available states'
  }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Initialize Stripe
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    // Route: Create checkout session
    if (url.pathname === '/api/checkout/create-session' && request.method === 'POST') {
      try {
        const body = await request.json() as { pack: string; success_url?: string; cancel_url?: string };

        if (!body.pack || !PRODUCTS[body.pack as keyof typeof PRODUCTS]) {
          return new Response(JSON.stringify({ error: 'Invalid product pack' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const product = PRODUCTS[body.pack as keyof typeof PRODUCTS];

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.amount,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: body.success_url || `https://progeodata.com/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: body.cancel_url || 'https://progeodata.com/pricing',
          metadata: {
            pack: body.pack,
            timestamp: new Date().toISOString()
          }
        });

        // Store session info in database
        await env.DB.prepare(`
          INSERT INTO stripe_sessions (session_id, pack, status, created_at)
          VALUES (?, ?, 'pending', datetime('now'))
        `).bind(session.id, body.pack).run();

        return new Response(JSON.stringify({
          success: true,
          session_id: session.id,
          checkout_url: session.url
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Checkout session creation failed:', error);
        return new Response(JSON.stringify({
          error: 'Failed to create checkout session',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Stripe webhook handler
    if (url.pathname === '/api/stripe/webhook' && request.method === 'POST') {
      try {
        const signature = request.headers.get('stripe-signature');
        if (!signature) {
          return new Response('No signature', { status: 400 });
        }

        const body = await request.text();

        // Verify webhook signature
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err) {
          console.error('Webhook signature verification failed:', err);
          return new Response('Invalid signature', { status: 400 });
        }

        // Handle the event
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;

            // Generate download token
            const downloadToken = crypto.randomUUID();
            const pack = session.metadata?.pack || 'unknown';

            // Store purchase record
            await env.DB.prepare(`
              INSERT INTO purchases (
                session_id,
                customer_email,
                pack,
                download_token,
                amount,
                status,
                created_at
              ) VALUES (?, ?, ?, ?, ?, 'completed', datetime('now'))
            `).bind(
              session.id,
              session.customer_details?.email || '',
              pack,
              downloadToken,
              session.amount_total || 0
            ).run();

            // Update session status
            await env.DB.prepare(`
              UPDATE stripe_sessions
              SET status = 'completed', completed_at = datetime('now')
              WHERE session_id = ?
            `).bind(session.id).run();

            // Store download token in KV for fast access (expires in 7 days)
            await env.PURCHASE_TOKENS.put(downloadToken, JSON.stringify({
              pack,
              email: session.customer_details?.email,
              session_id: session.id,
              created_at: new Date().toISOString()
            }), {
              expirationTtl: 604800 // 7 days
            });

            // TODO: Send email with download link to customer
            console.log(`Payment successful for ${pack} pack. Token: ${downloadToken}`);
            break;
          }

          case 'checkout.session.expired': {
            const session = event.data.object as Stripe.Checkout.Session;

            // Update session status
            await env.DB.prepare(`
              UPDATE stripe_sessions
              SET status = 'expired', updated_at = datetime('now')
              WHERE session_id = ?
            `).bind(session.id).run();
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response('Webhook processed', { status: 200 });

      } catch (error) {
        console.error('Webhook processing failed:', error);
        return new Response('Webhook error', { status: 500 });
      }
    }

    // Route: Verify purchase and get download token
    if (url.pathname === '/api/purchase/verify' && request.method === 'GET') {
      try {
        const token = url.searchParams.get('token');
        if (!token) {
          return new Response(JSON.stringify({ error: 'No token provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check token in KV
        const tokenData = await env.PURCHASE_TOKENS.get(token);
        if (!tokenData) {
          return new Response(JSON.stringify({
            error: 'Invalid or expired token'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const purchase = JSON.parse(tokenData);

        return new Response(JSON.stringify({
          valid: true,
          pack: purchase.pack,
          email: purchase.email,
          created_at: purchase.created_at
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Purchase verification failed:', error);
        return new Response(JSON.stringify({
          error: 'Verification failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Get pricing
    if (url.pathname === '/api/pricing' && request.method === 'GET') {
      return new Response(JSON.stringify({
        products: Object.entries(PRODUCTS).map(([key, product]) => ({
          id: key,
          name: product.name,
          description: product.description,
          price: product.amount / 100, // Convert cents to dollars
          currency: 'USD'
        }))
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'progeodata-stripe',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
/**
 * x402 Product Management System
 * Comprehensive system for managing x402 products, pricing, and subscriptions
 */

import { Router } from 'itty-router';

// Create router
const router = Router();

// Database schema and configuration
const DB_SCHEMA = {
    products: `
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL, -- 'api_access', 'data_package', 'subscription'
            pricing_model TEXT NOT NULL, -- 'pay_per_use', 'subscription', 'bulk'
            base_price TEXT NOT NULL, -- in base currency
            currency TEXT DEFAULT 'base',
            x402_endpoint TEXT, -- associated x402 endpoint
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            active BOOLEAN DEFAULT TRUE,
            metadata JSON
        )
    `,
    subscriptions: `
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            status TEXT NOT NULL, -- 'active', 'paused', 'cancelled', 'expired'
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP,
            billing_cycle TEXT, -- 'monthly', 'quarterly', 'annual'
            last_payment_timestamp TIMESTAMP,
            next_payment_timestamp TIMESTAMP,
            payment_method TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `,
    usage_metrics: `
        CREATE TABLE IF NOT EXISTS usage_metrics (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            usage_date DATE NOT NULL,
            request_count INTEGER DEFAULT 0,
            data_volume INTEGER DEFAULT 0, -- in bytes
            last_used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `,
    payment_history: `
        CREATE TABLE IF NOT EXISTS payment_history (
            id TEXT PRIMARY KEY,
            subscription_id TEXT,
            product_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency TEXT DEFAULT 'base',
            payment_method TEXT,
            transaction_hash TEXT,
            status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
            payment_date TIMESTAMP NOT NULL,
            metadata JSON,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `
};

// Initialize database
async function initializeDatabase(env) {
    try {
        // Create tables
        for (const [tableName, schema] of Object.entries(DB_SCHEMA)) {
            await env.PRODUCTS_DB.prepare(schema).run();
        }

        // Create indexes for performance
        await env.PRODUCTS_DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_products_type ON products(type)
        `).run();

        await env.PRODUCTS_DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)
        `).run();

        await env.PRODUCTS_DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_metrics(usage_date)
        `).run();

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

// Product validation
function validateProduct(product) {
    const requiredFields = ['id', 'name', 'type', 'pricing_model', 'base_price'];
    const missingFields = requiredFields.filter(field => !product[field]);

    if (missingFields.length > 0) {
        return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    const validTypes = ['api_access', 'data_package', 'subscription'];
    const validPricingModels = ['pay_per_use', 'subscription', 'bulk'];

    if (!validTypes.includes(product.type)) {
        return { valid: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` };
    }

    if (!validPricingModels.includes(product.pricing_model)) {
        return { valid: false, error: `Invalid pricing model. Must be one of: ${validPricingModels.join(', ')}` };
    }

    return { valid: true };
}

// Generate unique IDs
function generateId(prefix = 'prod') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Product CRUD Operations
 */
async function createProduct(productData, env) {
    const validation = validateProduct(productData);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const product = {
        ...productData,
        id: productData.id || generateId('prod'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: productData.active !== false // default to true
    };

    try {
        await env.PRODUCTS_DB.prepare(`
            INSERT INTO products (
                id, name, description, type, pricing_model, base_price, currency,
                x402_endpoint, created_at, updated_at, active, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            product.id, product.name, product.description, product.type,
            product.pricing_model, product.base_price, product.currency || 'base',
            product.x402_endpoint, product.created_at, product.updated_at,
            product.active ? 1 : 0, JSON.stringify(product.metadata || {})
        ).run();

        return { success: true, product };
    } catch (error) {
        console.error('Create product error:', error);
        return { success: false, error: error.message };
    }
}

async function getProductById(productId, env) {
    try {
        const result = await env.PRODUCTS_DB.prepare(`
            SELECT * FROM products WHERE id = ?
        `).bind(productId).first();

        if (!result) {
            return { success: false, error: 'Product not found' };
        }

        return {
            success: true,
            product: {
                ...result,
                active: Boolean(result.active),
                metadata: result.metadata ? JSON.parse(result.metadata) : {}
            }
        };
    } catch (error) {
        console.error('Get product error:', error);
        return { success: false, error: error.message };
    }
}

async function updateProduct(productId, updates, env) {
    try {
        // Get existing product
        const existing = await env.PRODUCTS_DB.prepare(`
            SELECT * FROM products WHERE id = ?
        `).bind(productId).first();

        if (!existing) {
            return { success: false, error: 'Product not found' };
        }

        // Merge updates
        const updatedProduct = {
            ...existing,
            ...updates,
            updated_at: new Date().toISOString()
        };

        // Validate
        const validation = validateProduct(updatedProduct);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Update in database
        await env.PRODUCTS_DB.prepare(`
            UPDATE products SET
                name = ?,
                description = ?,
                type = ?,
                pricing_model = ?,
                base_price = ?,
                currency = ?,
                x402_endpoint = ?,
                updated_at = ?,
                active = ?,
                metadata = ?
            WHERE id = ?
        `).bind(
            updatedProduct.name,
            updatedProduct.description,
            updatedProduct.type,
            updatedProduct.pricing_model,
            updatedProduct.base_price,
            updatedProduct.currency || 'base',
            updatedProduct.x402_endpoint,
            updatedProduct.updated_at,
            updatedProduct.active ? 1 : 0,
            JSON.stringify(updatedProduct.metadata || {}),
            productId
        ).run();

        return { success: true, product: updatedProduct };
    } catch (error) {
        console.error('Update product error:', error);
        return { success: false, error: error.message };
    }
}

async function listProducts(filters = {}, env) {
    try {
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.active !== undefined) {
            query += ' AND active = ?';
            params.push(filters.active ? 1 : 0);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        const result = await env.PRODUCTS_DB.prepare(query).bind(...params).all();

        return {
            success: true,
            products: result.results.map(row => ({
                ...row,
                active: Boolean(row.active),
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            }))
        };
    } catch (error) {
        console.error('List products error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Subscription Management
 */
async function createSubscription(subscriptionData, env) {
    const requiredFields = ['user_id', 'product_id', 'status', 'start_date', 'billing_cycle'];
    const missingFields = requiredFields.filter(field => !subscriptionData[field]);

    if (missingFields.length > 0) {
        return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    const subscription = {
        ...subscriptionData,
        id: subscriptionData.id || generateId('sub'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        await env.PRODUCTS_DB.prepare(`
            INSERT INTO subscriptions (
                id, user_id, product_id, status, start_date, end_date,
                billing_cycle, last_payment_timestamp, next_payment_timestamp,
                payment_method, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            subscription.id, subscription.user_id, subscription.product_id,
            subscription.status, subscription.start_date, subscription.end_date,
            subscription.billing_cycle, subscription.last_payment_timestamp,
            subscription.next_payment_timestamp, subscription.payment_method,
            subscription.created_at, subscription.updated_at
        ).run();

        return { success: true, subscription };
    } catch (error) {
        console.error('Create subscription error:', error);
        return { success: false, error: error.message };
    }
}

async function recordPayment(paymentData, env) {
    const requiredFields = ['product_id', 'user_id', 'amount', 'payment_date'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);

    if (missingFields.length > 0) {
        return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    const payment = {
        ...paymentData,
        id: paymentData.id || generateId('pay'),
        status: paymentData.status || 'completed',
        currency: paymentData.currency || 'base'
    };

    try {
        await env.PRODUCTS_DB.prepare(`
            INSERT INTO payment_history (
                id, subscription_id, product_id, user_id, amount, currency,
                payment_method, transaction_hash, status, payment_date, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            payment.id, payment.subscription_id, payment.product_id,
            payment.user_id, payment.amount, payment.currency,
            payment.payment_method, payment.transaction_hash,
            payment.status, payment.payment_date, JSON.stringify(payment.metadata || {})
        ).run();

        return { success: true, payment };
    } catch (error) {
        console.error('Record payment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Usage Tracking
 */
async function recordUsage(usageData, env) {
    const requiredFields = ['subscription_id', 'product_id', 'usage_date'];
    const missingFields = requiredFields.filter(field => !usageData[field]);

    if (missingFields.length > 0) {
        return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    const usage = {
        ...usageData,
        id: usageData.id || generateId('usage'),
        last_used_at: usageData.last_used_at || new Date().toISOString()
    };

    try {
        // Check if usage record exists for this date
        const existing = await env.PRODUCTS_DB.prepare(`
            SELECT * FROM usage_metrics
            WHERE subscription_id = ? AND product_id = ? AND usage_date = ?
        `).bind(usage.subscription_id, usage.product_id, usage.usage_date).first();

        if (existing) {
            // Update existing record
            await env.PRODUCTS_DB.prepare(`
                UPDATE usage_metrics SET
                    request_count = request_count + ?,
                    data_volume = data_volume + ?,
                    last_used_at = ?
                WHERE id = ?
            `).bind(
                usage.request_count || 0,
                usage.data_volume || 0,
                usage.last_used_at,
                existing.id
            ).run();

            return { success: true, usage: { ...existing, ...usage } };
        } else {
            // Create new record
            await env.PRODUCTS_DB.prepare(`
                INSERT INTO usage_metrics (
                    id, subscription_id, product_id, usage_date,
                    request_count, data_volume, last_used_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                usage.id, usage.subscription_id, usage.product_id,
                usage.usage_date, usage.request_count || 0,
                usage.data_volume || 0, usage.last_used_at
            ).run();

            return { success: true, usage };
        }
    } catch (error) {
        console.error('Record usage error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Analytics and Reporting
 */
async function getProductAnalytics(productId, env) {
    try {
        // Get basic product info
        const productResult = await getProductById(productId, env);
        if (!productResult.success) {
            return productResult;
        }

        // Get usage statistics
        const usageResult = await env.PRODUCTS_DB.prepare(`
            SELECT
                COUNT(*) as total_requests,
                SUM(data_volume) as total_data_volume,
                MAX(last_used_at) as last_used_at
            FROM usage_metrics
            WHERE product_id = ?
        `).bind(productId).first();

        // Get subscription statistics
        const subscriptionResult = await env.PRODUCTS_DB.prepare(`
            SELECT
                COUNT(*) as active_subscriptions,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
            FROM subscriptions
            WHERE product_id = ?
        `).bind(productId).first();

        // Get revenue statistics
        const revenueResult = await env.PRODUCTS_DB.prepare(`
            SELECT
                SUM(CAST(amount AS REAL)) as total_revenue,
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'completed' THEN CAST(amount AS REAL) ELSE 0 END) as completed_revenue
            FROM payment_history
            WHERE product_id = ?
        `).bind(productId).first();

        return {
            success: true,
            analytics: {
                product: productResult.product,
                usage: {
                    total_requests: usageResult?.total_requests || 0,
                    total_data_volume: usageResult?.total_data_volume || 0,
                    last_used_at: usageResult?.last_used_at
                },
                subscriptions: {
                    total: subscriptionResult?.active_subscriptions || 0,
                    active: subscriptionResult?.active_count || 0,
                    cancelled: subscriptionResult?.cancelled_count || 0
                },
                revenue: {
                    total: revenueResult?.total_revenue || '0',
                    total_payments: revenueResult?.total_payments || 0,
                    completed: revenueResult?.completed_revenue || '0'
                }
            }
        };
    } catch (error) {
        console.error('Get analytics error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * x402 Integration
 */
async function getX402ProductConfiguration(productId, env) {
    try {
        const productResult = await getProductById(productId, env);
        if (!productResult.success) {
            return productResult;
        }

        const product = productResult.product;

        // Generate x402 configuration based on product
        const x402Config = {
            x402Version: 1,
            productId: product.id,
            productName: product.name,
            productType: product.type,
            pricing: {
                basePrice: product.base_price,
                currency: product.currency || 'base',
                model: product.pricing_model
            },
            endpoint: product.x402_endpoint || `/v1/${product.type.replace('_', '-')}`,
            accepts: [{
                scheme: 'exact',
                network: 'base',
                maxAmountRequired: product.base_price,
                resource: product.x402_endpoint || `/v1/${product.type.replace('_', '-')}`,
                description: `${product.name} - ${product.description || ''}`,
                mimeType: 'application/json',
                payTo: '0x402PaymentAddress', // Should be configured
                maxTimeoutSeconds: 30,
                asset: 'base',
                outputSchema: {
                    input: {
                        type: 'http',
                        method: 'POST',
                        bodyType: 'json'
                    },
                    output: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        payment: {
                            txHash: { type: 'string' },
                            amount: { type: 'string' },
                            asset: { type: 'string' }
                        }
                    }
                }
            }],
            metadata: product.metadata || {}
        };

        return { success: true, x402Config };
    } catch (error) {
        console.error('x402 config error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * API Endpoints
 */
router.post('/products', async (request, env) => {
    try {
        const productData = await request.json();
        const result = await createProduct(productData, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            product: result.product
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create product',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.get('/products/:id', async (request, env) => {
    try {
        const productId = request.params.id;
        const result = await getProductById(productId, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            product: result.product
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to get product',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.put('/products/:id', async (request, env) => {
    try {
        const productId = request.params.id;
        const updates = await request.json();
        const result = await updateProduct(productId, updates, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            product: result.product
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update product',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.get('/products', async (request, env) => {
    try {
        const { search, type, active } = request.query;
        const filters = { search, type, active };
        const result = await listProducts(filters, env);

        return new Response(JSON.stringify({
            success: true,
            products: result.products
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to list products',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.post('/subscriptions', async (request, env) => {
    try {
        const subscriptionData = await request.json();
        const result = await createSubscription(subscriptionData, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            subscription: result.subscription
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create subscription',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.post('/payments', async (request, env) => {
    try {
        const paymentData = await request.json();
        const result = await recordPayment(paymentData, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            payment: result.payment
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to record payment',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.post('/usage', async (request, env) => {
    try {
        const usageData = await request.json();
        const result = await recordUsage(usageData, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            usage: result.usage
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to record usage',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.get('/analytics/products/:id', async (request, env) => {
    try {
        const productId = request.params.id;
        const result = await getProductAnalytics(productId, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            analytics: result.analytics
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to get analytics',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

router.get('/x402/config/:productId', async (request, env) => {
    try {
        const productId = request.params.productId;
        const result = await getX402ProductConfiguration(productId, env);

        if (!result.success) {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(result.x402Config), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to get x402 config',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Health check
 */
router.get('/health', async (request, env) => {
    try {
        const dbHealth = await initializeDatabase(env);

        return new Response(JSON.stringify({
            status: 'healthy',
            database: dbHealth ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            status: 'unhealthy',
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Main fetch handler
 */
export default {
    async fetch(request, env, ctx) {
        // Initialize database on first request
        if (!env.PRODUCTS_DB) {
            console.log('Database not initialized');
            return new Response(JSON.stringify({
                error: 'Database not initialized'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            // Initialize database if needed
            await initializeDatabase(env);
            return await router.handle(request, env, ctx);
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
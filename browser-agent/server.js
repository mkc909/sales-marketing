/**
 * Browser Agent API Server
 * Express server that provides API endpoints for live professional data scraping
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const ProfessionalScraper = require('./scraper');
const { getSupportedStates, getSupportedProfessions } = require('./state-lookups');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for scraping
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory cache for 24 hours
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

// Active scraping sessions
const activeSessions = new Map();

/**
 * Generate cache key
 */
function getCacheKey(zip, profession, name = null) {
    return name ? `${name}-${profession}-${zip}` : `${profession}-${zip}`;
}

/**
 * Check rate limit
 */
function checkRateLimit(ip) {
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    validRequests.push(now);
    rateLimitMap.set(ip, validRequests);
    return true;
}

/**
 * Get cached results
 */
function getCachedResults(cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(cacheKey);
    return null;
}

/**
 * Cache results
 */
function cacheResults(cacheKey, data) {
    cache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Clean up old cache entries
 */
function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
            cache.delete(key);
        }
    }
}

// Clean up cache every hour
setInterval(cleanupCache, 60 * 60 * 1000);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeSessions: activeSessions.size,
        cacheSize: cache.size,
        supportedStates: getSupportedStates(),
        memoryUsage: process.memoryUsage()
    });
});

/**
 * Get supported states and professions
 */
app.get('/api/supported', (req, res) => {
    const states = getSupportedStates();
    const professionsByState = {};

    states.forEach(state => {
        professionsByState[state] = getSupportedProfessions(state);
    });

    res.json({
        states,
        professionsByState
    });
});

/**
 * Scrape professionals by zip code
 */
app.post('/api/scrape', async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: RATE_LIMIT_WINDOW / 1000
        });
    }

    const { zip, profession, name, useCache = true } = req.body;

    if (!zip || !profession) {
        return res.status(400).json({
            error: 'Missing required parameters: zip and profession'
        });
    }

    const sessionId = uuidv4();
    const startTime = Date.now();

    try {
        // Check cache first
        const cacheKey = getCacheKey(zip, profession, name);
        if (useCache) {
            const cachedResults = getCachedResults(cacheKey);
            if (cachedResults) {
                console.log(`Cache hit for ${cacheKey}`);
                return res.json({
                    success: true,
                    data: cachedResults,
                    cached: true,
                    sessionId,
                    executionTime: Date.now() - startTime
                });
            }
        }

        // Create scraper instance
        const scraper = new ProfessionalScraper({
            headless: process.env.HEADLESS !== 'false',
            timeout: 45000
        });

        // Track active session
        activeSessions.set(sessionId, {
            status: 'scraping',
            startTime,
            zip,
            profession,
            name
        });

        let results;
        if (name) {
            // Search by name
            const state = require('./state-lookups').getStateFromZip(zip);
            results = await scraper.scrapeByName(name, profession, state);
        } else {
            // Search by zip code
            results = await scraper.scrapeByZip(zip, profession);
        }

        // Cache results
        if (useCache && results.length > 0) {
            cacheResults(cacheKey, results);
        }

        // Update session
        activeSessions.set(sessionId, {
            status: 'completed',
            startTime,
            endTime: Date.now(),
            zip,
            profession,
            name,
            resultCount: results.length
        });

        // Clean up scraper
        await scraper.close();

        res.json({
            success: true,
            data: results,
            cached: false,
            sessionId,
            executionTime: Date.now() - startTime,
            metadata: {
                zip,
                profession,
                name,
                resultCount: results.length
            }
        });

    } catch (error) {
        console.error('Scraping error:', error);

        // Update session with error
        activeSessions.set(sessionId, {
            status: 'error',
            startTime,
            endTime: Date.now(),
            zip,
            profession,
            name,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: error.message,
            sessionId,
            executionTime: Date.now() - startTime
        });
    }
});

/**
 * Get session status
 */
app.get('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({
            error: 'Session not found'
        });
    }

    res.json({
        sessionId,
        ...session
    });
});

/**
 * Clear cache
 */
app.post('/api/cache/clear', (req, res) => {
    cache.clear();
    res.json({
        success: true,
        message: 'Cache cleared'
    });
});

/**
 * Get cache stats
 */
app.get('/api/cache/stats', (req, res) => {
    const stats = {
        size: cache.size,
        entries: []
    };

    for (const [key, value] of cache.entries()) {
        stats.entries.push({
            key,
            timestamp: value.timestamp,
            age: Date.now() - value.timestamp,
            dataCount: Array.isArray(value.data) ? value.data.length : 0
        });
    }

    res.json(stats);
});

/**
 * Get active sessions
 */
app.get('/api/sessions', (req, res) => {
    const sessions = [];

    for (const [sessionId, session] of activeSessions.entries()) {
        sessions.push({
            sessionId,
            ...session
        });
    }

    res.json({
        activeSessions: sessions,
        count: sessions.length
    });
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');

    // Close all active scrapers
    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.scraper) {
            session.scraper.close();
        }
    }

    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');

    // Close all active scrapers
    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.scraper) {
            session.scraper.close();
        }
    }

    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Browser Agent API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Scrape endpoint: http://localhost:${PORT}/api/scrape`);
    console.log(`📋 Supported: http://localhost:${PORT}/api/supported`);
    console.log(`🗄️ Cache stats: http://localhost:${PORT}/api/cache/stats`);
    console.log(`📝 Sessions: http://localhost:${PORT}/api/sessions`);
});

module.exports = app;
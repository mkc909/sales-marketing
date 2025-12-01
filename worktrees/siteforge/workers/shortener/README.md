# EstateFlow URL Shortener Service

Cloudflare Worker for managing short links under the `est.at` domain.

## Features

- **6-character short codes** for compact URLs
- **KV storage** for fast link resolution
- **Analytics tracking** for click events
- **Multiple link types**: profile, qr, listing, calendar
- **Health check endpoint** for monitoring

## API Endpoints

### Public Endpoints

#### `GET /{slug}`
Redirect to destination URL and track analytics.

**Example:**
```bash
curl -I https://est.at/abc123
# Returns: 302 redirect to destination
```

### API Endpoints (require `ADMIN_KEY`)

#### `POST /api/shorten`
Create a new short link.

**Request:**
```json
{
  "destination": "https://estateflow.com/agent/john-smith",
  "agentId": "agent-123",
  "type": "profile",
  "customSlug": "john" // optional
}
```

**Response:**
```json
{
  "slug": "abc123",
  "shortUrl": "https://est.at/abc123",
  "destination": "https://estateflow.com/agent/john-smith"
}
```

#### `GET /api/stats/{slug}`
Get analytics for a short link.

**Response:**
```json
{
  "slug": "abc123",
  "clicks": 42,
  "lastClick": "2024-01-15T10:30:00Z",
  "countries": { "US": 30, "CA": 12 }
}
```

#### `DELETE /api/link/{slug}`
Delete a short link.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Setup

1. **Create KV namespaces:**
```bash
npm run kv:create
npm run kv:create:preview
```

2. **Create D1 database:**
```bash
npm run d1:create
```

3. **Set secrets:**
```bash
wrangler secret put ADMIN_KEY
wrangler secret put POSTHOG_KEY
```

4. **Update wrangler.toml** with actual KV and D1 IDs

5. **Deploy:**
```bash
npm run deploy:production
```

## Environment Variables

- `ADMIN_KEY`: Secret key for API access
- `POSTHOG_KEY`: PostHog API key for analytics (optional)

## Service Bindings

This service can be bound to other services:

```toml
# In another service's wrangler.toml
[[services]]
binding = "SHORTENER"
service = "estateflow-shortener"
environment = "production"
```

**Usage in code:**
```typescript
// Create short link from another service
const response = await env.SHORTENER.fetch(
  new Request('https://shortener/api/shorten', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination: 'https://example.com',
      agentId: 'agent-123',
      type: 'profile',
    }),
  })
);
```

## Monitoring

```bash
# Tail logs
npm run tail

# Tail production logs
npm run tail:production
```

## Architecture

- **KV Namespace LINKS**: Stores slug → destination mappings
- **KV Namespace ANALYTICS**: Stores click analytics
- **D1 Database**: Complex analytics queries (optional)
- **Cloudflare Workers Analytics**: Built-in request metrics

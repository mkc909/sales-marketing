# Analytics Engine Worker 


A Cloudflare Worker that provides HTTP endpoints for writing analytics data to the Cloudflare Analytics Engine `analytic_events` dataset.

## Features

- Write single analytics events
- Batch write multiple events
- Helper endpoints for common event types (page views, custom events)
- Automatic data validation and formatting
- CORS support for web applications
- Health check and monitoring endpoints

## Configuration

The worker is configured with an Analytics Engine binding to the `analytic_events` dataset:

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
dataset = "analytic_events"
```

## API Endpoints

### Health Check
```
GET /health
```

Returns the worker status and version.

### Write Single Event
```
POST /event
Content-Type: application/json

{
  "event_name": "user_signup",
  "event_timestamp": 1701234567,
  "user_id": "user_123",
  "session_id": "session_456",
  "properties": {
    "plan": "premium",
    "source": "google"
  },
  "url": "https://example.com/signup",
  "referrer": "https://google.com"
}
```

### Batch Write Events
```
POST /events
Content-Type: application/json

{
  "events": [
    {
      "event_name": "page_view",
      "event_timestamp": 1701234567,
      "user_id": "user_123",
      "properties": {
        "page": "/dashboard"
      }
    },
    {
      "event_name": "button_click",
      "event_timestamp": 1701234568,
      "user_id": "user_123",
      "properties": {
        "button_id": "submit_form"
      }
    }
  ]
}
```

### Track Page View (Helper)
```
POST /pageview
Content-Type: application/json

{
  "page": "/dashboard",
  "title": "Dashboard",
  "user_id": "user_123",
  "session_id": "session_456",
  "url": "https://example.com/dashboard",
  "referrer": "https://example.com/login"
}
```

### Track Custom Event (Helper)
```
POST /track
Content-Type: application/json

{
  "event_name": "purchase_completed",
  "user_id": "user_123",
  "session_id": "session_456",
  "properties": {
    "product_id": "prod_456",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

### API Documentation
```
GET /docs
```

Returns detailed API documentation and examples.

## Event Schema

All events must include the following required fields:

- `event_name` (string): The name of the event
- `event_timestamp` (number): Unix timestamp in seconds

Optional fields:

- `user_id` (string): Unique identifier for the user
- `session_id` (string): Unique identifier for the session
- `properties` (object): Custom event properties
- `user_agent` (string): User agent string (auto-populated)
- `ip_address` (string): Client IP address (auto-populated)
- `url` (string): URL where the event occurred
- `referrer` (string): Referrer URL

## Data Storage

Events are stored in the Analytics Engine with the following structure:

- **Blobs**: event_name, user_id, session_id, user_agent, ip_address, url, referrer, properties (JSON)
- **Doubles**: timestamp (nanoseconds), duration, value, count
- **Indexes**: hashed event_name, user_id, session_id

## Development

### Setup
```bash
cd workers/analytics-engine
npm install
```

### Local Development
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

### Deployment
```bash
npm run deploy
```

### Monitoring
```bash
npm run tail
```

## Usage Examples

### JavaScript/TypeScript Client
```javascript
// Track a page view
fetch('https://analytics-engine.your-domain.com/pageview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    page: '/dashboard',
    title: 'Dashboard',
    user_id: 'user_123',
    session_id: 'session_456'
  })
});

// Track a custom event
fetch('https://analytics-engine.your-domain.com/track', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_name: 'button_click',
    user_id: 'user_123',
    session_id: 'session_456',
    properties: {
      button_id: 'submit_form',
      form_type: 'contact'
    }
  })
});
```

### cURL Examples
```bash
# Track page view
curl -X POST https://analytics-engine.your-domain.com/pageview \
  -H "Content-Type: application/json" \
  -d '{
    "page": "/dashboard",
    "title": "Dashboard",
    "user_id": "user_123"
  }'

# Track custom event
curl -X POST https://analytics-engine.your-domain.com/track \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "purchase_completed",
    "user_id": "user_123",
    "properties": {
      "product_id": "prod_456",
      "amount": 99.99
    }
  }'
```

## Error Handling

The worker returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (validation error)
- `404`: Endpoint not found
- `500`: Internal server error

Error responses include a descriptive error message:

```json
{
  "error": "event_name is required and must be a string",
  "timestamp": "2024-12-04T12:00:00.000Z"
}
```

## Monitoring

Use the health check endpoint to monitor worker status:

```bash
curl https://analytics-engine.your-domain.com/health
```

## writeDataPoint() Implementation

The core `writeDataPoint()` function handles the conversion of analytics events to the Analytics Engine format:

```typescript
async function writeDataPoint(
  env: Env,
  event: AnalyticsEvent
): Promise<void> {
  // Convert timestamp to nanoseconds
  const timestampNanos = event.event_timestamp * 1_000_000;

  // Prepare data point fields
  const dataPoint: WriteDataPointRequest = {
    blobs: [
      event.event_name,
      event.user_id || '',
      event.session_id || '',
      event.user_agent || '',
      event.ip_address || '',
      event.url || '',
      event.referrer || '',
      JSON.stringify(event.properties || {})
    ],
    doubles: [
      timestampNanos,
      event.properties?.duration || 0,
      event.properties?.value || 0,
      event.properties?.count || 1
    ],
    indexes: [
      hashString(event.event_name),
      event.user_id ? hashString(event.user_id) : 0,
      event.session_id ? hashString(event.session_id) : 0
    ]
  };

  // Write to Analytics Engine
  await env.ANALYTICS_ENGINE.writeDataPoint(dataPoint);
}
```

This function automatically:
- Converts timestamps to nanoseconds (required by Analytics Engine)
- Serializes event properties to JSON
- Creates searchable indexes from string fields
- Handles missing optional fields gracefully
- Provides debug logging in development mode

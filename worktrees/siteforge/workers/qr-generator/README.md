# EstateFlow QR Code Generator Service

Cloudflare Worker for generating and caching QR codes in multiple formats.

## Features

- **Multiple formats**: PNG, SVG
- **Customizable sizes**: 128px to 2000px
- **Error correction levels**: L, M, Q, H
- **R2 storage** for generated QR codes
- **KV caching** for fast repeated requests
- **Service binding** to URL shortener

## API Endpoints

### `GET /qr/{slug}`
Generate QR code for a short link.

**Query Parameters:**
- `size`: QR code size in pixels (default: 512, max: 2000)
- `format`: Output format (png or svg, default: png)
- `level`: Error correction level (L, M, Q, H, default: M)

**Example:**
```bash
# Generate 512x512 PNG QR code
curl https://qr-generator.workers.dev/qr/abc123 > qr.png

# Generate 1024x1024 PNG with high error correction
curl "https://qr-generator.workers.dev/qr/abc123?size=1024&level=H" > qr-large.png

# Generate SVG format
curl "https://qr-generator.workers.dev/qr/abc123?format=svg" > qr.svg
```

### `POST /api/generate`
Generate QR code for custom URL.

**Request:**
```json
{
  "url": "https://example.com",
  "size": 512,
  "format": "png",
  "level": "M"
}
```

**Response:**
```json
{
  "success": true,
  "key": "qr/abc123-512-M.png",
  "url": "https://r2-bucket.com/qr/abc123-512-M.png",
  "cached": false
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "qr-generator",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

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

1. **Create R2 bucket:**
```bash
npm run r2:create
```

2. **Create KV namespace:**
```bash
npm run kv:create
npm run kv:create:preview
```

3. **Update wrangler.toml** with actual R2 bucket name and KV namespace ID

4. **Deploy:**
```bash
npm run deploy:production
```

## Environment Variables

- `MAX_QR_SIZE`: Maximum QR code size (default: 2000)
- `DEFAULT_QR_SIZE`: Default QR code size (default: 512)
- `ERROR_CORRECTION_LEVEL`: Default error correction level (default: M)

## Service Bindings

This service uses the URL shortener service:

```toml
[[services]]
binding = "SHORTENER"
service = "estateflow-shortener"
environment = "production"
```

**Usage:**
```typescript
// Get destination URL from shortener
const response = await env.SHORTENER.fetch(
  new Request(`https://shortener/api/link/${slug}`)
);
const linkData = await response.json();
```

## Caching Strategy

1. **First request**: Generate QR code → Store in R2 → Cache key in KV
2. **Subsequent requests**: Check KV → Return cached R2 URL
3. **Cache TTL**: 7 days for KV entries
4. **R2 retention**: Indefinite (manual cleanup)

## Error Correction Levels

- **L (Low)**: ~7% error correction - Smallest file size
- **M (Medium)**: ~15% error correction - Recommended default
- **Q (Quartile)**: ~25% error correction - Good for outdoor signs
- **H (High)**: ~30% error correction - Maximum reliability

## Monitoring

```bash
# Tail logs
npm run tail

# Tail production logs
npm run tail:production
```

## Usage Examples

### Physical Yard Signs (PinExacto/TruePoint)
```bash
# Generate high-quality QR code for outdoor sign
curl "https://qr-generator.workers.dev/qr/property-123?size=1024&level=H" > yard-sign.png
```

### Business Cards
```bash
# Generate compact QR code for business card
curl "https://qr-generator.workers.dev/qr/agent-john?size=256&level=M" > business-card.png
```

### Digital Marketing
```bash
# Generate SVG for web use (scalable)
curl "https://qr-generator.workers.dev/qr/promo-2024?format=svg" > promo.svg
```

## Architecture

- **R2 Bucket QR_STORAGE**: Stores generated QR code images
- **KV Namespace QR_CACHE**: Caches R2 URLs for fast lookups
- **Service Binding SHORTENER**: Validates short links before generating QR codes

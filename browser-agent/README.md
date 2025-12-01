# Browser Agent - Live Professional Data Scraper

A production-ready browser automation system that scrapes professional licensing boards in real-time when users search for professionals.

## Features

- 🤖 **Human-like Browser Automation**: Uses Puppeteer with stealth plugin to avoid detection
- 🌎 **Multi-State Support**: Supports FL, TX, CA, NY with easy expansion
- 👥 **Multiple Professions**: Real Estate, Insurance, Dentist, Attorney, Contractor
- ⚡ **24-Hour Caching**: Reduces response time for repeat searches
- 🛡️ **Rate Limiting**: Prevents abuse and protects target websites
- 📊 **Real-time Monitoring**: Track scraping sessions and performance
- 🔍 **Flexible Search**: Search by zip code or professional name

## Quick Start

### Installation

```bash
cd browser-agent
npm install
cp .env.example .env
```

### Configuration

Edit `.env` file:
```env
PORT=3000
NODE_ENV=production
HEADLESS=true
```

### Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Supported States/Professions
```bash
GET /api/supported
```

### Scrape Professionals
```bash
POST /api/scrape
Content-Type: application/json

{
  "zip": "33139",
  "profession": "real_estate_agent",
  "name": "John Doe",  // Optional
  "useCache": true     // Optional, defaults to true
}
```

### Session Status
```bash
GET /api/session/:sessionId
```

### Cache Management
```bash
GET /api/cache/stats
POST /api/cache/clear
```

### Active Sessions
```bash
GET /api/sessions
```

## Example Usage

### Search by Zip Code
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "zip": "33139",
    "profession": "real_estate_agent"
  }'
```

### Search by Name
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "zip": "33139",
    "profession": "real_estate_agent",
    "name": "John Smith"
  }'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "name": "John Smith",
      "licenseNumber": "BK1234567",
      "licenseType": "Real Estate Salesperson",
      "status": "Active",
      "expirationDate": "12/31/2024",
      "state": "FL",
      "profession": "real_estate_agent",
      "zip": "33139",
      "scrapedAt": "2024-12-01T02:45:00.000Z",
      "source": "https://www.myfloridalicense.com/..."
    }
  ],
  "cached": false,
  "sessionId": "uuid-v4-session-id",
  "executionTime": 3500,
  "metadata": {
    "zip": "33139",
    "profession": "real_estate_agent",
    "resultCount": 25
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Profession not_supported is not supported in state FL",
  "sessionId": "uuid-v4-session-id",
  "executionTime": 1200
}
```

## Supported Professions

- `real_estate_agent`
- `insurance_agent`
- `dentist`
- `attorney`
- `contractor`

## Supported States

- `FL` - Florida
- `TX` - Texas
- `CA` - California
- `NY` - New York

## Architecture

```
User Request → Express API → Scraper Worker → Puppeteer Browser → State Licensing Board
                      ↓
                 24-Hour Cache
```

## Performance

- **First Search**: 3-10 seconds (live scrape)
- **Cached Search**: <500ms
- **Rate Limit**: 10 requests per minute per IP
- **Cache TTL**: 24 hours

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Active Sessions
```bash
curl http://localhost:3000/api/sessions
```

### Cache Statistics
```bash
curl http://localhost:3000/api/cache/stats
```

## Security Features

- **Stealth Mode**: Puppeteer with anti-detection
- **Human-like Behavior**: Random delays and mouse movements
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Sanitizes all inputs
- **Error Handling**: Graceful error recovery

## Deployment

### Docker
```bash
docker build -t browser-agent .
docker run -p 3000:3000 browser-agent
```

### PM2
```bash
npm install -g pm2
pm2 start server.js --name "browser-agent"
pm2 monit
```

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `HEADLESS`: Run browser in headless mode (true/false)
- `RATE_LIMIT_WINDOW`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

## Troubleshooting

### Common Issues

1. **Browser Launch Fails**
   - Install Chromium dependencies
   - Set `PUPPETEER_EXECUTABLE_PATH` in .env

2. **Scraping Timeouts**
   - Increase timeout in scraper options
   - Check target website availability

3. **Rate Limit Exceeded**
   - Wait for rate limit window to reset
   - Adjust rate limit settings

### Debug Mode
```bash
HEADLESS=false npm start
```

### Screenshots
The scraper automatically takes screenshots on errors for debugging.

## License

MIT License - see LICENSE file for details.
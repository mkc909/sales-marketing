# 🚀 Deploy Live Scraping System

Complete deployment guide for the On-Demand Live Scraping System that scrapes professional licensing boards in real-time.

## 📋 Prerequisites

### Required Accounts
- [x] Cloudflare account (with Workers, KV, and R2 enabled)
- [x] Node.js 18+ and npm 8+
- [x] Git for cloning repositories
- [x] Domain name (optional, for custom URLs)

### Required Tools
```bash
# Install Wrangler CLI
npm install -g wrangler

# Verify installation
wrangler --version
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Edge Worker    │    │  Browser Agent  │
│  (Remix App)    │───▶│   (Caching)     │───▶│  (Scraper)     │
│                 │    │                  │    │                 │
│ /api/live-search │    │ /api/scrape      │    │ /api/scrape     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌──────────────┐         ┌──────────────┐
                       │   KV Cache   │         │   Puppeteer   │
                       │   (24hr)     │         │   Browser     │
                       └──────────────┘         └──────────────┘
```

## 📦 Components to Deploy

1. **Browser Agent** (Node.js server)
2. **Edge Worker** (Cloudflare Worker)
3. **API Endpoint** (Remix function)
4. **KV Namespace** (for caching)

---

## 🚀 Step 1: Deploy Browser Agent

### 1.1 Clone and Setup
```bash
# Navigate to browser-agent directory
cd browser-agent

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 1.2 Configure Environment
Edit `.env` file:
```env
PORT=3000
NODE_ENV=production
HEADLESS=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
CACHE_TTL=86400000
```

### 1.3 Deploy Options

#### Option A: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

#### Option B: Render
```bash
# Install Render CLI
npm install -g render-cli

# Deploy
railway deploy
```

#### Option C: Docker
```bash
# Build Docker image
docker build -t browser-agent .

# Run on cloud provider
docker run -p 3000:3000 browser-agent
```

### 1.4 Verify Deployment
```bash
# Health check
curl https://your-browser-agent-url.com/health

# Test scraping
curl -X POST https://your-browser-agent-url.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"zip": "33139", "profession": "real_estate_agent"}'
```

---

## 🚀 Step 2: Deploy Edge Worker

### 2.1 Setup Worker Project
```bash
# Navigate to worker directory
cd workers/scraper-api

# Install dependencies
npm install
```

### 2.2 Create KV Namespace
```bash
# Create production KV namespace
wrangler kv:namespace create "SCRAPER_KV"

# Create preview KV namespace
wrangler kv:namespace create "SCRAPER_KV" --preview
```

### 2.3 Configure wrangler.toml
Update `workers/scraper-api/wrangler.toml`:
```toml
name = "scraper-api"
main = "index.js"
compatibility_date = "2023-12-01"

# KV namespace (replace with your IDs)
[[kv_namespaces]]
binding = "SCRAPER_KV"
id = "your-production-kv-id"
preview_id = "your-preview-kv-id"

# Environment variables
[vars]
BROWSER_AGENT_URL = "https://your-browser-agent-url.com"
CACHE_TTL = "86400"
RATE_LIMIT_WINDOW = "60"
RATE_LIMIT_MAX_REQUESTS = "10"
```

### 2.4 Deploy Worker
```bash
# Deploy to production
wrangler deploy

# Test deployment
wrangler tail
```

### 2.5 Verify Worker
```bash
# Health check
curl https://scraper-api.your-subdomain.workers.dev/health

# Test scraping through worker
curl -X POST https://scraper-api.your-subdomain.workers.dev/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"zip": "33139", "profession": "real_estate_agent"}'
```

---

## 🚀 Step 3: Update API Endpoint

### 3.1 Configure Live Search API
Edit `worktrees/siteforge/functions/api/live-search.ts`:
```typescript
// Update this line with your worker URL
const SCRAPER_API_URL = 'https://scraper-api.your-subdomain.workers.dev/api/scrape';
```

### 3.2 Deploy Main Application
```bash
# Navigate to main project
cd worktrees/siteforge

# Deploy to Cloudflare Pages
npm run deploy
```

---

## 🚀 Step 4: Configure Custom Domain (Optional)

### 4.1 Add Custom Domain to Worker
```bash
# Add custom domain
wrangler domains add scraper.yourdomain.com

# Update wrangler.toml
routes = [
  { pattern = "scraper.yourdomain.com/api/*", zone_name = "yourdomain.com" }
]
```

### 4.2 Update API Configuration
Update the SCRAPER_API_URL in live-search.ts:
```typescript
const SCRAPER_API_URL = 'https://scraper.yourdomain.com/api/scrape';
```

---

## 🔧 Configuration Options

### Browser Agent Settings
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Browser Settings
HEADLESS=true
PUPPETEER_EXECUTABLE_PATH=

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10

# Cache Settings
CACHE_TTL=86400000
```

### Edge Worker Settings
```toml
[vars]
BROWSER_AGENT_URL = "https://your-browser-agent-url.com"
CACHE_TTL = "86400"
RATE_LIMIT_WINDOW = "60"
RATE_LIMIT_MAX_REQUESTS = "10"
```

### API Endpoint Settings
```typescript
const CONFIG = {
  SCRAPER_API_URL: 'https://your-worker-url.com/api/scrape',
  DATABASE_LIMIT: 50,
  SUPPORTED_PROFESSIONS: [
    'real_estate_agent',
    'insurance_agent',
    'dentist',
    'attorney',
    'contractor'
  ],
  CACHE_TTL: 24 * 60 * 60 * 1000
};
```

---

## 🧪 Testing & Validation

### 1. Test Browser Agent
```bash
# Health check
curl https://your-browser-agent-url.com/health

# Test scraping
curl -X POST https://your-browser-agent-url.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"zip": "33139", "profession": "real_estate_agent"}'
```

### 2. Test Edge Worker
```bash
# Health check
curl https://your-worker-url.com/health

# Test through worker
curl -X POST https://your-worker-url.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"zip": "33139", "profession": "real_estate_agent"}'
```

### 3. Test Full API
```bash
# Test live search endpoint
curl -X POST https://your-app-domain.com/api/live-search \
  -H "Content-Type: application/json" \
  -d '{
    "zip": "33139",
    "profession": "real_estate_agent",
    "useLiveSearch": true,
    "useDatabase": true
  }'
```

### 4. Test Frontend Integration
```javascript
// Test from browser
fetch('/api/live-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    zip: '33139',
    profession: 'real_estate_agent'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📊 Monitoring & Debugging

### Browser Agent Monitoring
```bash
# Check logs
curl https://your-browser-agent-url.com/api/sessions

# Check cache stats
curl https://your-browser-agent-url.com/api/cache/stats

# Clear cache
curl -X POST https://your-browser-agent-url.com/api/cache/clear
```

### Edge Worker Monitoring
```bash
# Real-time logs
wrangler tail

# Check cache
curl https://your-worker-url.com/api/cache/stats

# Clear cache
curl -X POST https://your-worker-url.com/api/cache/clear
```

### Health Check Endpoints
- Browser Agent: `/health`
- Edge Worker: `/health`
- Main API: `/api/live-search` (GET for status)

---

## ⚠️ Troubleshooting

### Common Issues

#### 1. Browser Agent Won't Start
```bash
# Check if port is in use
netstat -tulpn | grep :3000

# Change port in .env
PORT=3001
```

#### 2. Puppeteer Fails to Launch
```bash
# Install Chromium dependencies
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

#### 3. Worker Deployment Fails
```bash
# Check wrangler auth
wrangler whoami

# Re-authenticate
wrangler login

# Check KV namespace
wrangler kv:namespace list
```

#### 4. CORS Errors
```bash
# Check CORS headers in browser-agent/server.js
app.use(cors({
  origin: ['https://yourdomain.com', 'https://your-subdomain.workers.dev'],
  credentials: true
}));
```

#### 5. Rate Limiting Issues
```bash
# Check rate limit settings
curl https://your-worker-url.com/api/supported

# Adjust in wrangler.toml
RATE_LIMIT_MAX_REQUESTS = "20"
```

---

## 📈 Performance Optimization

### Browser Agent
- Use `HEADLESS=true` in production
- Increase `RATE_LIMIT_MAX_REQUESTS` for high traffic
- Monitor memory usage with PM2

### Edge Worker
- Adjust `CACHE_TTL` for your use case
- Use custom domain for better performance
- Monitor KV storage usage

### Database
- Add indexes on `zip` and `profession` columns
- Consider read replicas for high traffic
- Implement connection pooling

---

## 🔒 Security Considerations

### Browser Agent
- Use HTTPS in production
- Implement API key authentication
- Monitor for abuse
- Regular security updates

### Edge Worker
- Enable rate limiting
- Validate all inputs
- Use secure headers
- Monitor for DDoS attacks

### Data Privacy
- Comply with state licensing board terms
- Implement data retention policies
- Secure sensitive information
- Follow GDPR/CCPA if applicable

---

## 📞 Support

### Documentation
- [Browser Agent README](browser-agent/README.md)
- [Edge Worker Code](workers/scraper-api/index.js)
- [API Endpoint](worktrees/siteforge/functions/api/live-search.ts)

### Debug Commands
```bash
# Browser agent logs
pm2 logs browser-agent

# Worker logs
wrangler tail

# Application logs
wrangler pages deployment tail
```

### Performance Monitoring
- Set up Uptime monitoring
- Monitor response times
- Track error rates
- Alert on failures

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Browser agent health endpoint responds
2. ✅ Edge worker health endpoint responds
3. ✅ Live search API returns real data
4. ✅ Caching works (second request is faster)
5. ✅ Rate limiting prevents abuse
6. ✅ Frontend can search professionals
7. ✅ Error handling works gracefully
8. ✅ Monitoring and logging are functional

---

## 🚀 Next Steps

After successful deployment:

1. **Monitor Performance**: Set up alerts and monitoring
2. **Scale Up**: Add more browser agents if needed
3. **Add States**: Expand to more states and professions
4. **Optimize**: Fine-tune caching and rate limiting
5. **Document**: Update API documentation
6. **Test**: Load test with real traffic

---

**Deployment Time**: 30-45 minutes
**Cost**: ~$5-20/month depending on usage
**Maintenance**: Low (monitoring and updates)

🎊 **Congratulations!** You now have a production-ready live scraping system!
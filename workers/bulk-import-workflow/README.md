# Bulk Import Workflow for ProGeoData

A Cloudflare Workers solution for bulk importing professional licensing data from state boards into D1 database.

## Features

- **Cloudflare Workflows** for reliable, long-running data imports
- **Automatic retries** with exponential backoff
- **Batch processing** for efficient D1 inserts
- **Progress tracking** with status endpoints
- **CSV parsing** with field normalization
- **Error handling** and logging

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Cloudflare Workers                        │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  BulkImport      │  API Endpoints   │  D1 Database    │  Workflows│
│  Workflow       │  (Trigger/Status) │  (progeodata-db) │  Engine    │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────┐
│                    State Licensing Board APIs                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Florida     │  │ California   │  │  Texas       │  │  New York  │  │
│  │  Insurance  │  │  Real Estate │  │  Real Estate │  │  Real Estate│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Cloudflare account with Workers and D1 access
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Installation

1. Clone this repository
2. Navigate to the worker directory:
   ```bash
   cd workers/bulk-import-workflow
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Update `wrangler.jsonc` with your D1 database ID
2. Configure your Cloudflare account in Wrangler:
   ```bash
   wrangler login
   ```

## Usage

### Start Development Server

```bash
npm run dev
```

### Deploy to Cloudflare

```bash
npm run deploy
```

### Trigger an Import

```bash
curl -X POST https://your-worker-url.workers.dev/api/import/trigger \
  -H 'Content-Type: application/json' \
  -d '{
    "source_url": "https://licenseesearch.fldfs.com/downloadlicenseefile",
    "state": "FL",
    "industry": "insurance",
    "file_type": "csv"
  }'
```

### Check Import Status

```bash
curl https://your-worker-url.workers.dev/api/import/status/{INSTANCE_ID}
```

## API Endpoints

### POST `/api/import/trigger`

Trigger a new bulk import workflow.

**Request Body:**
```json
{
  "source_url": "string",
  "state": "string",
  "industry": "string",
  "file_type": "csv" | "excel"
}
```

**Response:**
```json
{
  "instance_id": "string",
  "status_url": "string"
}
```

### GET `/api/import/status/:id`

Check the status of a running import workflow.

**Response:**
```json
{
  "status": "running" | "completed" | "failed",
  "result": {
    "state": "string",
    "records_imported": number,
    "file_size_bytes": number,
    "duration_ms": number
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Database Schema

The worker expects a D1 database with the following schema:

```sql
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT,
  license_type TEXT,
  status TEXT DEFAULT 'ACTIVE',
  state TEXT NOT NULL,
  industry TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  expiration_date TEXT,
  raw_data TEXT,
  source TEXT DEFAULT 'bulk_import',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pros_state ON professionals(state);
CREATE INDEX IF NOT EXISTS idx_pros_industry ON professionals(industry);
CREATE INDEX IF NOT EXISTS idx_pros_zip ON professionals(zip);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pros_license ON professionals(state, license_number);
```

## Data Sources

Priority order for bulk imports:

1. **Florida Insurance** - 300,000+ records (308MB)
   - URL: `https://licenseesearch.fldfs.com/downloadlicenseefile`

2. **California Real Estate** - 400,000+ records
   - URL: `https://www.dre.ca.gov/Licensees/Salesperson.html`

3. **Texas Real Estate** - 200,000+ records
   - URL: `https://www.trec.texas.gov/public/high-value-data-sets`

4. **New York Real Estate** - 100,000+ records
   - URL: `https://catalog.data.gov/dataset/nys-real-estate-salesperson`

5. **Arizona Real Estate** - 50,000+ records
   - URL: `https://services.azre.gov/publicdatabase/`

## Error Handling

The workflow includes comprehensive error handling:

- **Download failures**: Automatic retry with exponential backoff (3 attempts)
- **Parse failures**: Timeout after 2 minutes
- **Database failures**: Automatic retry with exponential backoff (3 attempts)
- **Progress tracking**: Logs progress every 10 batches

## Performance

- **Batch size**: 100 records per D1 transaction
- **Memory efficient**: Processes data in streams
- **Progressive logging**: Updates every 1,000 records
- **Optimized inserts**: Uses `INSERT OR IGNORE` to avoid duplicates

## Monitoring

Enable observability in `wrangler.jsonc`:

```json
"observability": {
  "enabled": true,
  "head_sampling_rate": 1
}
```

## Troubleshooting

### Common Issues

1. **D1 connection errors**: Verify your database ID in `wrangler.jsonc`
2. **Download timeouts**: Increase timeout in workflow configuration
3. **Memory limits**: Reduce batch size if hitting Workers memory limits
4. **CSV parsing errors**: Check file encoding and delimiter

### Debugging

```bash
# Check logs
wrangler tail

# Test locally
wrangler dev

# Query D1 directly
wrangler d1 execute progeodata-db --command "SELECT COUNT(*) FROM professionals;"
```

## License

MIT
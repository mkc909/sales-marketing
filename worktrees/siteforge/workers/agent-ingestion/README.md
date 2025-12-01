# EstateFlow Agent Ingestion Service

Cloudflare Worker for processing and ingesting professional data from multiple sources.

## Features

- **Multi-source ingestion**: CSV, JSON, API
- **Data validation** and normalization
- **Duplicate detection** via email + industry
- **Batch processing** with rate limiting
- **Error handling** and retry logic
- **Progress tracking** via KV storage
- **File archival** in R2 bucket

## API Endpoints

All endpoints require authentication via `Authorization: Bearer {API_SECRET}` header.

### `GET /health`
Health check endpoint (no auth required).

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-ingestion",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

### `POST /api/ingest/batch`
Ingest multiple professionals at once.

**Request:**
```json
{
  "professionals": [
    {
      "industry": "real_estate",
      "profession": "agent",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "555-123-4567",
      "city": "Miami",
      "state": "FL",
      "zip_code": "33101",
      "license_number": "FL-12345",
      "specializations": ["luxury", "waterfront"],
      "years_experience": 10,
      "source": "api-import"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 100,
  "inserted": 85,
  "updated": 10,
  "skipped": 0,
  "errors": 5,
  "duration_ms": 1250,
  "batch_id": "abc-123-def"
}
```

### `POST /api/ingest/single`
Ingest a single professional.

**Request:** Same as single object from batch array

**Response:**
```json
{
  "success": true,
  "inserted": true,
  "professional": { /* normalized data */ }
}
```

### `POST /api/ingest/csv`
Upload and process CSV file.

**Request:** `multipart/form-data` with `file` field

**CSV Format:**
```csv
industry,profession,name,email,phone,city,state,zip_code,license_number,specializations,years_experience
real_estate,agent,John Smith,john@example.com,555-123-4567,Miami,FL,33101,FL-12345,"luxury,waterfront",10
```

**Response:**
```json
{
  "success": true,
  "total": 1000,
  "inserted": 950,
  "updated": 30,
  "skipped": 5,
  "errors": 15,
  "batch_id": "csv-batch-123",
  "file_stored": "imports/1234567890-data.csv"
}
```

### `GET /api/status`
Get overall ingestion statistics.

**Response:**
```json
{
  "total_professionals": 835000,
  "by_industry": [
    { "industry": "real_estate", "count": 350000 },
    { "industry": "legal", "count": 85000 },
    { "industry": "insurance", "count": 120000 }
  ],
  "recent_batches": [
    { "import_batch_id": "batch-123", "count": 1000 }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### `GET /api/batch/{batchId}`
Get status of specific batch import.

**Response:**
```json
{
  "batch_id": "abc-123-def",
  "success": true,
  "total": 100,
  "inserted": 85,
  "updated": 10,
  "errors": 5,
  "duration_ms": 1250
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

1. **Create all resources at once:**
```bash
npm run setup
```

Or individually:

2. **Create D1 database:**
```bash
npm run d1:create
```

3. **Run migrations:**
```bash
npm run d1:migrate
```

4. **Create KV namespace:**
```bash
npm run kv:create
npm run kv:create:preview
```

5. **Create R2 bucket:**
```bash
npm run r2:create
```

6. **Set API secret:**
```bash
wrangler secret put API_SECRET
# Enter a secure random string
```

7. **Update wrangler.toml** with actual resource IDs

8. **Deploy:**
```bash
npm run deploy:production
```

## Data Validation

### Required Fields
- `industry` (string): Industry category
- `profession` (string): Specific profession
- `name` (string): Full name
- `email` (string): Valid email address
- `phone` (string): Phone number (auto-normalized)
- `city` (string): City name
- `state` (string): State code (auto-uppercase)
- `zip_code` (string): ZIP/postal code
- `source` (string): Data source identifier

### Optional Fields
- `license_number`: Professional license number
- `specializations`: Array of specialization areas
- `certifications`: Array of professional certifications
- `years_experience`: Number of years in profession
- `languages`: Array of spoken languages
- `source_id`: External system identifier

### Normalization Rules

1. **Email**: Converted to lowercase, trimmed
2. **State**: Converted to uppercase (FL, NY, CA, etc.)
3. **Phone**: Formatted as `(XXX) XXX-XXXX` for 10-digit US numbers
4. **Industry/Profession**: Converted to lowercase, trimmed
5. **Specializations/Certifications/Languages**: Converted to arrays if string provided

## Batch Processing

- **Max batch size**: 5000 records (production), 1000 (staging), 100 (development)
- **Internal batching**: Processes 100 records per D1 transaction
- **Rate limiting**: Prevents quota exhaustion
- **Duplicate handling**: Updates existing records based on `email + industry` unique constraint

## Error Handling

### Validation Errors
```json
{
  "error": "Validation failed",
  "errors": [
    "email is required and must be valid",
    "phone is required and must be a string"
  ],
  "warnings": [
    "license_number is recommended",
    "specializations are recommended"
  ]
}
```

### Processing Errors
```json
{
  "error": "Batch ingestion failed",
  "message": "Database connection timeout",
  "batch_id": "abc-123-def"
}
```

## Usage Examples

### Import from API
```bash
curl -X POST https://agent-ingestion.workers.dev/api/ingest/batch \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "professionals": [
      {
        "industry": "real_estate",
        "profession": "agent",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-987-6543",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90001",
        "source": "api-import"
      }
    ]
  }'
```

### Import CSV File
```bash
curl -X POST https://agent-ingestion.workers.dev/api/ingest/csv \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -F "file=@professionals.csv"
```

### Check Status
```bash
curl https://agent-ingestion.workers.dev/api/status \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### Check Batch Status
```bash
curl https://agent-ingestion.workers.dev/api/batch/abc-123-def \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

## Monitoring

```bash
# Tail logs
npm run tail

# Tail production logs
npm run tail:production

# Watch for errors
wrangler tail --format pretty | grep -i error
```

## Progressive Import Testing

Always test progressively with real data:

1. **Stage 1**: 10 records (smoke test)
2. **Stage 2**: 100 records (validation test)
3. **Stage 3**: 1,000 records (performance test)
4. **Stage 4**: 10,000 records (scale test)
5. **Stage 5**: Full import (production)

**Example:**
```bash
# Stage 1: Test with 10 records
curl -X POST https://agent-ingestion.workers.dev/api/ingest/csv \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -F "file=@test-10-records.csv"

# Verify results
curl https://agent-ingestion.workers.dev/api/status \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

## Environment Variables

- `API_SECRET`: Secret key for API authentication (set via `wrangler secret`)
- `MAX_BATCH_SIZE`: Maximum records per batch (1000 default)
- `RATE_LIMIT_ENABLED`: Enable rate limiting (true default)
- `ENVIRONMENT`: Current environment (development, staging, production)

## Architecture

- **D1 Database (DB)**: Stores professional data in `professionals` table
- **KV Namespace (INGESTION_STATUS)**: Tracks batch import status (24h TTL)
- **R2 Bucket (IMPORT_FILES)**: Archives original import files
- **Optional Service Binding (NOTIFICATION_SERVICE)**: Send notifications on completion

## Database Schema

```sql
CREATE TABLE professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  industry TEXT NOT NULL,
  profession TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  license_number TEXT,
  specializations JSON,
  certifications JSON,
  years_experience INTEGER,
  languages JSON,
  source TEXT NOT NULL,
  source_id TEXT,
  import_batch_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  UNIQUE(email, industry)
);
```

## Security

- **Authentication**: All API endpoints require Bearer token authentication
- **Input validation**: Strict validation on all input fields
- **SQL injection protection**: Parameterized queries only
- **Rate limiting**: Configurable per environment
- **CORS**: Enabled for cross-origin requests (configure as needed)

## Performance Tips

1. **Use batch endpoint** instead of multiple single requests
2. **Upload CSV files** for large imports (faster than JSON)
3. **Import during off-peak hours** for large batches
4. **Monitor D1 quotas** (100k writes/day on free tier)
5. **Use staging environment** for testing large imports

import { Hono } from 'hono'
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

// Type definitions for Cloudflare Workers
type D1Database = any
type WorkflowNamespace<T> = any
type WorkflowEvent<T> = any
type WorkflowStep = any

interface Env {
  DB: D1Database
  IMPORT_WORKFLOW: WorkflowNamespace<BulkImportWorkflow>
}

interface BulkImportParams {
  source_url: string
  state: string
  industry: string
  file_type: 'csv' | 'excel'
}

interface ImportResult {
  state: string
  records_imported: number
  file_size_bytes: number
  duration_ms: number
}

export class BulkImportWorkflow extends WorkflowEntrypoint<Env, BulkImportParams> {
  async run(event: WorkflowEvent<BulkImportParams>, step: WorkflowStep): Promise<ImportResult> {
    const { source_url, state, industry, file_type } = event.payload
    const startTime = Date.now()

    // Step 1: Download file (with automatic retry)
    const fileData = await step.do(
      `download-${state}-${industry}`,
      {
        retries: { limit: 3, backoff: 'exponential', delay: '10 seconds' },
        timeout: '5 minutes'
      },
      async () => {
        console.log(`Downloading ${source_url}...`)
        const response = await fetch(source_url)
        if (!response.ok) throw new Error(`Download failed: ${response.status}`)
        const buffer = await response.arrayBuffer()
        return {
          data: Buffer.from(buffer).toString('base64'),
          size: buffer.byteLength
        }
      }
    )

    console.log(`Downloaded ${fileData.size} bytes for ${state}`)

    // Step 2: Parse file
    const rows = await step.do(
      `parse-${state}-${industry}`,
      { timeout: '2 minutes' },
      async () => {
        const buffer = Buffer.from(fileData.data, 'base64')
        if (file_type === 'csv') {
          return this.parseCSV(buffer.toString('utf-8'))
        } else {
          return this.parseExcel(buffer)
        }
      }
    )

    console.log(`Parsed ${rows.length} rows for ${state}`)

    // Step 3: Batch insert to D1 (100 at a time)
    let totalImported = 0
    const batchSize = 100

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1

      const imported = await step.do(
        `insert-batch-${state}-${batchNum}`,
        {
          retries: { limit: 3, backoff: 'exponential', delay: '1 second' },
          timeout: '30 seconds'
        },
        async () => {
          const stmt = this.env.DB.prepare(`
            INSERT OR IGNORE INTO professionals
            (id, name, license_number, license_type, status, state, industry, city, zip, raw_data, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bulk_import', datetime('now'))
          `)

          await this.env.DB.batch(
            batch.map(row => stmt.bind(
              crypto.randomUUID(),
              row.name || 'Unknown',
              row.license_number || '',
              row.license_type || '',
              row.status || 'ACTIVE',
              state,
              industry,
              row.city || '',
              row.zip || '',
              JSON.stringify(row)
            ))
          )

          return batch.length
        }
      )

      totalImported += imported

      // Log progress every 10 batches
      if (batchNum % 10 === 0) {
        console.log(`Progress: ${totalImported}/${rows.length} records`)
      }
    }

    return {
      state,
      records_imported: totalImported,
      file_size_bytes: fileData.size,
      duration_ms: Date.now() - startTime
    }
  }

  parseCSV(text: string): any[] {
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'))

    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',')
        const row: any = {}
        headers.forEach((h, i) => row[h] = values[i]?.trim() || '')

        // Normalize common field names
        return {
          name: row.name || row.full_name || row.licensee_name || row.first_name + ' ' + row.last_name,
          license_number: row.license_number || row.license_no || row.lic_no || row.license_id,
          license_type: row.license_type || row.lic_type || row.type,
          status: row.status || row.license_status || 'ACTIVE',
          city: row.city || row.mailing_city,
          zip: row.zip || row.zip_code || row.postal_code,
          ...row
        }
      })
  }

  parseExcel(buffer: any): any[] {
    // Implement Excel parsing using xlsx library
    // npm install xlsx
    throw new Error('Excel parsing not implemented - convert to CSV first')
  }
}

// Main worker with API endpoints
const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

app.post('/api/import/trigger', async (c) => {
  const { source_url, state, industry, file_type } = await c.req.json()

  const instance = await c.env.IMPORT_WORKFLOW.create({
    id: `import-${state}-${industry}-${Date.now()}`,
    params: { source_url, state, industry, file_type }
  })

  return c.json({
    instance_id: instance.id,
    status_url: `/api/import/status/${instance.id}`
  })
})

app.get('/api/import/status/:id', async (c) => {
  const id = c.req.param('id')
  const instance = await c.env.IMPORT_WORKFLOW.get(id)
  const status = await instance.status()
  return c.json(status)
})

export default app
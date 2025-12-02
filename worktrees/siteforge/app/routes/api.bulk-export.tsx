import { ActionFunction, json } from "@remix-run/node";

interface BulkExportRequest {
    state: string;
    profession: string;
    recordLimit: string;
    exportFormat: string;
    email?: string;
}

interface BulkJob {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    totalRecords?: number;
    processedRecords?: number;
    downloadUrl?: string;
    createdAt: string;
    estimatedCompletion?: string;
    state?: string;
    profession?: string;
}

// Mock database for jobs (in production, this would be a real database)
const jobs: Map<string, BulkJob> = new Map();

export const action: ActionFunction = async ({ request }) => {
    try {
        // For demo purposes, default to pro tier
        // In production, this would come from authentication
        const userTier = "pro";

        // Parse request body
        const body: BulkExportRequest = await request.json();
        const { state, profession, recordLimit, exportFormat, email } = body;

        // Validate required fields
        if (!state || !profession || !recordLimit || !exportFormat) {
            return json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check user tier limits
        const tierLimits = {
            free: { maxRecords: 100, costPer1000: null },
            basic: { maxRecords: 1000, costPer1000: 10 },
            pro: { maxRecords: 10000, costPer1000: 5 },
        };

        const userLimit = tierLimits[userTier as keyof typeof tierLimits];
        const requestedRecords = parseInt(recordLimit);

        if (requestedRecords > userLimit.maxRecords) {
            return json(
                { error: `Record limit exceeds your tier maximum of ${userLimit.maxRecords}` },
                { status: 400 }
            );
        }

        // Create bulk job
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newJob: BulkJob = {
            id: jobId,
            status: "pending",
            totalRecords: requestedRecords,
            processedRecords: 0,
            createdAt: now,
            estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
            state,
            profession,
        };

        // Store job (in production, this would be a database operation)
        jobs.set(jobId, newJob);

        // Start processing job asynchronously
        processBulkJob(jobId, state, profession, requestedRecords, exportFormat);

        return json(newJob, { status: 201 });
    } catch (error) {
        console.error("Bulk export error:", error);
        return json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
};

async function processBulkJob(
    jobId: string,
    state: string,
    profession: string,
    recordLimit: number,
    exportFormat: string
) {
    try {
        // Update job status to processing
        const job = jobs.get(jobId);
        if (job) {
            job.status = "processing";
            jobs.set(jobId, { ...job });
        }

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Call the scraper API to get data
        const scraperResponse = await fetch(`https://api.progeodata.com/v1/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                state,
                profession,
                limit: recordLimit,
            }),
        });

        if (!scraperResponse.ok) {
            throw new Error("Scraper API failed");
        }

        const scraperData = await scraperResponse.json() as { results?: any[] };
        const records = scraperData.results || [];

        // Update job with progress
        if (job) {
            job.processedRecords = records.length;
            jobs.set(jobId, { ...job });
        }

        // Simulate more processing time for export generation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate export file (in production, this would create and store a real file)
        const exportData = generateExportFile(records, exportFormat);
        const downloadUrl = `/api/bulk-export/${jobId}/download`;

        // Update job as completed
        if (job) {
            job.status = "completed";
            job.processedRecords = records.length;
            job.downloadUrl = downloadUrl;
            jobs.set(jobId, { ...job });
        }

        // Store the export data temporarily for download
        // In production, this would be stored in a file system or cloud storage
        const exportStorage = global as any;
        if (!exportStorage._bulkExports) {
            exportStorage._bulkExports = new Map();
        }
        exportStorage._bulkExports.set(jobId, {
            data: exportData,
            filename: `${state}_${profession}_export.${exportFormat}`,
            contentType: getContentType(exportFormat),
        });

    } catch (error) {
        console.error("Job processing error:", error);

        // Update job as failed
        const job = jobs.get(jobId);
        if (job) {
            job.status = "failed";
            jobs.set(jobId, { ...job });
        }
    }
}

function generateExportFile(records: any[], format: string): string {
    switch (format.toLowerCase()) {
        case "csv":
            return generateCSV(records);
        case "json":
            return JSON.stringify(records, null, 2);
        case "xlsx":
            // In production, you'd use a library like xlsx to generate Excel files
            return generateCSV(records); // Fallback to CSV for this example
        default:
            return generateCSV(records);
    }
}

function generateCSV(records: any[]): string {
    if (records.length === 0) return "";

    const headers = Object.keys(records[0]);
    const csvRows = [
        headers.join(","),
        ...records.map(record =>
            headers.map(header => {
                const value = record[header] || "";
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(",")
        )
    ];

    return csvRows.join("\n");
}

function getContentType(format: string): string {
    switch (format.toLowerCase()) {
        case "csv":
            return "text/csv";
        case "json":
            return "application/json";
        case "xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        default:
            return "text/plain";
    }
}
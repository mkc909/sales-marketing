import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

interface BulkExportRequest {
    email: string;
    state: string;
    profession: string;
    zip: string;
    recordCount: number;
    userTier: "free" | "basic" | "pro";
}

interface BulkExportJob {
    jobId: string;
    email: string;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
    estimatedCompletion: string;
    downloadUrl?: string;
    recordCount: number;
    searchParams: {
        state: string;
        profession: string;
        zip: string;
    };
}

// In-memory job storage (in production, this would be a database)
const bulkJobs = new Map<string, BulkExportJob>();

export async function action({ request, context }: ActionFunctionArgs) {
    try {
        const body = await request.json() as BulkExportRequest;

        // Validate required fields
        if (!body.email || !body.state || !body.profession || !body.zip) {
            return json(
                { error: "Missing required fields: email, state, profession, zip" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if user is allowed to use bulk export
        if (body.userTier === "free") {
            return json(
                { error: "Bulk export is available for paid users only" },
                { status: 403 }
            );
        }

        // Validate record count based on user tier
        const maxRecords = body.userTier === "basic" ? 1000 : body.userTier === "pro" ? 10000 : 0;
        if (body.recordCount > maxRecords) {
            return json(
                { error: `Maximum ${maxRecords} records allowed for ${body.userTier} tier` },
                { status: 400 }
            );
        }

        // Generate job ID
        const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create job
        const job: BulkExportJob = {
            jobId,
            email: body.email,
            status: "pending",
            createdAt: new Date().toISOString(),
            estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
            recordCount: body.recordCount,
            searchParams: {
                state: body.state,
                profession: body.profession,
                zip: body.zip
            }
        };

        // Store job
        bulkJobs.set(jobId, job);

        // Start processing job asynchronously
        processBulkExportJob(job, context);

        return json({
            success: true,
            jobId,
            status: "pending",
            estimatedCompletion: job.estimatedCompletion,
            email: body.email
        });

    } catch (error) {
        console.error("Bulk export error:", error);
        return json(
            {
                error: "Failed to create bulk export job",
                message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

async function processBulkExportJob(job: BulkExportJob, context: any) {
    try {
        // Update job status to processing
        job.status = "processing";
        bulkJobs.set(job.jobId, job);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 5000));

        // In a real implementation, this would:
        // 1. Call the scraper API with larger limits
        // 2. Collect all results
        // 3. Generate CSV/Excel file
        // 4. Upload to storage
        // 5. Send email with download link

        // For demo purposes, we'll simulate successful completion
        job.status = "completed";
        job.downloadUrl = `https://storage.example.com/exports/${job.jobId}.csv`;
        bulkJobs.set(job.jobId, job);

        console.log(`Bulk export job ${job.jobId} completed successfully`);

    } catch (error) {
        console.error(`Bulk export job ${job.jobId} failed:`, error);
        job.status = "failed";
        bulkJobs.set(job.jobId, job);
    }
}

// Endpoint to check job status
export async function loader({ request }: ActionFunctionArgs) {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
        return json(
            { error: "Missing jobId parameter" },
            { status: 400 }
        );
    }

    const job = bulkJobs.get(jobId);

    if (!job) {
        return json(
            { error: "Job not found" },
            { status: 404 }
        );
    }

    return json(job);
}
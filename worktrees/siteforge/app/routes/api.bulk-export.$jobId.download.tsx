import { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ params }) => {
    const { jobId } = params;

    if (!jobId) {
        return new Response("Job ID is required", { status: 400 });
    }

    // Get the export data from temporary storage
    const exportStorage = global as any;
    if (!exportStorage._bulkExports || !exportStorage._bulkExports.has(jobId)) {
        return new Response("Export file not found or expired", { status: 404 });
    }

    const exportData = exportStorage._bulkExports.get(jobId);

    // Create response with appropriate headers
    const responseHeaders = {
        "Content-Type": exportData.contentType,
        "Content-Disposition": `attachment; filename="${exportData.filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    };

    return new Response(exportData.data, {
        headers: responseHeaders,
    });
};
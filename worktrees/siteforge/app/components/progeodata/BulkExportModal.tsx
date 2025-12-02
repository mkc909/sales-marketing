import { useState } from "react";

interface BulkExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userTier?: string;
    currentSearchState?: string;
    currentSearchProfession?: string;
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

export function BulkExportModal({
    isOpen,
    onClose,
    userTier = "free",
    currentSearchState = "",
    currentSearchProfession = ""
}: BulkExportModalProps) {
    const [activeTab, setActiveTab] = useState<"new" | "status">("new");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [jobs, setJobs] = useState<BulkJob[]>([]);
    const [formData, setFormData] = useState({
        state: currentSearchState,
        profession: currentSearchProfession,
        recordLimit: userTier === "pro" ? "10000" : userTier === "basic" ? "1000" : "100",
        exportFormat: "csv",
        email: "",
    });

    const getTierLimits = (tier: string) => {
        switch (tier.toLowerCase()) {
            case "pro":
                return { maxRecords: 10000, costPer1000: 5 };
            case "basic":
                return { maxRecords: 1000, costPer1000: 10 };
            default:
                return { maxRecords: 100, costPer1000: null };
        }
    };

    const tierLimits = getTierLimits(userTier);
    const estimatedCost = tierLimits.costPer1000
        ? (parseInt(formData.recordLimit) / 1000) * tierLimits.costPer1000
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/bulk-export", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const newJob: BulkJob = await response.json();
                setJobs([newJob, ...jobs]);
                setActiveTab("status");
                setFormData({
                    ...formData,
                    email: "",
                });
            } else {
                console.error("Failed to submit bulk export request");
            }
        } catch (error) {
            console.error("Error submitting bulk export request:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return "text-green-600 bg-green-100";
            case "processing":
                return "text-blue-600 bg-blue-100";
            case "failed":
                return "text-red-600 bg-red-100";
            default:
                return "text-yellow-600 bg-yellow-100";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case "processing":
                return (
                    <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                );
            case "failed":
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Bulk Export</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab("new")}
                            className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === "new"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            New Export Request
                        </button>
                        <button
                            onClick={() => setActiveTab("status")}
                            className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === "status"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            Job Status ({jobs.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === "new" ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                        State
                                    </label>
                                    <select
                                        id="state"
                                        name="state"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    >
                                        <option value="">Select a state</option>
                                        <option value="FL">Florida</option>
                                        <option value="TX">Texas</option>
                                        <option value="CA">California</option>
                                        <option value="NY">New York</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="profession" className="block text-sm font-medium text-gray-700">
                                        Profession
                                    </label>
                                    <select
                                        id="profession"
                                        name="profession"
                                        value={formData.profession}
                                        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    >
                                        <option value="">Select a profession</option>
                                        <option value="real-estate">Real Estate</option>
                                        <option value="insurance">Insurance</option>
                                        <option value="contractor">Contractor</option>
                                        <option value="medical">Medical</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="recordLimit" className="block text-sm font-medium text-gray-700">
                                        Record Limit (Max: {tierLimits.maxRecords.toLocaleString()})
                                    </label>
                                    <input
                                        type="number"
                                        id="recordLimit"
                                        name="recordLimit"
                                        value={formData.recordLimit}
                                        onChange={(e) => setFormData({ ...formData, recordLimit: e.target.value })}
                                        min="1"
                                        max={tierLimits.maxRecords}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="exportFormat" className="block text-sm font-medium text-gray-700">
                                        Export Format
                                    </label>
                                    <select
                                        id="exportFormat"
                                        name="exportFormat"
                                        value={formData.exportFormat}
                                        onChange={(e) => setFormData({ ...formData, exportFormat: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="csv">CSV</option>
                                        <option value="json">JSON</option>
                                        <option value="xlsx">Excel</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email (for notifications)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>

                            {userTier !== "free" && estimatedCost > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Estimated Cost:</span>
                                        <span className="text-lg font-bold text-gray-900">${estimatedCost.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        ${tierLimits.costPer1000} per 1,000 records
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Request"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {jobs.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No export jobs</h3>
                                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new export request.</p>
                                </div>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-full ${getStatusColor(job.status)}`}>
                                                    {getStatusIcon(job.status)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {job.state || formData.state} - {job.profession || formData.profession} Export
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Created: {new Date(job.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900 capitalize">{job.status}</p>
                                                {job.processedRecords && job.totalRecords && (
                                                    <p className="text-xs text-gray-500">
                                                        {job.processedRecords.toLocaleString()} / {job.totalRecords.toLocaleString()} records
                                                    </p>
                                                )}
                                                {job.downloadUrl && (
                                                    <a
                                                        href={job.downloadUrl}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                        download
                                                    >
                                                        Download
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
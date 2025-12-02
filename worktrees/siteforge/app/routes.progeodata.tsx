import { useState, useEffect } from "react";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { Search, Download, Loader2, CheckCircle, AlertCircle, FileText, Users } from "lucide-react";

// API endpoint for the scraper
const SCRAPER_API_URL = "https://scraper-api.magicmike.workers.dev";

// US States list
const US_STATES = [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" }
];

// Professions list
const PROFESSIONS = [
    { value: "real_estate_agent", label: "Real Estate Agent" },
    { value: "insurance_agent", label: "Insurance Agent" },
    { value: "contractor", label: "Contractor" },
    { value: "dentist", label: "Dentist" },
    { value: "attorney", label: "Attorney" }
];

// Professional data interface
interface Professional {
    name: string;
    license_number: string;
    license_status: string;
    company?: string;
    city?: string;
    state: string;
    phone?: string | null;
    email?: string | null;
    specializations?: string[];
}

// Search response interface
interface SearchResponse {
    results: Professional[];
    source: string;
    state: string;
    profession: string;
    zip: string;
    total: number;
    scraped_at: string;
    error?: {
        code: string;
        message: string;
        severity: string;
    };
}

export async function loader() {
    return json({
        ENV: {
            SCRAPER_API_URL,
        },
    });
}

export default function ProGeoData() {
    const { ENV } = useLoaderData<typeof loader>();

    // Form state
    const [selectedState, setSelectedState] = useState("");
    const [selectedProfession, setSelectedProfession] = useState("");
    const [zipCode, setZipCode] = useState("");

    // UI state
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Professional[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchMetadata, setSearchMetadata] = useState<any>(null);
    const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

    // Bulk export state
    const [showBulkExport, setShowBulkExport] = useState(false);
    const [bulkExportEmail, setBulkExportEmail] = useState("");
    const [bulkExportRecords, setBulkExportRecords] = useState(100);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [bulkJobStatus, setBulkJobStatus] = useState<any>(null);

    // User tier state (simplified for demo)
    const [userTier, setUserTier] = useState<"free" | "basic" | "pro">("free");
    const [searchesToday, setSearchesToday] = useState(0);

    // Calculate search limits based on user tier
    const maxSearchesPerDay = userTier === "free" ? 10 : userTier === "basic" ? 100 : 1000;
    const remainingSearches = maxSearchesPerDay - searchesToday;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedState || !selectedProfession || !zipCode) {
            setSearchError("Please fill in all required fields");
            return;
        }

        if (remainingSearches <= 0) {
            setSearchError(`You've reached your daily limit of ${maxSearchesPerDay} searches. Upgrade your plan for more searches.`);
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);
        setSearchMetadata(null);

        try {
            const response = await fetch(`${ENV.SCRAPER_API_URL}/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    state: selectedState,
                    profession: selectedProfession,
                    zip: zipCode,
                    limit: 20
                }),
            });

            if (!response.ok) {
                throw new Error(`Search failed with status: ${response.status}`);
            }

            const data: SearchResponse = await response.json();

            setSearchResults(data.results || []);
            setSearchMetadata({
                source: data.source,
                total: data.total,
                scraped_at: data.scraped_at,
                state: data.state,
                profession: data.profession,
                zip: data.zip
            });

            // Update search count
            setSearchesToday(prev => prev + 1);

            // Check for rate limit headers
            const rateLimitHeader = response.headers.get("X-RateLimit-Remaining");
            if (rateLimitHeader) {
                setRateLimitRemaining(parseInt(rateLimitHeader));
            }

        } catch (error) {
            console.error("Search error:", error);
            setSearchError(error instanceof Error ? error.message : "Search failed. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleBulkExport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!bulkExportEmail) {
            setSearchError("Please provide your email for bulk export");
            return;
        }

        if (userTier === "free") {
            setSearchError("Bulk export is available for paid users only. Please upgrade your plan.");
            return;
        }

        setIsSubmittingBulk(true);
        setSearchError(null);

        try {
            // Simulate bulk export job submission
            // Call the bulk export API
            const response = await fetch(`/api/bulk-export`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: bulkExportEmail,
                    state: selectedState,
                    profession: selectedProfession,
                    zip: zipCode,
                    recordCount: bulkExportRecords,
                    userTier
                }),
            });

            if (!response.ok) {
                throw new Error(`Bulk export failed with status: ${response.status}`);
            }

            const jobData = await response.json();
            setBulkJobStatus(jobData);
            setShowBulkExport(false);

        } catch (error) {
            console.error("Bulk export error:", error);
            setSearchError(error instanceof Error ? error.message : "Bulk export failed. Please try again.");
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">ProGeoData</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                                Plan: <span className="font-semibold capitalize">{userTier}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                Searches Today: <span className="font-semibold">{searchesToday}/{maxSearchesPerDay}</span>
                            </div>
                            <button
                                onClick={() => setUserTier(userTier === "free" ? "basic" : userTier === "basic" ? "pro" : "free")}
                                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                                Upgrade Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Search Licensed Professionals</h2>

                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* State Dropdown */}
                            <div>
                                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                                    State *
                                </label>
                                <select
                                    id="state"
                                    value={selectedState}
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select State</option>
                                    {US_STATES.map((state) => (
                                        <option key={state.code} value={state.code}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Profession Dropdown */}
                            <div>
                                <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-2">
                                    Profession *
                                </label>
                                <select
                                    id="profession"
                                    value={selectedProfession}
                                    onChange={(e) => setSelectedProfession(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Profession</option>
                                    {PROFESSIONS.map((profession) => (
                                        <option key={profession.value} value={profession.value}>
                                            {profession.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Zip Code Input */}
                            <div>
                                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                                    ZIP Code *
                                </label>
                                <input
                                    id="zip"
                                    type="text"
                                    value={zipCode}
                                    onChange={(e) => setZipCode(e.target.value)}
                                    placeholder="Enter ZIP code"
                                    pattern="[0-9]{5}"
                                    maxLength={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Search Button and Rate Limit Info */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    type="submit"
                                    disabled={isSearching || remainingSearches <= 0}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4" />
                                            <span>Search</span>
                                        </>
                                    )}
                                </button>

                                {remainingSearches > 0 && (
                                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>{remainingSearches} searches remaining today</span>
                                    </div>
                                )}

                                {remainingSearches <= 0 && (
                                    <div className="flex items-center space-x-1 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Daily limit reached</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowBulkExport(true)}
                                disabled={userTier === "free"}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <Download className="h-4 w-4" />
                                <span>Bulk Export</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Search Error */}
                {searchError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <p className="text-red-800">{searchError}</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isSearching && (
                    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <p className="text-gray-600">Searching {selectedState} {selectedProfession?.replace('_', ' ')} licensing board...</p>
                        </div>
                    </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Search Results ({searchResults.length} found)
                            </h3>
                            {searchMetadata && (
                                <div className="text-sm text-gray-500">
                                    Source: <span className="font-medium">{searchMetadata.source}</span> •
                                    Searched: <span className="font-medium">{new Date(searchMetadata.scraped_at).toLocaleTimeString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            License #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {searchResults.map((professional, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {professional.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {professional.license_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${professional.license_status === 'Active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : professional.license_status === 'Expired'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {professional.license_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {professional.company || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {professional.city ? `${professional.city}, ${professional.state}` : professional.state}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Bulk Export Modal */}
                {showBulkExport && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Export Request</h3>

                                {userTier === "free" ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                                        <p className="text-yellow-800 text-sm">
                                            Bulk export is available for paid users only. Upgrade your plan to access bulk export functionality.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleBulkExport} className="space-y-4">
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                value={bulkExportEmail}
                                                onChange={(e) => setBulkExportEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="records" className="block text-sm font-medium text-gray-700 mb-2">
                                                Number of Records
                                            </label>
                                            <select
                                                id="records"
                                                value={bulkExportRecords}
                                                onChange={(e) => setBulkExportRecords(parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value={100}>100 records</option>
                                                <option value={500}>500 records</option>
                                                <option value={1000}>1,000 records</option>
                                                <option value={5000}>5,000 records</option>
                                            </select>
                                        </div>

                                        <div className="bg-gray-50 rounded-md p-3">
                                            <p className="text-sm text-gray-600">
                                                <strong>Export Details:</strong><br />
                                                State: {selectedState}<br />
                                                Profession: {selectedProfession?.replace('_', ' ')}<br />
                                                ZIP: {zipCode}<br />
                                                Records: {bulkExportRecords}
                                            </p>
                                        </div>

                                        <div className="flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowBulkExport(false)}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmittingBulk}
                                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                {isSubmittingBulk ? 'Submitting...' : 'Submit Request'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Job Status */}
                {bulkJobStatus && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <FileText className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Bulk Export Job Status</h3>
                        </div>

                        <div className="bg-gray-50 rounded-md p-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Job ID:</strong> {bulkJobStatus.jobId}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Status:</strong> <span className="font-medium">{bulkJobStatus.status}</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Email:</strong> {bulkJobStatus.email}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Estimated Completion:</strong> {bulkJobStatus.estimatedCompletion}
                            </p>

                            {bulkJobStatus.status === 'completed' && bulkJobStatus.downloadUrl && (
                                <div className="mt-4">
                                    <a
                                        href={bulkJobStatus.downloadUrl}
                                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>Download Export</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
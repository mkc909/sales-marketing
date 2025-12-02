interface SearchResult {
    name: string;
    licenseNumber: string;
    status: string;
    location: string;
    profession: string;
    issueDate: string;
    expirationDate: string;
    dataQuality?: {
        hasValidName: boolean;
        hasValidLicense: boolean;
        hasValidStatus: boolean;
        hasValidLocation: boolean;
    };
}

interface ResultsTableProps {
    results?: SearchResult[];
    userTier?: string;
    searchesRemaining?: number;
}

export function ResultsTable({ results = [], userTier = "free", searchesRemaining = 10 }: ResultsTableProps) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
                return "text-green-600 bg-green-100";
            case "expired":
                return "text-red-600 bg-red-100";
            case "pending":
                return "text-yellow-600 bg-yellow-100";
            default:
                return "text-gray-600 bg-gray-100";
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier.toLowerCase()) {
            case "pro":
                return "text-purple-600 bg-purple-100";
            case "basic":
                return "text-blue-600 bg-blue-100";
            default:
                return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <div className="space-y-6">
            {/* Rate Limit Indicator */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Rate Limit Status
                    </h3>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Account Type:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(userTier)}`}>
                            {userTier.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">|</span>
                        <span className="text-sm font-medium text-gray-900">
                            {searchesRemaining} searches remaining today
                        </span>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            {results.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Profession
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <div className="flex items-center">
                                                {result.name}
                                                {result.dataQuality && (
                                                    <div className="ml-2 flex space-x-1">
                                                        {result.dataQuality.hasValidName && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Valid name">
                                                                ✓
                                                            </span>
                                                        )}
                                                        {result.dataQuality.hasValidLicense && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="Valid license">
                                                                ⦁
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`font-mono ${result.dataQuality?.hasValidLicense ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.licenseNumber}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.status)}`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {result.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {result.profession}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 0v6m0-6 0h6" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Try adjusting your search criteria and search again.
                    </p>
                </div>
            )}
        </div>
    );
}
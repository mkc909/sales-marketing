import { useState } from "react";

interface SearchFormProps {
    isLoading?: boolean;
    onSearch?: (formData: { state: string; profession: string; zip: string }) => Promise<void>;
}

export function SearchForm({ isLoading = false, onSearch }: SearchFormProps) {
    const [formData, setFormData] = useState({
        state: "",
        profession: "",
        zip: "",
    });

    const states = [
        { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
        { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
        { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
        { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
        { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
        { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
        { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
        { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
        { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
        { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
        { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
        { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
        { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
        { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
        { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
        { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
        { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }
    ];

    const professions = [
        { value: "real-estate", label: "Real Estate" },
        { value: "real-estate-broker", label: "Real Estate Broker" },
        { value: "insurance", label: "Insurance Agent" },
        { value: "insurance-adjuster", label: "Insurance Adjuster" },
        { value: "contractor", label: "General Contractor" },
        { value: "contractor-electrical", label: "Electrical Contractor" },
        { value: "contractor-plumbing", label: "Plumbing Contractor" },
        { value: "contractor-hvac", label: "HVAC Contractor" },
        { value: "medical", label: "Medical Doctor" },
        { value: "medical-dentist", label: "Dentist" },
        { value: "medical-pharmacist", label: "Pharmacist" },
        { value: "legal", label: "Attorney" },
        { value: "legal-paralegal", label: "Paralegal" },
        { value: "financial", label: "Financial Advisor" },
        { value: "financial-accountant", label: "Accountant" },
        { value: "engineering", label: "Engineer" },
        { value: "engineering-civil", label: "Civil Engineer" },
        { value: "architecture", label: "Architect" },
        { value: "veterinary", label: "Veterinarian" },
        { value: "education", label: "Teacher" },
        { value: "education-administrator", label: "School Administrator" }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (onSearch) {
            await onSearch(formData);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* State Dropdown */}
                <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                        State
                    </label>
                    <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select a state</option>
                        {states.map((state) => (
                            <option key={state.value} value={state.value}>
                                {state.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Profession Dropdown */}
                <div>
                    <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-2">
                        Profession
                    </label>
                    <select
                        id="profession"
                        value={formData.profession}
                        onChange={(e) => handleInputChange("profession", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select a profession</option>
                        {professions.map((profession) => (
                            <option key={profession.value} value={profession.value}>
                                {profession.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ZIP Code Input */}
                <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                    </label>
                    <input
                        type="text"
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => handleInputChange("zip", e.target.value)}
                        placeholder="Enter ZIP code"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            </div>

            {/* Search Button */}
            <div className="flex justify-center">
                <button
                    type="submit"
                    disabled={isLoading || !formData.state || !formData.profession || !formData.zip}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching {formData.state} licensing board...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search Licenses
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
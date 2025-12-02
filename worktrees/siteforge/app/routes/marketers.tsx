import type { MetaFunction } from "@remix-run/cloudflare";
import { Link, Form } from "@remix-run/react";
import { useState } from "react";
import { Search, MapPin, Users, TrendingUp, BarChart3, Target, Zap, Shield, CheckCircle, ArrowRight, Star } from "lucide-react";

export const meta: MetaFunction = () => {
    return [
        { title: "ProGeoData for Marketers - Professional License Data" },
        { name: "description", content: "Access verified professional license data for marketing campaigns. Build targeted lists with real-time licensing information." },
    ];
};

export default function MarketersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to ProGeoData with search parameters
        window.location.href = `/progeodata?profession=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link to="/" className="text-xl font-bold text-gray-900">
                                ProGeoData
                            </Link>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                to="/pricing"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Pricing
                            </Link>
                            <Link
                                to="/auth/login"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Sign In
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full px-4 py-2 text-sm font-medium mb-6">
                            <Target className="w-4 h-4" />
                            For Marketing Professionals
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                            Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Verified Professional</span><br />
                            License Data for Marketing
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                            Build targeted marketing campaigns with real-time professional licensing data.
                            Connect with licensed professionals across all industries with confidence.
                        </p>

                        {/* Search Component */}
                        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-2 mb-8">
                            <Form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by profession (e.g., Real Estate Agent, Doctor, Lawyer)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                    />
                                </div>
                                <div className="lg:w-48 relative">
                                    <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="State or ZIP"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    <Search className="w-5 h-5" />
                                    Search Database
                                </button>
                            </Form>
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Access 2M+ licensed professionals across all 50 states
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Why Marketers Choose ProGeoData
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Build more effective campaigns with verified, up-to-date professional licensing information
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Verified Data</h3>
                            <p className="text-gray-600">
                                All license information is verified directly from state licensing boards, ensuring accuracy for your campaigns.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Updates</h3>
                            <p className="text-gray-600">
                                License status updates in real-time, so you're always working with current information.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <Target className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Precise Targeting</h3>
                            <p className="text-gray-600">
                                Filter by license type, status, location, and more to create highly targeted marketing lists.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                                <BarChart3 className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Comprehensive Coverage</h3>
                            <p className="text-gray-600">
                                Access 2M+ licensed professionals across real estate, healthcare, legal, financial services, and more.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Compliance Ready</h3>
                            <p className="text-gray-600">
                                Built with compliance in mind, helping you maintain regulatory standards for professional outreach.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                                <TrendingUp className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Higher ROI</h3>
                            <p className="text-gray-600">
                                Reach the right professionals with verified contact information, improving campaign effectiveness.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Marketing Use Cases
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            See how other marketing teams use ProGeoData to drive results
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Lead Generation</h3>
                            <p className="text-gray-600 mb-4">
                                Build targeted lists of active professionals for your sales team. Filter by license status,
                                location, and specialty to identify high-potential leads.
                            </p>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Real estate agents by market area
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Healthcare providers by specialty
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Financial advisors by certification
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Market Research</h3>
                            <p className="text-gray-600 mb-4">
                                Analyze professional density and trends across markets. Identify opportunities for expansion
                                and understand competitive landscapes.
                            </p>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Professional density by ZIP code
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    License renewal trends
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    New license issuances by month
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Event Marketing</h3>
                            <p className="text-gray-600 mb-4">
                                Invite the right professionals to your events, webinars, and conferences.
                                Ensure attendees are actively licensed in relevant fields.
                            </p>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Continuing education events
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Industry networking events
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Product launch webinars
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Compliance Monitoring</h3>
                            <p className="text-gray-600 mb-4">
                                Monitor license status for your professional network. Ensure partners and distributors
                                maintain active licensing status.
                            </p>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Automated license status alerts
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Renewal deadline tracking
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Compliance reporting
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Trusted by Marketing Teams
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-gray-600 mb-4">
                                "ProGeoData transformed our lead generation. We're reaching 3x more qualified prospects
                                with half the effort. The data quality is exceptional."
                            </p>
                            <div className="font-semibold text-gray-900">Sarah Chen</div>
                            <div className="text-gray-600">Marketing Director, RealTech Solutions</div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-gray-600 mb-4">
                                "The real-time license updates are a game-changer. We can confidently market to professionals
                                knowing their license status is current."
                            </p>
                            <div className="font-semibold text-gray-900">Michael Rodriguez</div>
                            <div className="text-gray-600">Growth Marketing Lead, HealthConnect</div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-gray-600 mb-4">
                                "We've reduced our compliance risk significantly. ProGeoData helps us maintain
                                regulatory standards while scaling our outreach."
                            </p>
                            <div className="font-semibold text-gray-900">Jennifer Liu</div>
                            <div className="text-gray-600">CMO, Financial Services Inc.</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Start Building Better Campaigns Today
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join thousands of marketers using verified professional data to drive results
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/auth/login"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105"
                        >
                            Start Free Trial
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition-all"
                        >
                            View Pricing
                        </Link>
                    </div>
                    <p className="text-blue-100 mt-6 text-sm">
                        No credit card required • 10 free searches to start
                    </p>
                </div>
            </section>
        </div>
    );
}
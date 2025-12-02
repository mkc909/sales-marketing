import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
    return [
        { title: "Terms of Service - ProGeoData" },
        { name: "description", content: "ProGeoData Terms of Service and legal agreement" },
    ];
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
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
                                to="/auth/login"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/pricing"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Terms of Service
                    </h1>

                    <div className="prose prose-lg max-w-none">
                        <p className="text-gray-600 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                            <p className="text-gray-700 mb-4">
                                By accessing and using ProGeoData ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                            <p className="text-gray-700 mb-4">
                                ProGeoData is a professional license database search service that provides access to public professional licensing information. We aggregate data from various public sources and make it searchable through our platform.
                            </p>
                            <p className="text-gray-700 mb-4">
                                Our service includes:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Search functionality for professional licenses</li>
                                <li>Export capabilities for paid subscribers</li>
                                <li>Search history tracking</li>
                                <li>API access for enterprise customers</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
                            <p className="text-gray-700 mb-4">
                                To use certain features of the Service, you must register for an account. You agree to:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and update your account information promptly</li>
                                <li>Maintain the security of your password and account</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized use of your account</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Subscription Plans and Payment</h2>
                            <p className="text-gray-700 mb-4">
                                ProGeoData offers various subscription plans with different features and usage limits:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li><strong>Free Plan:</strong> 10 searches per day with basic features</li>
                                <li><strong>Starter Plan:</strong> 500 searches per month with advanced features</li>
                                <li><strong>Growth Plan:</strong> 2,500 searches per month with team features</li>
                                <li><strong>Scale Plan:</strong> 10,000 searches per month with API access</li>
                            </ul>
                            <p className="text-gray-700 mb-4">
                                Payment terms:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Monthly subscription fees are billed in advance</li>
                                <li>All fees are non-refundable except as specified in our refund policy</li>
                                <li>We reserve the right to change pricing with 30 days notice</li>
                                <li>Your subscription will automatically renew unless cancelled</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
                            <p className="text-gray-700 mb-4">
                                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Use the Service for any illegal or unauthorized purpose</li>
                                <li>Violate any international, federal, provincial, or local laws or regulations</li>
                                <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                                <li>Harass, abuse, or harm others in any way</li>
                                <li>Use automated systems to access the Service without express permission</li>
                                <li>Resell or redistribute the Service or data without authorization</li>
                                <li>Attempt to gain unauthorized access to our systems or data</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Accuracy and Availability</h2>
                            <p className="text-gray-700 mb-4">
                                While we strive to provide accurate and up-to-date information, please note:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>License information is provided "as is" without any warranties</li>
                                <li>We do not guarantee the accuracy, completeness, or timeliness of data</li>
                                <li>You should verify critical information with the original licensing authorities</li>
                                <li>We are not responsible for decisions made based on our data</li>
                                <li>Service availability may be interrupted for maintenance or technical issues</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
                            <p className="text-gray-700 mb-4">
                                The Service and its original content, features, and functionality are owned by ProGeoData and are protected by international copyright, trademark, and other intellectual property laws.
                            </p>
                            <p className="text-gray-700 mb-4">
                                You may not:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Copy, modify, distribute, or create derivative works of the Service</li>
                                <li>Reverse engineer, decompile, or disassemble the Service</li>
                                <li>Use our trademarks, service marks, or logos without permission</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Privacy</h2>
                            <p className="text-gray-700 mb-4">
                                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection and use of your information.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
                            <p className="text-gray-700 mb-4">
                                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation.
                            </p>
                            <p className="text-gray-700 mb-4">
                                You may also terminate your account at any time through your account settings or by contacting our support team.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
                            <p className="text-gray-700 mb-4">
                                To the maximum extent permitted by law, ProGeoData shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                            </p>
                            <p className="text-gray-700 mb-4">
                                Our total liability to you for any cause of action whatsoever, and regardless of the form of the action, will at all times be limited to the amount paid, if any, by you to us for the Service during the term of membership.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
                            <p className="text-gray-700 mb-4">
                                These Terms shall be interpreted and governed by the laws of the jurisdiction in which ProGeoData operates, without regard to conflict of law provisions.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
                            <p className="text-gray-700 mb-4">
                                We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or by posting a notice on our site prior to the effective date of the changes.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
                            <p className="text-gray-700 mb-4">
                                If you have any questions about these Terms, please contact us at:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-gray-700">
                                    <strong>Email:</strong> legal@progeodata.com<br />
                                    <strong>Address:</strong> [Your Business Address]<br />
                                    <strong>Phone:</strong> [Your Phone Number]
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
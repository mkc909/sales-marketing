import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
    return [
        { title: "Privacy Policy - ProGeoData" },
        { name: "description", content: "ProGeoData Privacy Policy - How we collect, use, and protect your information" },
    ];
};

export default function PrivacyPage() {
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
                        Privacy Policy
                    </h1>

                    <div className="prose prose-lg max-w-none">
                        <p className="text-gray-600 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <p className="text-gray-700 mb-8">
                            At ProGeoData, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our professional license search service.
                        </p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Account Information</h3>
                            <p className="text-gray-700 mb-4">
                                When you create an account, we collect:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Full name and email address</li>
                                <li>Password (encrypted and securely stored)</li>
                                <li>Google OAuth information (if you choose to sign up with Google)</li>
                                <li>Billing information (processed through secure third-party payment processors)</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Usage Information</h3>
                            <p className="text-gray-700 mb-4">
                                We automatically collect information about your use of our service:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Search queries and parameters</li>
                                <li>Search frequency and timing</li>
                                <li>Features accessed and pages visited</li>
                                <li>IP address and general location (for security and analytics)</li>
                                <li>Browser type and device information</li>
                                <li>Cookies and similar tracking technologies</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Communications</h3>
                            <p className="text-gray-700 mb-4">
                                We may collect information when you communicate with us:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Customer support inquiries and responses</li>
                                <li>Feedback and suggestions</li>
                                <li>Survey responses (if you choose to participate)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Provision</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>To provide and maintain our search service</li>
                                <li>To process your subscription and payments</li>
                                <li>To track your search usage and credits</li>
                                <li>To provide customer support and respond to inquiries</li>
                                <li>To send important account and service notifications</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Improvement and Analytics</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>To analyze usage patterns and improve our service</li>
                                <li>To conduct research and development for new features</li>
                                <li>To ensure the security and stability of our platform</li>
                                <li>To personalize your experience (with your consent)</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Communications</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>To send transactional emails (password resets, receipts, etc.)</li>
                                <li>To send marketing communications (with your consent)</li>
                                <li>To respond to your questions and support requests</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information Sharing</h2>

                            <p className="text-gray-700 mb-4">
                                We do not sell, rent, or trade your personal information. We may share your information only in the following circumstances:
                            </p>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Providers</h3>
                            <p className="text-gray-700 mb-4">
                                We may share information with trusted third-party service providers who assist us in operating our service:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Payment processors (for subscription billing)</li>
                                <li>Cloud hosting providers (for data storage and processing)</li>
                                <li>Analytics services (for usage analysis)</li>
                                <li>Email service providers (for communications)</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Legal Requirements</h3>
                            <p className="text-gray-700 mb-4">
                                We may disclose your information if required by law or in good faith belief that such action is necessary to:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Comply with legal obligations</li>
                                <li>Protect and defend our rights or property</li>
                                <li>Prevent or investigate possible wrongdoing</li>
                                <li>Protect user safety</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
                            <p className="text-gray-700 mb-4">
                                We implement appropriate technical and organizational measures to protect your personal information:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Secure authentication and access controls</li>
                                <li>Regular security audits and assessments</li>
                                <li>Employee training on data protection</li>
                                <li>Incident response procedures</li>
                            </ul>
                            <p className="text-gray-700 mb-4">
                                However, no method of transmission over the internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
                            <p className="text-gray-700 mb-4">
                                We retain your personal information only as long as necessary for the purposes outlined in this Privacy Policy:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Account information: Retained while your account is active</li>
                                <li>Search history: Retained according to your subscription plan (30-90 days for paid plans)</li>
                                <li>Usage analytics: Retained in aggregated, anonymized form</li>
                                <li>Legal requirements: Retained as required by applicable laws</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
                            <p className="text-gray-700 mb-4">
                                Depending on your location, you may have the following rights regarding your personal information:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li><strong>Access:</strong> Request a copy of your personal information</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                                <li><strong>Restriction:</strong> Request limitation of how we use your information</li>
                                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                            </ul>
                            <p className="text-gray-700 mb-4">
                                To exercise these rights, please contact us at privacy@progeodata.com. We will respond within 30 days.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
                            <p className="text-gray-700 mb-4">
                                We use cookies and similar technologies to enhance your experience:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
                                <li><strong>Authentication Cookies:</strong> Keep you logged in to your account</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how you use our service</li>
                                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                            </ul>
                            <p className="text-gray-700 mb-4">
                                You can control cookies through your browser settings, but disabling certain cookies may affect site functionality.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Links</h2>
                            <p className="text-gray-700 mb-4">
                                Our service may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party sites you visit.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
                            <p className="text-gray-700 mb-4">
                                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
                            <p className="text-gray-700 mb-4">
                                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
                            <p className="text-gray-700 mb-4">
                                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                            <p className="text-gray-700 mb-4">
                                If you have any questions about this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-gray-700">
                                    <strong>Email:</strong> privacy@progeodata.com<br />
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
import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
    return [
        { title: "Refund Policy - ProGeoData" },
        { name: "description", content: "ProGeoData Refund Policy and money-back guarantee details" },
    ];
};

export default function RefundPage() {
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
                        Refund Policy
                    </h1>

                    <div className="prose prose-lg max-w-none">
                        <p className="text-gray-600 mb-8">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                            <h2 className="text-xl font-semibold text-green-800 mb-3">
                                30-Day Money-Back Guarantee
                            </h2>
                            <p className="text-green-700">
                                We're confident you'll love ProGeoData. If you're not completely satisfied with your paid subscription, we offer a full refund within 30 days of your initial purchase.
                            </p>
                        </div>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Eligibility for Refunds</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">What's Eligible</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>New paid subscriptions (Starter, Growth, or Scale plans)</li>
                                <li>Requests made within 30 days of initial purchase</li>
                                <li>First-time customers requesting their first refund</li>
                                <li>Technical issues that prevent use of our service (if reported promptly)</li>
                                <li>Dissatisfaction with service quality or features</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">What's Not Eligible</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Free plan subscriptions</li>
                                <li>Requests made after 30 days from purchase</li>
                                <li>Multiple refunds for the same customer</li>
                                <li>Usage exceeding reasonable limits (more than 100 searches for paid plans)</li>
                                <li>Refunds requested due to data accuracy issues (we provide public data as-is)</li>
                                <li>Account violations or terms of service breaches</li>
                                <li>Refunds for already consumed credits or services</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Request a Refund</h2>

                            <div className="bg-gray-50 p-6 rounded-md mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Refund Process</h3>
                                <ol className="list-decimal pl-6 text-gray-700 space-y-3">
                                    <li><strong>Contact Support:</strong> Email us at refunds@progeodata.com with your account details</li>
                                    <li><strong>Include Information:</strong> Provide your account email, subscription plan, and reason for refund</li>
                                    <li><strong>Review Period:</strong> Our team will review your request within 3-5 business days</li>
                                    <li><strong>Processing:</strong> Approved refunds are processed within 5-7 business days</li>
                                    <li><strong>Confirmation:</strong> You'll receive email confirmation when your refund is processed</li>
                                </ol>
                            </div>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Required Information</h3>
                            <p className="text-gray-700 mb-4">
                                To process your refund request, please include:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Account email address</li>
                                <li>Subscription plan purchased</li>
                                <li>Date of purchase</li>
                                <li>Reason for refund request</li>
                                <li>Any technical issues encountered (if applicable)</li>
                                <li>Suggestions for improvement (optional but appreciated)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Refund Amounts</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Full Refunds</h3>
                            <p className="text-gray-700 mb-4">
                                Full refunds are available for:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Requests within 30 days of purchase</li>
                                <li>Usage under 100 searches for paid plans</li>
                                <li>First-time refund requests</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Partial Refunds</h3>
                            <p className="text-gray-700 mb-4">
                                Partial refunds may be considered for:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Requests within 30 days with high usage</li>
                                <li>Technical issues that partially affected service</li>
                                <li>Service interruptions exceeding 24 hours</li>
                            </ul>
                            <p className="text-gray-700">
                                Partial refund amounts are determined case-by-case based on usage and circumstances.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Subscription Cancellation</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Immediate Cancellation</h3>
                            <p className="text-gray-700 mb-4">
                                You can cancel your subscription at any time through your account settings or by contacting support. Upon cancellation:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Your access continues until the end of your billing period</li>
                                <li>No future charges will be processed</li>
                                <li>You retain access to paid features until the period ends</li>
                                <li>Your data and search history remain accessible during this period</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Refund vs. Cancellation</h3>
                            <p className="text-gray-700 mb-4">
                                <strong>Cancellation:</strong> Stops future billing but doesn't refund current period charges<br />
                                <strong>Refund:</strong> Returns money for current period if eligible under our policy
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Special Circumstances</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Outages</h3>
                            <p className="text-gray-700 mb-4">
                                If our service experiences extended downtime:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>< 24 hours: No automatic refund, but you can request one</li>
                                <li>24-48 hours: Pro-rated refund for affected days</li>
                                <li>> 48 hours: Full month refund upon request</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Data Accuracy Issues</h3>
                            <p className="text-gray-700 mb-4">
                                We provide public licensing data "as is" and cannot guarantee accuracy. However:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>System-wide data errors affecting all users may qualify for refunds</li>
                                <li>Individual record inaccuracies do not qualify for refunds</li>
                                <li>We recommend verifying critical information with original sources</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Payment Method Refunds</h2>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Credit Card Refunds</h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Refunds are credited to the original payment method</li>
                                <li>Processing time: 5-7 business days</li>
                                <li>Your bank may require additional processing time</li>
                                <li>We'll provide confirmation once the refund is initiated</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Third-Party Payments</h3>
                            <p className="text-gray-700 mb-4">
                                For payments processed through third-party services (PayPal, etc.):
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Refund processing follows the third-party's policies</li>
                                <li>Additional processing time may be required</li>
                                <li>We'll initiate the refund promptly on our end</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Exceptions</h2>
                            <p className="text-gray-700 mb-4">
                                We reserve the right to deny refund requests in cases of:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Suspected fraud or abuse of our refund policy</li>
                                <li>Multiple refund requests from the same customer</li>
                                <li>Violation of our Terms of Service</li>
                                <li>Excessive usage indicating satisfaction with the service</li>
                                <li>Requests made after the 30-day window</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                            <p className="text-gray-700 mb-4">
                                For refund requests or questions about this policy, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-gray-700">
                                    <strong>Refund Requests:</strong> refunds@progeodata.com<br />
                                    <strong>General Support:</strong> support@progeodata.com<br />
                                    <strong>Phone:</strong> [Your Phone Number]<br />
                                    <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Policy Changes</h2>
                            <p className="text-gray-700 mb-4">
                                We reserve the right to modify this refund policy at any time. Changes will be effective immediately upon posting on our website. Your continued use of our service constitutes acceptance of any changes.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
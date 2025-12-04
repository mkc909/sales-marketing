import type { MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {
    Check,
    X,
    Star,
    Zap,
    Users,
    TrendingUp,
    ArrowRight,
    CreditCard,
    Clock,
    Loader2
} from "lucide-react";
// Using feature flags directly since ProGeoDataFeatureFlags is nested
const ProGeoDataFeatureFlags = {
    isEnabled: (featurePath: string) => {
        // Simple feature flag implementation for pricing page
        const features = {
            'api.salesEnabled': false,
            'api.comingSoon': true,
        };
        return Boolean(features[featurePath as keyof typeof features]);
    }
};
import { getSessionByToken } from "../lib/auth.server";

export const meta: MetaFunction = () => {
    return [
        { title: "Pricing - ProGeoData" },
        { name: "description", content: "Choose the perfect plan for your professional license search needs" },
    ];
};

export async function loader({ request, context }: { request: Request; context: any }) {
    // Check if user is authenticated
    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = cookieHeader
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("session_token="))
        ?.split("=")[1];

    let isAuthenticated = false;
    if (sessionToken) {
        const session = await getSessionByToken(context, sessionToken);
        isAuthenticated = !!session;
    }

    return json({
        isAuthenticated,
        plans: [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                period: 'forever',
                description: 'Perfect for trying out ProGeoData',
                features: [
                    '10 searches per day',
                    'Basic search filters',
                    'Email support',
                    'Search history (30 days)'
                ],
                limitations: [
                    'No bulk export',
                    'No API access',
                    'Limited to basic professions'
                ],
                highlighted: false,
                buttonText: 'Get Started',
                buttonLink: '/auth/login'
            },
            {
                id: 'starter',
                name: 'Starter',
                price: 24, // Updated to $24 as per requirements
                period: 'month',
                description: 'Great for individual professionals',
                features: [
                    '500 searches per month',
                    'Advanced search filters',
                    'Priority email support',
                    'Search history (90 days)',
                    'Bulk export (CSV)',
                    'All professions included'
                ],
                limitations: [
                    ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? 'No API access' : 'API access coming soon',
                    'Limited to 1,000 records per export'
                ],
                highlighted: true,
                buttonText: isAuthenticated ? 'Get Started' : 'Start Free Trial',
                buttonLink: '/auth/login',
                coupon: 'HOLIDAY50'
            },
            {
                id: 'growth',
                name: 'Growth',
                price: 74, // Updated to $74 as per requirements
                period: 'month',
                description: 'Ideal for growing teams',
                features: [
                    '2,500 searches per month',
                    'Advanced search filters',
                    'Priority support',
                    'Unlimited search history',
                    'Bulk export (CSV, Excel)',
                    'All professions included',
                    'Team collaboration tools',
                    'Custom reports'
                ],
                limitations: [
                    ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? 'No API access' : 'API access coming soon',
                    'Limited to 5,000 records per export'
                ],
                highlighted: false,
                buttonText: isAuthenticated ? 'Get Started' : 'Start Free Trial',
                buttonLink: '/auth/login',
                coupon: 'HOLIDAY50'
            },
            {
                id: 'agency',
                name: 'Agency',
                price: 149, // Updated to $149 as per requirements
                period: 'month',
                description: 'Perfect for large organizations',
                features: [
                    '10,000 searches per month',
                    'Advanced search filters',
                    'Dedicated support',
                    'Unlimited search history',
                    'Bulk export (all formats)',
                    'All professions included',
                    'Team collaboration tools',
                    'Custom reports',
                    ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? 'API access' : 'API access (Coming Soon)',
                    'White-label options',
                    'Custom integrations'
                ],
                limitations: [],
                highlighted: false,
                buttonText: isAuthenticated ? 'Get Started' : 'Start Free Trial',
                buttonLink: '/auth/login',
                coupon: 'HOLIDAY50'
            }
        ]
    });
}

export default function PricingPage() {
    const { plans, isAuthenticated } = useLoaderData<typeof loader>();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('HOLIDAY50');
    const navigate = useNavigate();

    const handleCheckout = async (planId: string) => {
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }

        setLoadingPlan(planId);

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planType: planId,
                    couponCode: couponCode || undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const data = await response.json() as { url: string };
            window.location.href = data.url;
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
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
                                to="/auth/login"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <h1 className="text-4xl font-bold mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl mb-8 text-blue-100">
                        Choose the perfect plan for your professional license search needs
                    </p>

                    {/* Holiday Promotion Banner */}
                    <div className="inline-flex items-center bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full font-semibold">
                        <Star className="w-5 h-5 mr-2" />
                        Limited Time: 50% OFF with code HOLIDAY50
                    </div>

                    {/* Coupon Input */}
                    <div className="mt-6 max-w-md mx-auto">
                        <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <label htmlFor="coupon" className="text-white text-sm font-medium mr-3">
                                Coupon Code:
                            </label>
                            <input
                                type="text"
                                id="coupon"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="HOLIDAY50"
                                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${plan.highlighted ? 'ring-2 ring-blue-500 transform scale-105' : ''
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        {plan.name}
                                    </h3>
                                    <p className="text-gray-600 mb-4">{plan.description}</p>

                                    <div className="mb-4">
                                        <span className="text-4xl font-bold text-gray-900">
                                            ${plan.price}
                                        </span>
                                        {plan.period && (
                                            <span className="text-gray-600">/{plan.period}</span>
                                        )}
                                    </div>

                                    {'coupon' in plan && plan.coupon && (
                                        <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                            <Zap className="w-4 h-4 mr-1" />
                                            {plan.coupon} - 50% OFF
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features.map((feature, index) => (
                                        <div key={index} className="flex items-start">
                                            <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{feature}</span>
                                        </div>
                                    ))}

                                    {plan.limitations && plan.limitations.length > 0 && (
                                        <>
                                            {plan.limitations.map((limitation, index) => (
                                                <div key={index} className="flex items-start">
                                                    <X className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-500 text-sm">{limitation}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {'enterprise' in plan && plan.enterprise ? (
                                        <Link
                                            to={plan.buttonLink}
                                            className="w-full flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            <Users className="w-5 h-5 mr-2" />
                                            {plan.buttonText}
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckout(plan.id)}
                                            disabled={loadingPlan === plan.id}
                                            className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${plan.highlighted
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                                                } ${loadingPlan === plan.id ? 'opacity-75 cursor-not-allowed' : ''}`}
                                        >
                                            {loadingPlan === plan.id ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : plan.price === 0 ? (
                                                <>
                                                    <Users className="w-5 h-5 mr-2" />
                                                    {plan.buttonText}
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard className="w-5 h-5 mr-2" />
                                                    {plan.buttonText}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features Comparison */}
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Compare All Features
                        </h2>
                        <p className="text-xl text-gray-600">
                            See exactly what's included in each plan
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Free
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Starter
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Growth
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Scale
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        Monthly Searches
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        10/day
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                                        500
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                                        2,500
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                                        10,000
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        Search History
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        30 days
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        90 days
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        Unlimited
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                        Unlimited
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        Bulk Export
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        API Access
                                        {ProGeoDataFeatureFlags.isEnabled('api.comingSoon') && (
                                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Coming Soon
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? (
                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                                {ProGeoDataFeatureFlags.isEnabled('api.comingSoon') && (
                                                    <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? (
                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                                {ProGeoDataFeatureFlags.isEnabled('api.comingSoon') && (
                                                    <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {ProGeoDataFeatureFlags.isEnabled('api.salesEnabled') ? (
                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                                {ProGeoDataFeatureFlags.isEnabled('api.comingSoon') && (
                                                    <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gray-50 py-16">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Can I change my plan anytime?
                            </h3>
                            <p className="text-gray-600">
                                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                What happens if I exceed my search limit?
                            </h3>
                            <p className="text-gray-600">
                                You'll receive a notification when you approach your limit. Once reached, you can either upgrade your plan or wait for your limit to reset (daily for Free, monthly for paid plans).
                            </p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Do you offer refunds?
                            </h3>
                            <p className="text-gray-600">
                                Yes, we offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund.
                            </p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Is my data secure?
                            </h3>
                            <p className="text-gray-600">
                                Absolutely. We use industry-standard encryption and security practices to protect your data. All searches are conducted over secure connections, and we never share your information with third parties.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-blue-600 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-xl mb-8 text-blue-100">
                        Join thousands of professionals using ProGeoData to verify licenses efficiently.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/auth/login"
                            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Start Free Trial
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Talk to Sales
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
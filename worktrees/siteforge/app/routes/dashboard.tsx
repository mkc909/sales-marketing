import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import {
    getSessionByToken,
    getUserSubscription,
    getUserSearchHistory,
    checkRateLimit
} from "~/lib/auth.server";
import {
    User,
    Search,
    CreditCard,
    Activity,
    Settings,
    LogOut,
    TrendingUp,
    Calendar,
    BarChart3,
    Loader2
} from "lucide-react";

export const meta: MetaFunction = () => {
    return [
        { title: "Dashboard - ProGeoData" },
        { name: "description", content: "Manage your ProGeoData account and view your search history" },
    ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = cookieHeader
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("session_token="))
        ?.split("=")[1];

    if (!sessionToken) {
        return redirect("/auth/login?message=Please log in to access your dashboard");
    }

    try {
        // Get session from token
        const session = await getSessionByToken(context, sessionToken);
        if (!session) {
            return redirect("/auth/login?message=Your session has expired");
        }

        // Get user from session
        const user = await context.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(session.userId).first();

        if (!user) {
            return redirect("/auth/login?message=User not found");
        }

        // Get user subscription details
        const subscription = await getUserSubscription(context, user.id as string);

        // Get search history
        const searchHistory = await getUserSearchHistory(context, user.id as string, 10);

        // Get usage stats
        const today = new Date().toISOString().split('T')[0];
        const usageStats = await context.env.DB.prepare(`
      SELECT 
        COUNT(*) as today_searches,
        SUM(credits_consumed) as today_credits
      FROM credits_usage 
      WHERE user_id = ? AND date = ?
    `).bind(user.id, today).first();

        const monthlyStats = await context.env.DB.prepare(`
      SELECT 
        COUNT(*) as monthly_searches,
        SUM(credits_consumed) as monthly_credits
      FROM credits_usage 
      WHERE user_id = ? AND date >= date('now', 'start of month')
    `).bind(user.id).first();

        return json({
            user: {
                id: user.id as string,
                email: user.email as string,
                firstName: user.first_name as string,
                lastName: user.last_name as string,
                subscriptionTier: user.subscription_tier as string,
                subscriptionStatus: user.subscription_status as string,
                emailVerified: Boolean(user.email_verified),
                avatarUrl: user.avatar_url as string
            },
            subscription,
            searchHistory: searchHistory.results || [],
            usageStats: {
                today: {
                    searches: Number(usageStats?.today_searches) || 0,
                    credits: Number(usageStats?.today_credits) || 0
                },
                monthly: {
                    searches: Number(monthlyStats?.monthly_searches) || 0,
                    credits: Number(monthlyStats?.monthly_credits) || 0
                }
            }
        });
    } catch (error) {
        console.error("Dashboard loader error:", error);
        return redirect("/auth/login?error=Failed to load dashboard");
    }
}

export default function Dashboard() {
    const data = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const [isCancelling, setIsCancelling] = useState(false);
    const showSuccess = searchParams.get("signup") === "success";
    const checkoutSuccess = searchParams.get("checkout") === "success";
    const checkoutPlan = searchParams.get("plan");

    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
            return;
        }

        setIsCancelling(true);

        try {
            const response = await fetch('/api/stripe/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'cancel'
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to cancel subscription');
            }

            const result = await response.json() as { message?: string };
            alert(result.message || 'Subscription cancelled successfully');

            // Refresh the page to show updated status
            window.location.reload();
        } catch (error) {
            console.error('Cancellation error:', error);
            alert('Failed to cancel subscription. Please try again or contact support.');
        } finally {
            setIsCancelling(false);
        }
    };

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
                                to="/progeodata"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Search
                            </Link>
                            <Link
                                to="/dashboard/settings"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Settings
                            </Link>
                            <form
                                action="/auth/logout"
                                method="post"
                                className="inline"
                            >
                                <button
                                    type="submit"
                                    className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    <LogOut className="h-4 w-4 mr-1" />
                                    Logout
                                </button>
                            </form>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Success Messages */}
            {showSuccess && (
                <div className="bg-green-50 border-b border-green-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-800">
                                    Welcome to ProGeoData! Your account has been created successfully.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {checkoutSuccess && (
                <div className="bg-green-50 border-b border-green-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-800">
                                    🎉 Congratulations! Your {checkoutPlan} plan subscription is now active. You have access to all premium features!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {data.user.firstName || data.user.email}!
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Manage your account and view your search activity
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Credits Card */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                                <CreditCard className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Credits Remaining</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {Number(data.subscription?.credits_remaining) || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Today's Searches */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                                <Search className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Today's Searches</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {data.usageStats.today.searches}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Searches */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                                <BarChart3 className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Monthly Searches</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {data.usageStats.monthly.searches}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                                <TrendingUp className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Plan</p>
                                <p className="text-lg font-bold text-gray-900 capitalize">
                                    {data.user.subscriptionTier}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Search History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Recent Searches</h2>
                            </div>
                            <div className="p-6">
                                {data.searchHistory.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.searchHistory.map((search: any) => (
                                            <div key={search.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <Search className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {search.profession} in {search.state}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {search.zip_code && `Zip: ${search.zip_code} • `}
                                                            {search.results_count} results •
                                                            {new Date(search.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/progeodata?state=${search.state}&profession=${search.profession}${search.zip_code ? `&zipCode=${search.zip_code}` : ''}`}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Search className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No searches yet</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Start searching for professional licenses to see your history here.
                                        </p>
                                        <div className="mt-6">
                                            <Link
                                                to="/progeodata"
                                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                            >
                                                Start Searching
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                        {/* Upgrade Card */}
                        {data.user.subscriptionTier === 'free' && (
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
                                <h3 className="text-lg font-medium mb-2">Upgrade Your Plan</h3>
                                <p className="text-sm mb-4">
                                    Get more credits and advanced features with our paid plans.
                                </p>
                                <Link
                                    to="/pricing"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                                >
                                    View Plans
                                </Link>
                            </div>
                        )}

                        {/* Subscription Management for Paid Users */}
                        {data.user.subscriptionTier !== 'free' && (
                            <div className="bg-white rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-lg font-medium text-gray-900">Subscription Management</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Current Plan</p>
                                            <p className="text-xs text-gray-500 capitalize">{data.user.subscriptionTier}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">Status</p>
                                            <p className="text-xs text-green-600 capitalize">{data.user.subscriptionStatus}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="space-y-3">
                                            <Link
                                                to="/pricing"
                                                className="block w-full text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50"
                                            >
                                                Upgrade Plan
                                            </Link>
                                            <button
                                                onClick={handleCancelSubscription}
                                                disabled={isCancelling}
                                                className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {isCancelling ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Cancelling...
                                                    </>
                                                ) : (
                                                    'Cancel Subscription'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                            </div>
                            <div className="p-6 space-y-3">
                                <Link
                                    to="/progeodata"
                                    className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-50"
                                >
                                    <Search className="h-5 w-5" />
                                    <span>New Search</span>
                                </Link>
                                <Link
                                    to="/dashboard/settings"
                                    className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-50"
                                >
                                    <Settings className="h-5 w-5" />
                                    <span>Account Settings</span>
                                </Link>
                                <Link
                                    to="/pricing"
                                    className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-50"
                                >
                                    <CreditCard className="h-5 w-5" />
                                    <span>Billing & Plans</span>
                                </Link>
                            </div>
                        </div>

                        {/* Plan Details */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Your Plan Details</h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Plan</span>
                                        <span className="text-sm font-medium capitalize">
                                            {data.user.subscriptionTier}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Status</span>
                                        <span className="text-sm font-medium capitalize">
                                            {data.user.subscriptionStatus}
                                        </span>
                                    </div>
                                    {data.subscription && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Daily Credits</span>
                                                <span className="text-sm font-medium">
                                                    {Number(data.subscription.daily_credits) || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Monthly Credits</span>
                                                <span className="text-sm font-medium">
                                                    {Number(data.subscription.monthly_credits) || 0}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
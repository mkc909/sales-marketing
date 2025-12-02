import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
    getSessionByToken,
    getUserSubscription,
    hashPassword,
    verifyPassword,
    updateUserStripeInfo
} from "~/lib/auth.server";
import {
    User,
    Mail,
    Lock,
    CreditCard,
    Settings,
    ArrowLeft,
    Eye,
    EyeOff,
    Save,
    AlertTriangle
} from "lucide-react";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = cookieHeader
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("session_token="))
        ?.split("=")[1];

    if (!sessionToken) {
        return redirect("/auth/login?message=Please log in to access your settings");
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

        return json({
            user: {
                id: user.id as string,
                email: user.email as string,
                firstName: user.first_name as string,
                lastName: user.last_name as string,
                subscriptionTier: user.subscription_tier as string,
                subscriptionStatus: user.subscription_status as string,
                emailVerified: Boolean(user.email_verified),
                avatarUrl: user.avatar_url as string,
                googleId: user.google_id as string,
                stripeCustomerId: user.stripe_customer_id as string
            },
            subscription
        });
    } catch (error) {
        console.error("Settings loader error:", error);
        return redirect("/auth/login?error=Failed to load settings");
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = cookieHeader
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("session_token="))
        ?.split("=")[1];

    if (!sessionToken) {
        return redirect("/auth/login?message=Please log in to access your settings");
    }

    const formData = await request.formData();
    const actionType = formData.get("actionType") as string;

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

        if (actionType === "updateProfile") {
            const firstName = formData.get("firstName") as string;
            const lastName = formData.get("lastName") as string;
            const email = formData.get("email") as string;

            // Validate inputs
            if (!firstName || !lastName || !email) {
                return json({
                    error: "All fields are required",
                    success: false
                }, { status: 400 });
            }

            // Check if email is being changed and if it's already taken
            if (email !== user.email) {
                const existingUser = await context.env.DB.prepare(`
          SELECT id FROM users WHERE email = ? AND id != ?
        `).bind(email.toLowerCase(), user.id).first();

                if (existingUser) {
                    return json({
                        error: "Email is already in use by another account",
                        success: false
                    }, { status: 400 });
                }
            }

            // Update user profile
            await context.env.DB.prepare(`
        UPDATE users SET
          first_name = ?,
          last_name = ?,
          email = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(firstName, lastName, email.toLowerCase(), user.id).run();

            return json({
                success: true,
                message: "Profile updated successfully"
            });

        } else if (actionType === "changePassword") {
            const currentPassword = formData.get("currentPassword") as string;
            const newPassword = formData.get("newPassword") as string;
            const confirmPassword = formData.get("confirmPassword") as string;

            // Validate inputs
            if (!currentPassword || !newPassword || !confirmPassword) {
                return json({
                    error: "All password fields are required",
                    success: false
                }, { status: 400 });
            }

            if (newPassword !== confirmPassword) {
                return json({
                    error: "New passwords do not match",
                    success: false
                }, { status: 400 });
            }

            if (newPassword.length < 8) {
                return json({
                    error: "Password must be at least 8 characters long",
                    success: false
                }, { status: 400 });
            }

            // Check if user has password (Google OAuth users might not)
            if (!user.password_hash) {
                return json({
                    error: "You cannot change password for Google OAuth accounts",
                    success: false
                }, { status: 400 });
            }

            // Verify current password
            const isValidPassword = await verifyPassword(currentPassword, user.password_hash as string);
            if (!isValidPassword) {
                return json({
                    error: "Current password is incorrect",
                    success: false
                }, { status: 400 });
            }

            // Hash new password and update
            const newPasswordHash = await hashPassword(newPassword);
            await context.env.DB.prepare(`
        UPDATE users SET
          password_hash = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(newPasswordHash, user.id).run();

            return json({
                success: true,
                message: "Password changed successfully"
            });

        } else {
            return json({
                error: "Invalid action type",
                success: false
            }, { status: 400 });
        }
    } catch (error) {
        console.error("Settings action error:", error);
        return json({
            error: "Something went wrong. Please try again.",
            success: false
        }, { status: 500 });
    }
}

export default function SettingsPage() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'billing'>('profile');

    const isGoogleUser = Boolean(data.user.googleId);
    const hasPassword = Boolean(data.user.passwordHash);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link
                                to="/dashboard"
                                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                            >
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                Back to Dashboard
                            </Link>
                            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success/Error Messages */}
                {actionData?.success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-800">{actionData.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {actionData?.error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{actionData.error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <User className="h-4 w-4 inline mr-2" />
                            Profile
                        </button>

                        {!isGoogleUser && (
                            <button
                                onClick={() => setActiveTab('password')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'password'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Lock className="h-4 w-4 inline mr-2" />
                                Password
                            </button>
                        )}

                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'billing'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <CreditCard className="h-4 w-4 inline mr-2" />
                            Billing
                        </button>
                    </nav>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Profile Information
                            </h3>

                            <Form method="post" className="space-y-6">
                                <input type="hidden" name="actionType" value="updateProfile" />

                                <div className="grid grid-cols-6 gap-6">
                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            defaultValue={data.user.firstName}
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            defaultValue={data.user.lastName}
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="col-span-6">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            defaultValue={data.user.email}
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        {data.user.emailVerified && (
                                            <p className="mt-2 text-sm text-green-600">Email verified ✓</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </button>
                                </div>
                            </Form>
                        </div>
                    </div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && !isGoogleUser && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Change Password
                            </h3>

                            <Form method="post" className="space-y-6">
                                <input type="hidden" name="actionType" value="changePassword" />

                                <div>
                                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                        Current Password
                                    </label>
                                    <div className="mt-1 relative">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            id="currentPassword"
                                            name="currentPassword"
                                            required
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                        New Password
                                    </label>
                                    <div className="mt-1 relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            id="newPassword"
                                            name="newPassword"
                                            required
                                            minLength={8}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">
                                        Password must be at least 8 characters long
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                        Confirm New Password
                                    </label>
                                    <div className="mt-1 relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            required
                                            minLength={8}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Lock className="h-4 w-4 mr-2" />
                                        Change Password
                                    </button>
                                </div>
                            </Form>
                        </div>
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        {/* Current Plan */}
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Current Plan
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-sm font-medium text-gray-900">Plan</span>
                                        <span className="text-sm text-gray-600 capitalize">{data.user.subscriptionTier}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-sm font-medium text-gray-900">Status</span>
                                        <span className="text-sm text-gray-600 capitalize">{data.user.subscriptionStatus}</span>
                                    </div>

                                    {data.subscription && (
                                        <>
                                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                                <span className="text-sm font-medium text-gray-900">Daily Credits</span>
                                                <span className="text-sm text-gray-600">{Number(data.subscription.daily_credits) || 0}</span>
                                            </div>

                                            <div className="flex justify-between items-center py-3">
                                                <span className="text-sm font-medium text-gray-900">Monthly Credits</span>
                                                <span className="text-sm text-gray-600">{Number(data.subscription.monthly_credits) || 0}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Upgrade Options */}
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

                        {/* Billing History */}
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Billing History
                                </h3>

                                <div className="text-center py-8">
                                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No billing history</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Your billing transactions will appear here.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import {
    getUserByEmail,
    createUser,
    hashPassword,
    verifyPassword,
    createSession
} from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const message = url.searchParams.get("message");

    return json({ error, message });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const isSignup = formData.get("isSignup") === "true";

    try {
        if (isSignup) {
            // Handle signup
            if (!email || !password || !firstName || !lastName) {
                return json({
                    error: "All fields are required"
                }, { status: 400 });
            }

            // Check if user already exists
            const existingUser = await getUserByEmail(context, email);
            if (existingUser) {
                return json({
                    error: "An account with this email already exists"
                }, { status: 400 });
            }

            // Create new user
            const passwordHash = await hashPassword(password);
            const userId = await createUser(context, {
                email,
                firstName,
                lastName,
                passwordHash
            });

            // Create session
            const sessionToken = await createSession(
                context,
                userId,
                request.headers.get("x-forwarded-for") || undefined,
                request.headers.get("user-agent") || undefined
            );

            return redirect("/dashboard?signup=success", {
                headers: {
                    "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${context.env.ENVIRONMENT === "production" ? "Secure;" : ""
                        }`
                }
            });
        } else {
            // Handle login
            if (!email || !password) {
                return json({
                    error: "Email and password are required"
                }, { status: 400 });
            }

            // Find user
            const user = await getUserByEmail(context, email);
            if (!user || !user.password_hash) {
                return json({
                    error: "Invalid email or password"
                }, { status: 400 });
            }

            // Verify password
            const isValidPassword = await verifyPassword(password, user.password_hash as string);
            if (!isValidPassword) {
                return json({
                    error: "Invalid email or password"
                }, { status: 400 });
            }

            // Create session
            const sessionToken = await createSession(
                context,
                user.id as string,
                request.headers.get("x-forwarded-for") || undefined,
                request.headers.get("user-agent") || undefined
            );

            return redirect("/dashboard", {
                headers: {
                    "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${context.env.ENVIRONMENT === "production" ? "Secure;" : ""
                        }`
                }
            });
        }
    } catch (error) {
        console.error("Auth error:", error);
        return json({
            error: "Something went wrong. Please try again."
        }, { status: 500 });
    }
}

export default function AuthPage() {
    const actionData = useActionData<typeof action>();
    const [searchParams] = useSearchParams();
    const [isSignup, setIsSignup] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isSignup ? "Create Account" : "Sign In"}
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            {isSignup
                                ? "Join ProGeoData to search professional licenses"
                                : "Welcome back to ProGeoData"
                            }
                        </p>
                    </div>

                    {/* Error Display */}
                    {(actionData?.error || searchParams.get("error")) && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <X className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">
                                        {actionData?.error || searchParams.get("error")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {searchParams.get("message") && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex">
                                <Check className="h-5 w-5 text-green-400" />
                                <div className="ml-3">
                                    <p className="text-sm text-green-800">
                                        {searchParams.get("message")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Form method="post" className="space-y-6">
                        <input type="hidden" name="isSignup" value={isSignup.toString()} />

                        {/* Name Fields - Only for Signup */}
                        {isSignup && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                        First Name
                                    </label>
                                    <div className="mt-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            required
                                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="John"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                        Last Name
                                    </label>
                                    <div className="mt-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            required
                                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={isSignup ? "new-password" : "current-password"}
                                    required
                                    className="pl-10 pr-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="••••••••••"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {isSignup ? "Create Account" : "Sign In"}
                            </button>
                        </div>
                    </Form>

                    {/* Toggle Between Login/Signup */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    {isSignup ? "Already have an account?" : "Don't have an account?"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignup(!isSignup)}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            {isSignup ? "Sign in instead" : "Create an account"}
                        </button>
                    </div>

                    {/* Google OAuth */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <a
                            href="/auth/google"
                            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 5.84l3.15 3.15c1.15-1.08 1.64-2.59 1.64-4.21z"
                                />
                            </svg>
                            Continue with Google
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icon components
function X({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function Check({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}
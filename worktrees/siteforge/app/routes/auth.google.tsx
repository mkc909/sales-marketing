import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import {
    createOrUpdateGoogleUser,
    createSession
} from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
        return redirect(`/auth/login?error=${encodeURIComponent(error)}`);
    }

    // Validate state parameter (CSRF protection)
    const storedState = await context.env.LINKS.get(`oauth_state_${state}`);
    if (!storedState) {
        return redirect("/auth/login?error=Invalid OAuth state");
    }

    // Clean up stored state
    await context.env.LINKS.delete(`oauth_state_${state}`);

    if (!code) {
        return redirect("/auth/login?error=No authorization code received");
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: context.env.GOOGLE_CLIENT_ID || "",
                client_secret: context.env.GOOGLE_CLIENT_SECRET || "",
                code,
                grant_type: "authorization_code",
                redirect_uri: `${context.env.BASE_URL || "http://localhost:3000"}/auth/google`,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error("Failed to exchange authorization code");
        }

        const tokenData = await tokenResponse.json() as { access_token: string };
        const accessToken = tokenData.access_token;

        // Get user info from Google
        const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!userResponse.ok) {
            throw new Error("Failed to fetch user info from Google");
        }

        const googleUser = await userResponse.json() as {
            id: string;
            email: string;
            given_name?: string;
            family_name?: string;
            picture?: string;
            verified_email: boolean;
        };

        // Create or update user in our database
        const userId = await createOrUpdateGoogleUser(context, {
            googleId: googleUser.id,
            email: googleUser.email,
            firstName: googleUser.given_name || "",
            lastName: googleUser.family_name || "",
            avatarUrl: googleUser.picture,
            emailVerified: googleUser.verified_email,
        });

        // Create session
        const sessionToken = await createSession(
            context,
            userId as string,
            request.headers.get("x-forwarded-for") || undefined,
            request.headers.get("user-agent") || undefined
        );

        // Redirect to dashboard with session
        return redirect("/dashboard?login=google", {
            headers: {
                "Set-Cookie": `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${context.env.ENVIRONMENT === "production" ? "Secure;" : ""
                    }`
            }
        });
    } catch (error) {
        console.error("Google OAuth error:", error);
        return redirect("/auth/login?error=Failed to authenticate with Google");
    }
}
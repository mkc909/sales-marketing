import { json } from "@remix-run/cloudflare";
import { type ActionFunctionArgs } from "@remix-run/cloudflare";
import {
    getSessionByToken,
    consumeCredits,
    recordSearchHistory,
    checkRateLimit,
    getUserSubscription,
    getUserById
} from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        // Get session token from cookies
        const cookieHeader = request.headers.get("Cookie");
        const sessionToken = cookieHeader
            ?.split(";")
            .find((cookie) => cookie.trim().startsWith("session_token="))
            ?.split("=")[1];

        if (!sessionToken) {
            return json({ error: "Authentication required" }, { status: 401 });
        }

        // Get session from token
        const session = await getSessionByToken(context, sessionToken);
        if (!session) {
            return json({ error: "Invalid session" }, { status: 401 });
        }

        // Get user from session
        const user = await context.env.DB.prepare(`
            SELECT * FROM users WHERE id = ?
        `).bind(session.userId).first();

        if (!user) {
            return json({ error: "User not found" }, { status: 404 });
        }

        // Parse request body
        const body = await request.json() as {
            state: string;
            profession: string;
            zip?: string;
            resultsCount?: number;
        };
        const { state, profession, zip, resultsCount } = body;

        if (!state || !profession) {
            return json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check rate limit (using user's subscription tier limits)
        const subscription = await getUserSubscription(context, user.id as string);
        const dailyLimit = Number(subscription?.daily_credits) || 10;

        const rateLimitResult = await checkRateLimit(
            context,
            `search:${user.id}`,
            dailyLimit
        );
        if (!rateLimitResult.allowed) {
            return json({
                error: "Rate limit exceeded",
                resetTime: rateLimitResult.resetTime
            }, { status: 429 });
        }

        // Consume credits
        try {
            await consumeCredits(context, user.id as string, 1, 'search');
        } catch (error) {
            return json({
                error: "Insufficient credits",
                message: error instanceof Error ? error.message : "Unknown error"
            }, { status: 402 });
        }

        // Record search history
        await recordSearchHistory(context, user.id as string, {
            state,
            profession,
            zipCode: zip || undefined,
            resultsCount: resultsCount || 0
        });

        // Get updated credits remaining
        const updatedUser = await getUserById(context, user.id as string);
        const creditsRemaining = Number(updatedUser?.credits_remaining) || 0;

        return json({
            success: true,
            creditsRemaining,
            message: "Search recorded successfully"
        });

    } catch (error) {
        console.error("Search record API error:", error);
        return json({ error: "Internal server error" }, { status: 500 });
    }
}
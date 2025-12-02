import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { deleteSession } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = cookieHeader
        ?.split(";")
        .find((cookie) => cookie.trim().startsWith("session_token="))
        ?.split("=")[1];

    if (sessionToken) {
        // Delete session from database
        await deleteSession(context, sessionToken);
    }

    // Redirect to login page with a message
    return redirect("/auth/login?message=You have been logged out successfully");
}
/**
 * Review Submission API Route
 * POST /api/reviews/create
 * Body: { professional_id, rating, review_text, reviewer_name, transaction_type }
 * Returns: { success: true, review_id: "..." }
 */

import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { ErrorTracker, ErrorLevel, ErrorCategory } from "~/lib/error-tracking";

interface ReviewData {
  professional_id: string;
  rating: number;
  review_text: string;
  reviewer_name: string;
  transaction_type?: "bought" | "sold" | "both" | string;
  reviewer_email?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const tracker = new ErrorTracker(context);

  if (request.method !== "POST") {
    return json(
      { success: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    // Parse request body
    const formData = await request.formData();
    const reviewData: ReviewData = {
      professional_id: formData.get("professional_id") as string,
      rating: parseInt(formData.get("rating") as string),
      review_text: formData.get("review_text") as string,
      reviewer_name: formData.get("reviewer_name") as string,
      transaction_type: formData.get("transaction_type") as string || undefined,
      reviewer_email: formData.get("reviewer_email") as string || undefined,
    };

    // Validate required fields
    if (!reviewData.professional_id) {
      await tracker.logValidationError(
        "professional_id",
        reviewData.professional_id,
        "Professional ID is required"
      );
      return json(
        { success: false, error: "Professional ID is required" },
        { status: 400 }
      );
    }

    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      await tracker.logValidationError(
        "rating",
        reviewData.rating,
        "Rating must be between 1 and 5"
      );
      return json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!reviewData.review_text || reviewData.review_text.trim().length < 10) {
      await tracker.logValidationError(
        "review_text",
        reviewData.review_text,
        "Review must be at least 10 characters"
      );
      return json(
        { success: false, error: "Review must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (!reviewData.reviewer_name || reviewData.reviewer_name.trim() === "") {
      await tracker.logValidationError(
        "reviewer_name",
        reviewData.reviewer_name,
        "Reviewer name is required"
      );
      return json(
        { success: false, error: "Reviewer name is required" },
        { status: 400 }
      );
    }

    // Verify professional exists
    const professional = await context.env.DB.prepare(`
      SELECT id FROM professionals WHERE id = ?
    `).bind(reviewData.professional_id).first();

    if (!professional) {
      return json(
        { success: false, error: "Professional not found" },
        { status: 404 }
      );
    }

    // Get IP for spam prevention
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    // Check for duplicate reviews from same IP within 24 hours
    const recentReview = await context.env.DB.prepare(`
      SELECT id FROM reviews
      WHERE professional_id = ?
      AND ip_address = ?
      AND created_at > ?
    `).bind(
      reviewData.professional_id,
      ip,
      Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
    ).first();

    if (recentReview) {
      return json(
        {
          success: false,
          error: "You have already submitted a review recently. Please wait 24 hours.",
        },
        { status: 429 }
      );
    }

    // Insert review
    const result = await context.env.DB.prepare(`
      INSERT INTO reviews (
        professional_id,
        rating,
        review_text,
        reviewer_name,
        reviewer_email,
        transaction_type,
        ip_address,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      reviewData.professional_id,
      reviewData.rating,
      reviewData.review_text.trim(),
      reviewData.reviewer_name.trim(),
      reviewData.reviewer_email || null,
      reviewData.transaction_type || null,
      ip,
      Date.now()
    ).run();

    const reviewId = `review_${result.meta.last_row_id}`;

    // Update professional's average rating (in background)
    context.waitUntil(
      updateProfessionalRating(context.env.DB, reviewData.professional_id)
    );

    return json({
      success: true,
      review_id: reviewId,
      message: "Review submitted successfully. It will be published after moderation.",
      status: "pending",
    });

  } catch (error) {
    await tracker.logError(
      error as Error,
      ErrorLevel.ERROR,
      ErrorCategory.DATABASE,
      { action: "create_review" }
    );

    return json(
      {
        success: false,
        error: "Failed to submit review",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Update professional's average rating and review count
 */
async function updateProfessionalRating(db: D1Database, professionalId: string) {
  try {
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating
      FROM reviews
      WHERE professional_id = ? AND status = 'approved'
    `).bind(professionalId).first<{ total_reviews: number; avg_rating: number }>();

    if (stats) {
      await db.prepare(`
        UPDATE professionals
        SET
          total_reviews = ?,
          avg_rating = ?
        WHERE id = ?
      `).bind(
        stats.total_reviews,
        stats.avg_rating,
        professionalId
      ).run();
    }
  } catch (error) {
    console.error("Failed to update professional rating:", error);
  }
}

// Reject GET requests
export async function loader() {
  return json(
    { success: false, error: "Use POST method to create reviews" },
    { status: 405 }
  );
}

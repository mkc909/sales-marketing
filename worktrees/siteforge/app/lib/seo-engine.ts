/**
 * SEO Engine
 *
 * Programmatic page generation for massive organic reach:
 * - City + industry combinations
 * - Service + location pages
 * - Blog content system
 * - Backlink opportunities
 *
 * Target: 10,000 indexed pages in 90 days
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

// ============================================================================
// TYPES
// ============================================================================

export interface SEOPage {
  id: string;
  slug: string;
  pageType: 'industry_city' | 'service_location' | 'industry_state' | 'blog_post';
  industry?: string;
  profession?: string;
  city?: string;
  state?: string;
  serviceCategory?: string;
  title: string;
  metaDescription: string;
  h1Headline: string;
  contentJson?: string;
  indexed: boolean;
  indexedAt?: string;
  googlePosition?: number;
  monthlyImpressions: number;
  monthlyClicks: number;
  lastUpdated: string;
  updateFrequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  contentHtml: string;
  authorProfessionalId?: string;
  authorName: string;
  authorBio?: string;
  category: 'industry_guide' | 'professional_tips' | 'platform_updates' | 'success_stories';
  tags: string[];
  relatedIndustry?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  viewCount: number;
  shareCount: number;
  avgTimeOnPage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordTarget {
  id: string;
  keyword: string;
  keywordType: 'primary' | 'secondary' | 'long_tail';
  targetUrl: string;
  targetPageId?: string;
  monthlySearchVolume?: number;
  competition?: 'low' | 'medium' | 'high';
  keywordDifficulty?: number;
  currentPosition?: number;
  bestPosition?: number;
  positionHistory: Array<{ date: string; position: number }>;
  monthlyImpressions: number;
  monthlyClicks: number;
  ctr?: number;
  lastChecked: string;
  createdAt: string;
}

// ============================================================================
// CITY + INDUSTRY PAGE GENERATION
// ============================================================================

/**
 * Major US cities for programmatic page generation
 */
const MAJOR_US_CITIES = [
  { city: 'New York', state: 'NY', population: 8336817 },
  { city: 'Los Angeles', state: 'CA', population: 3979576 },
  { city: 'Chicago', state: 'IL', population: 2693976 },
  { city: 'Houston', state: 'TX', population: 2320268 },
  { city: 'Phoenix', state: 'AZ', population: 1680992 },
  { city: 'Philadelphia', state: 'PA', population: 1584064 },
  { city: 'San Antonio', state: 'TX', population: 1547253 },
  { city: 'San Diego', state: 'CA', population: 1423851 },
  { city: 'Dallas', state: 'TX', population: 1343573 },
  { city: 'San Jose', state: 'CA', population: 1021795 },
  { city: 'Austin', state: 'TX', population: 978908 },
  { city: 'Jacksonville', state: 'FL', population: 949611 },
  { city: 'Fort Worth', state: 'TX', population: 918915 },
  { city: 'Columbus', state: 'OH', population: 905748 },
  { city: 'Charlotte', state: 'NC', population: 885708 },
  { city: 'San Francisco', state: 'CA', population: 873965 },
  { city: 'Indianapolis', state: 'IN', population: 876384 },
  { city: 'Seattle', state: 'WA', population: 753675 },
  { city: 'Denver', state: 'CO', population: 727211 },
  { city: 'Washington', state: 'DC', population: 705749 },
  { city: 'Boston', state: 'MA', population: 692600 },
  { city: 'Nashville', state: 'TN', population: 689447 },
  { city: 'Miami', state: 'FL', population: 442241 },
  { city: 'Atlanta', state: 'GA', population: 498715 },
  { city: 'Portland', state: 'OR', population: 652503 }
];

/**
 * Industries supported on the platform
 */
const INDUSTRIES = [
  { id: 'real_estate', name: 'Real Estate Agents', professions: ['agent', 'broker'] },
  { id: 'legal', name: 'Attorneys', professions: ['attorney', 'lawyer'] },
  { id: 'insurance', name: 'Insurance Agents', professions: ['agent', 'broker'] },
  { id: 'mortgage', name: 'Mortgage Lenders', professions: ['loan_officer', 'broker'] },
  { id: 'financial', name: 'Financial Advisors', professions: ['advisor', 'planner'] },
  { id: 'contractor', name: 'Contractors', professions: ['general_contractor', 'specialist'] }
];

/**
 * Generate SEO pages for all city + industry combinations
 */
export async function generateIndustryCityPages(
  context: AppLoadContext,
  batchSize: number = 100
): Promise<{ created: number; updated: number }> {
  const db = context.env.DB;
  let created = 0;
  let updated = 0;

  for (const industry of INDUSTRIES) {
    for (const city of MAJOR_US_CITIES) {
      const slug = `${industry.id}/${city.city.toLowerCase().replace(/\s+/g, '-')}`;
      const id = `seo-${industry.id}-${city.city.toLowerCase().replace(/\s+/g, '-')}`;

      // Check if page exists
      const existing = await db
        .prepare('SELECT id FROM seo_pages WHERE slug = ?')
        .bind(slug)
        .first<{ id: string }>();

      const title = `Top ${industry.name} in ${city.city}, ${city.state} | EstateFlow`;
      const metaDescription = `Find and compare the best ${industry.name.toLowerCase()} in ${city.city}, ${city.state}. Read reviews, view profiles, and connect with verified professionals.`;
      const h1Headline = `${industry.name} in ${city.city}, ${city.state}`;

      const contentJson = JSON.stringify({
        city: city.city,
        state: city.state,
        industry: industry.name,
        population: city.population,
        sections: [
          {
            type: 'intro',
            content: `Looking for trusted ${industry.name.toLowerCase()} in ${city.city}? Browse our directory of ${city.population.toLocaleString()}+ verified professionals serving the ${city.city} area.`
          },
          {
            type: 'stats',
            professionalCount: 0, // Will be updated with real data
            avgRating: 4.8,
            totalReviews: 0
          },
          {
            type: 'neighborhoods',
            areas: [] // Will be populated with neighborhood data
          }
        ]
      });

      if (existing) {
        await db
          .prepare('UPDATE seo_pages SET last_updated = datetime("now") WHERE id = ?')
          .bind(existing.id)
          .run();
        updated++;
      } else {
        await db
          .prepare(`
            INSERT INTO seo_pages (
              id, slug, page_type, industry, city, state,
              title, meta_description, h1_headline, content_json,
              indexed, monthly_impressions, monthly_clicks, update_frequency
            ) VALUES (?, ?, 'industry_city', ?, ?, ?, ?, ?, ?, ?, false, 0, 0, 'weekly')
          `)
          .bind(id, slug, industry.id, city.city, city.state, title, metaDescription, h1Headline, contentJson)
          .run();
        created++;
      }

      // Batch commit
      if ((created + updated) % batchSize === 0) {
        console.log(`Processed ${created + updated} pages...`);
      }
    }
  }

  return { created, updated };
}

/**
 * Generate content for an SEO page with real professional data
 */
export async function generatePageContent(
  pageId: string,
  context: AppLoadContext
): Promise<SEOPage> {
  const db = context.env.DB;

  const page = await db
    .prepare('SELECT * FROM seo_pages WHERE id = ?')
    .bind(pageId)
    .first<SEOPage>();

  if (!page) {
    throw new Error('SEO page not found');
  }

  // Get professional count for this location
  const professionalCount = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM professionals
      WHERE industry = ?
        AND city = ?
        AND state = ?
        AND status = 'active'
    `)
    .bind(page.industry, page.city, page.state)
    .first<{ count: number }>();

  // Update content with real data
  const content = JSON.parse(page.contentJson || '{}');
  content.sections[1].professionalCount = professionalCount?.count || 0;

  await db
    .prepare('UPDATE seo_pages SET content_json = ?, last_updated = datetime("now") WHERE id = ?')
    .bind(JSON.stringify(content), pageId)
    .run();

  return {
    ...page,
    contentJson: JSON.stringify(content)
  };
}

// ============================================================================
// BLOG CONTENT SYSTEM
// ============================================================================

/**
 * Create a blog post
 */
export async function createBlogPost(
  post: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    authorName: string;
    authorProfessionalId?: string;
    authorBio?: string;
    category: 'industry_guide' | 'professional_tips' | 'platform_updates' | 'success_stories';
    tags?: string[];
    relatedIndustry?: string;
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
  },
  context: AppLoadContext
): Promise<BlogPost> {
  const db = context.env.DB;
  const id = `blog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Convert markdown to HTML (simplified - in production use a markdown library)
  const contentHtml = post.content.replace(/\n/g, '<br>');

  await db
    .prepare(`
      INSERT INTO blog_posts (
        id, slug, title, excerpt, content, content_html,
        author_professional_id, author_name, author_bio,
        category, tags, related_industry,
        meta_title, meta_description, focus_keyword,
        status, view_count, share_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0)
    `)
    .bind(
      id,
      post.slug,
      post.title,
      post.excerpt,
      post.content,
      contentHtml,
      post.authorProfessionalId || null,
      post.authorName,
      post.authorBio || null,
      post.category,
      JSON.stringify(post.tags || []),
      post.relatedIndustry || null,
      post.metaTitle || post.title,
      post.metaDescription || post.excerpt,
      post.focusKeyword || null
    )
    .run();

  const newPost = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first<BlogPost>();

  return {
    ...newPost!,
    tags: JSON.parse(newPost!.tags as unknown as string)
  };
}

/**
 * Publish a blog post
 */
export async function publishBlogPost(
  postId: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare('UPDATE blog_posts SET status = "published", published_at = datetime("now") WHERE id = ?')
    .bind(postId)
    .run();
}

/**
 * Get published blog posts
 */
export async function getPublishedBlogPosts(
  limit: number = 20,
  offset: number = 0,
  category?: string,
  context?: AppLoadContext
): Promise<BlogPost[]> {
  const db = context!.env.DB;

  let query = 'SELECT * FROM blog_posts WHERE status = "published"';
  const bindings: any[] = [];

  if (category) {
    query += ' AND category = ?';
    bindings.push(category);
  }

  query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<BlogPost>();

  return result.results.map(post => ({
    ...post,
    tags: JSON.parse(post.tags as unknown as string)
  }));
}

// ============================================================================
// SITEMAP GENERATION
// ============================================================================

/**
 * Generate XML sitemap for all SEO pages
 */
export async function generateSitemap(
  context: AppLoadContext,
  baseUrl: string = 'https://estateflow.com'
): Promise<string> {
  const db = context.env.DB;

  // Get all published SEO pages
  const pages = await db
    .prepare('SELECT slug, last_updated FROM seo_pages WHERE indexed = true')
    .all<{ slug: string; last_updated: string }>();

  // Get all published blog posts
  const posts = await db
    .prepare('SELECT slug, updated_at FROM blog_posts WHERE status = "published"')
    .all<{ slug: string; updated_at: string }>();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add homepage
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += '  </url>\n';

  // Add SEO pages
  for (const page of pages.results) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/${page.slug}</loc>\n`;
    xml += `    <lastmod>${page.last_updated}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  }

  // Add blog posts
  for (const post of posts.results) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
    xml += `    <lastmod>${post.updated_at}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  return xml;
}

// ============================================================================
// KEYWORD TRACKING
// ============================================================================

/**
 * Add keyword to track
 */
export async function addKeywordTracking(
  keyword: {
    keyword: string;
    keywordType: 'primary' | 'secondary' | 'long_tail';
    targetUrl: string;
    targetPageId?: string;
    monthlySearchVolume?: number;
    competition?: 'low' | 'medium' | 'high';
    keywordDifficulty?: number;
  },
  context: AppLoadContext
): Promise<KeywordTarget> {
  const db = context.env.DB;
  const id = `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO keyword_tracking (
        id, keyword, keyword_type, target_url, target_page_id,
        monthly_search_volume, competition, keyword_difficulty,
        position_history, monthly_impressions, monthly_clicks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 0, 0)
    `)
    .bind(
      id,
      keyword.keyword,
      keyword.keywordType,
      keyword.targetUrl,
      keyword.targetPageId || null,
      keyword.monthlySearchVolume || null,
      keyword.competition || null,
      keyword.keywordDifficulty || null
    )
    .run();

  const newKeyword = await db
    .prepare('SELECT * FROM keyword_tracking WHERE id = ?')
    .bind(id)
    .first<KeywordTarget>();

  return {
    ...newKeyword!,
    positionHistory: []
  };
}

/**
 * Get SEO performance summary
 */
export async function getSEOPerformance(
  context: AppLoadContext
): Promise<{
  totalPages: number;
  indexedPages: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  topPerformingPages: SEOPage[];
}> {
  const db = context.env.DB;

  const totalPages = await db
    .prepare('SELECT COUNT(*) as count FROM seo_pages')
    .first<{ count: number }>();

  const indexedPages = await db
    .prepare('SELECT COUNT(*) as count FROM seo_pages WHERE indexed = true')
    .first<{ count: number }>();

  const performance = await db
    .prepare(`
      SELECT
        SUM(monthly_impressions) as total_impressions,
        SUM(monthly_clicks) as total_clicks
      FROM seo_pages
      WHERE indexed = true
    `)
    .first<{ total_impressions: number; total_clicks: number }>();

  const topPages = await db
    .prepare('SELECT * FROM seo_pages WHERE indexed = true ORDER BY monthly_clicks DESC LIMIT 10')
    .all<SEOPage>();

  const avgCTR = performance?.total_impressions
    ? (performance.total_clicks / performance.total_impressions) * 100
    : 0;

  return {
    totalPages: totalPages?.count || 0,
    indexedPages: indexedPages?.count || 0,
    totalImpressions: performance?.total_impressions || 0,
    totalClicks: performance?.total_clicks || 0,
    avgCTR: Math.round(avgCTR * 100) / 100,
    topPerformingPages: topPages.results
  };
}

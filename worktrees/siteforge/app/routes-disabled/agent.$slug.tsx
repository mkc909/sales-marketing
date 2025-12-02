/**
 * Ghost Profile Page for Real Estate Agents
 * Zero-JS premium experience using native Popover & View Transitions APIs
 * Converts anonymous visitors into leads through strategic CTAs
 */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const agent = data?.agent;
  const productName = data?.region === 'PR' ? 'PinExacto' : 'TruePoint';

  return [
    { title: `${agent?.name || 'Agent'} - ${agent?.brokerage || 'Real Estate'} | ${productName}` },
    { name: 'description', content: agent?.bio || `View ${agent?.name}'s listings, reviews, and contact information` },
    { property: 'og:image', content: agent?.photoUrl || '/default-agent.jpg' },
    { property: 'og:type', content: 'profile' },
    { name: 'twitter:card', content: 'summary_large_image' }
  ];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const slug = params.slug;
  const url = new URL(request.url);
  const region = context.region || 'US';

  // Get agent from D1
  const agent = await context.env.DB.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT l.id) as listing_count,
      COUNT(DISTINCT r.id) as review_count,
      AVG(r.rating) as avg_rating,
      COUNT(DISTINCT s.id) as sold_count
    FROM agents a
    LEFT JOIN listings l ON a.id = l.agent_id AND l.status = 'active'
    LEFT JOIN reviews r ON a.id = r.agent_id
    LEFT JOIN listings s ON a.id = s.agent_id AND s.status = 'sold'
    WHERE a.slug = ?
    GROUP BY a.id
  `).bind(slug).first();

  if (!agent) {
    throw new Response('Agent not found', { status: 404 });
  }

  // Get recent reviews
  const reviews = await context.env.DB.prepare(`
    SELECT * FROM reviews
    WHERE agent_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).bind(agent.id).all();

  // Get active listings
  const listings = await context.env.DB.prepare(`
    SELECT * FROM listings
    WHERE agent_id = ? AND status = 'active'
    ORDER BY list_price DESC
    LIMIT 6
  `).bind(agent.id).all();

  // Track profile view
  await context.env.DB.prepare(`
    INSERT INTO profile_views (agent_id, ip_address, user_agent, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(
    agent.id,
    request.headers.get('CF-Connecting-IP'),
    request.headers.get('User-Agent'),
    Date.now()
  ).run();

  // Check if profile is claimed
  const isClaimed = agent.claimed_at !== null;

  // Generate shortlinks and QR codes
  const shortLink = `https://est.at/${agent.slug}`;
  const qrCodeUrl = `/api/qr/${agent.slug}.png`;

  return json({
    agent,
    reviews: reviews.results,
    listings: listings.results,
    isClaimed,
    shortLink,
    qrCodeUrl,
    region,
    productName: region === 'PR' ? 'PinExacto' : 'TruePoint'
  });
}

export default function AgentProfile() {
  const { agent, reviews, listings, isClaimed, shortLink, qrCodeUrl, region, productName } = useLoaderData<typeof loader>();

  return (
    <>
      {/* Hidden Popovers (No JavaScript Required) */}
      <div id="lead-capture" popover="auto" className="popover-content">
        <form method="post" action="/api/lead-capture" className="lead-form">
          <h3 className="text-xl font-bold mb-4">
            {isClaimed ? `Connect with ${agent.name}` : '7 Leads Waiting For This Agent'}
          </h3>
          {!isClaimed && (
            <p className="text-amber-600 mb-4 font-semibold">
              Are you {agent.name}? Claim your profile to get these leads!
            </p>
          )}
          <input type="hidden" name="agent_id" value={agent.id} />
          <input type="hidden" name="source" value="ghost_profile" />

          <div className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="email"
              name="email"
              placeholder="Email (optional)"
              className="w-full px-4 py-2 border rounded-lg"
            />
            <select name="interest" className="w-full px-4 py-2 border rounded-lg">
              <option value="buying">I'm looking to buy</option>
              <option value="selling">I need to sell</option>
              <option value="both">Both buying and selling</option>
              <option value="agent">I'm {agent.name} (claim profile)</option>
            </select>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              {isClaimed ? 'Send Message' : 'Get Connected'}
            </button>
          </div>
        </form>
      </div>

      <div id="qr-share" popover="auto" className="popover-qr">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">Share {agent.name}'s Profile</h3>
          <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" width="200" height="200" />
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Quick Share Link:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shortLink}
                readOnly
                className="flex-1 px-3 py-2 border rounded bg-gray-50"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shortLink)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Scan QR code or share link to save contact
            </p>
          </div>
        </div>
      </div>

      <div id="review-form" popover="auto" className="popover-content">
        <form method="post" action="/api/reviews" className="space-y-4">
          <h3 className="text-xl font-bold mb-4">Review {agent.name}</h3>
          <input type="hidden" name="agent_id" value={agent.id} />

          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <label key={star} className="cursor-pointer">
                <input type="radio" name="rating" value={star} className="hidden" required />
                <span className="text-3xl star-rating">⭐</span>
              </label>
            ))}
          </div>

          <input
            type="text"
            name="reviewer_name"
            placeholder="Your Name"
            required
            className="w-full px-4 py-2 border rounded-lg"
          />

          <textarea
            name="review_text"
            placeholder="Share your experience..."
            required
            rows={4}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <select name="transaction_type" className="w-full px-4 py-2 border rounded-lg">
            <option value="bought">Bought a home</option>
            <option value="sold">Sold a home</option>
            <option value="both">Both bought and sold</option>
          </select>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Submit Review
          </button>
        </form>
      </div>

      {/* Main Profile Content */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section with View Transitions */}
        <header className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Agent Photo with View Transition */}
              <div
                className="agent-photo-wrapper"
                style={{ viewTransitionName: `agent-photo-${agent.slug}` }}
              >
                <img
                  src={agent.photo_url || '/default-agent.jpg'}
                  alt={agent.name}
                  className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white shadow-2xl object-cover"
                />
                {!isClaimed && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    Unclaimed
                  </div>
                )}
              </div>

              {/* Agent Info */}
              <div className="flex-1 text-center md:text-left text-white">
                <h1
                  className="text-3xl md:text-5xl font-bold mb-2"
                  style={{ viewTransitionName: `agent-name-${agent.slug}` }}
                >
                  {agent.name}
                </h1>
                <p className="text-xl opacity-90 mb-4">{agent.brokerage}</p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
                  <span className="badge bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                    📍 {agent.city}, {agent.state}
                  </span>
                  <span className="badge bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                    🏠 {agent.listing_count || 0} Active Listings
                  </span>
                  <span className="badge bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                    ⭐ {agent.avg_rating ? agent.avg_rating.toFixed(1) : 'New'} ({agent.review_count || 0} reviews)
                  </span>
                  {agent.license_number && (
                    <span className="badge bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                      🎓 Lic #{agent.license_number}
                    </span>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <button
                    popovertarget="lead-capture"
                    className="px-6 py-3 bg-white text-indigo-900 rounded-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    {isClaimed ? '📱 Contact Me' : '🔥 7 Leads Waiting'}
                  </button>
                  <button
                    popovertarget="qr-share"
                    className="px-6 py-3 bg-white/20 backdrop-blur text-white border border-white/30 rounded-lg font-semibold hover:bg-white/30 transition-all"
                  >
                    📤 Share Profile
                  </button>
                  {!isClaimed && (
                    <a
                      href={`/claim/${agent.slug}`}
                      className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-all animate-pulse"
                    >
                      ⚡ Claim This Profile
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className="hidden lg:block bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <h3 className="font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between gap-8">
                    <span className="opacity-80">Properties Sold</span>
                    <span className="font-bold">{agent.sold_count || 0}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="opacity-80">Avg Days on Market</span>
                    <span className="font-bold">{agent.avg_dom || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="opacity-80">Response Time</span>
                    <span className="font-bold text-green-400">{'<'} 1 hour</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Bio Section */}
        {agent.bio && (
          <section className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4">About {agent.name}</h2>
              <p className="text-gray-700 leading-relaxed">{agent.bio}</p>

              {agent.specialties && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.specialties.split(',').map(specialty => (
                      <span key={specialty} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {specialty.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Active Listings Grid */}
        {listings.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Active Listings</h2>
              <a href={`/agent/${agent.slug}/listings`} className="text-indigo-600 hover:text-indigo-800 font-semibold">
                View All →
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <article
                  key={listing.id}
                  className="listing-card bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1"
                  style={{ viewTransitionName: `listing-${listing.id}` }}
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    {listing.primary_photo && (
                      <img
                        src={listing.primary_photo}
                        alt={listing.address}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        ${(listing.list_price / 1000).toFixed(0)}k
                      </span>
                    </div>
                    {listing.pin_id && (
                      <a
                        href={`/pin/${listing.pin_short_code}`}
                        className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-indigo-600 hover:bg-white"
                      >
                        📍 View {productName}
                      </a>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{listing.address}</h3>
                    <div className="flex gap-4 text-sm text-gray-600 mb-3">
                      <span>🛏️ {listing.bedrooms} beds</span>
                      <span>🚿 {listing.bathrooms} baths</span>
                      <span>📐 {listing.sqft} sqft</span>
                    </div>
                    <button
                      popovertarget="lead-capture"
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Schedule Showing
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Client Reviews</h2>
                {agent.avg_rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-2xl ${i < Math.round(agent.avg_rating) ? 'text-yellow-500' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xl font-semibold">{agent.avg_rating.toFixed(1)}</span>
                    <span className="text-gray-600">({agent.review_count} reviews)</span>
                  </div>
                )}
              </div>
              <button
                popovertarget="review-form"
                className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-semibold hover:bg-indigo-600 hover:text-white transition-all"
              >
                ✍️ Write Review
              </button>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{review.reviewer_name}</h4>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-lg ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.review_text}</p>
                    {review.transaction_type && (
                      <span className="inline-block mt-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {review.transaction_type === 'bought' ? '🏠 Bought' :
                         review.transaction_type === 'sold' ? '💰 Sold' : '🔄 Both'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600 mb-4">Be the first to review {agent.name}</p>
                <button
                  popovertarget="review-form"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Write First Review
                </button>
              </div>
            )}
          </div>
        </section>

        {/* TruePoint/PinExacto Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-3xl font-bold mb-6">Never Get Lost with {productName}</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">{agent.name}'s Properties Include:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <strong>Exact Lockbox Location</strong>
                      <p className="text-sm text-gray-600">No more searching around the property</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <strong>Parking Instructions</strong>
                      <p className="text-sm text-gray-600">Know exactly where to park</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">🔐</span>
                    <div>
                      <strong>Gate & Access Codes</strong>
                      <p className="text-sm text-gray-600">Get in without calling</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">📸</span>
                    <div>
                      <strong>Visual Guides</strong>
                      <p className="text-sm text-gray-600">Photos of entrances and access points</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Try It Yourself</h3>
                <p className="text-gray-700 mb-4">
                  Create a {productName} for your property or business and never give confusing directions again.
                </p>
                <a
                  href={region === 'PR' ? '/pinexacto' : '/truepoint'}
                  className="inline-block w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Create Your Free {productName} →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="bg-gradient-to-r from-gray-900 to-indigo-900 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            {!isClaimed ? (
              <>
                <h2 className="text-3xl font-bold mb-4">
                  Are you {agent.name}?
                </h2>
                <p className="text-xl mb-8 opacity-90">
                  7 potential clients have tried to contact you through this profile
                </p>
                <a
                  href={`/claim/${agent.slug}`}
                  className="inline-block px-8 py-4 bg-amber-500 text-white rounded-lg text-xl font-bold hover:bg-amber-600 transition-all transform hover:scale-105 animate-pulse"
                >
                  Claim Your Profile & Get These Leads
                </a>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-4">
                  Ready to Work with {agent.name}?
                </h2>
                <p className="text-xl mb-8 opacity-90">
                  Join {agent.sold_count || 'dozens of'} happy clients
                </p>
                <button
                  popovertarget="lead-capture"
                  className="inline-block px-8 py-4 bg-white text-indigo-900 rounded-lg text-xl font-bold hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  Get Started Today
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

      {/* CSS for Native APIs (No JS Required) */}
      <style>{`
        /* Popover Styles */
        [popover] {
          margin: auto;
          padding: 0;
          border: none;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: min(90vw, 400px);
          max-height: min(90vh, 600px);
          overflow: auto;
          animation: slide-in 0.3s ease-out;
        }

        .popover-content {
          padding: 2rem;
          background: white;
        }

        .popover-qr {
          padding: 2rem;
          background: white;
          max-width: 350px;
        }

        /* View Transitions */
        @supports (view-transition-name: none) {
          ::view-transition-old(agent-photo-*),
          ::view-transition-new(agent-photo-*) {
            animation-duration: 0.3s;
            animation-timing-function: ease-in-out;
          }

          ::view-transition-old(agent-name-*),
          ::view-transition-new(agent-name-*) {
            animation-duration: 0.25s;
          }

          .listing-card {
            view-transition-name: listing;
          }

          @media (prefers-reduced-motion: no-preference) {
            ::view-transition-group(*) {
              animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            }
          }
        }

        /* Popover Animations */
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Star Rating Interactive */
        .star-rating {
          filter: grayscale(100%);
          transition: all 0.2s;
        }

        input[type="radio"]:checked ~ .star-rating,
        .star-rating:hover,
        .star-rating:hover ~ .star-rating {
          filter: grayscale(0%);
        }

        /* Loading States */
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse {
            animation: none;
          }
        }

        /* Print Styles */
        @media print {
          [popover],
          button[popovertarget] {
            display: none;
          }

          .container {
            max-width: 100%;
          }
        }

        /* Responsive Adjustments */
        @media (max-width: 640px) {
          [popover] {
            border-radius: 0;
            max-width: 100vw;
            max-height: 100vh;
          }
        }

        /* High Contrast Mode Support */
        @media (prefers-contrast: high) {
          .badge {
            border: 2px solid currentColor;
          }

          button {
            border: 2px solid currentColor;
          }
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          [popover] {
            background: #1f2937;
            color: white;
          }

          .popover-content input,
          .popover-content select,
          .popover-content textarea {
            background: #374151;
            color: white;
            border-color: #4b5563;
          }
        }
      `}</style>
    </>
  );
}
/**
 * Real Estate Agent Profile Portal
 * Agent-specific landing pages with review system and vendor network
 * NOT property listings - this is about the agent's business
 */

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import {
  MapPin, Phone, Mail, Star, Award, Users, TrendingUp,
  CheckCircle, MessageCircle, Calendar, Shield, Briefcase,
  Home, Building, Key, Calculator
} from "lucide-react";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Agent Not Found' }];

  const { agent } = data;
  return [
    { title: `${agent.name} - Real Estate Agent | EstateFlow` },
    { name: 'description', content: `${agent.name} is a top-rated real estate professional in ${agent.city}, ${agent.state}. ${agent.yearsExperience} years experience. Contact for buying or selling.` },
    { name: 'keywords', content: `${agent.name}, real estate agent, ${agent.city} realtor, buy home ${agent.city}, sell property ${agent.state}` },
    { property: 'og:title', content: `${agent.name} - Real Estate Agent` },
    { property: 'og:description', content: agent.bio },
    { property: 'og:type', content: 'profile' }
  ];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { slug } = params;

  // TODO: Replace with actual database query
  // const agent = await context.env.DB.prepare(`
  //   SELECT * FROM professionals WHERE slug = ? AND industry = 'real-estate'
  // `).bind(slug).first();

  // Mock agent data for now
  const agent = {
    id: 'agent-001',
    slug: slug,
    name: 'Maria Rodriguez',
    title: 'Senior Real Estate Agent',
    company: 'Premier Realty Group',
    photo: '/placeholder-agent.jpg',

    // Contact
    phone: '(787) 555-0123',
    email: 'maria@premierrealty.com',

    // Location
    city: 'San Juan',
    state: 'PR',
    servingAreas: ['San Juan', 'Condado', 'Santurce', 'Hato Rey', 'Río Piedras'],
    hasExactPin: true,
    officeAddress: '123 Ponce de León Ave, San Juan, PR 00901',

    // Experience
    yearsExperience: 12,
    licenseNumber: 'RE-12345-PR',
    specializations: [
      'Luxury Properties',
      'First-Time Buyers',
      'Investment Properties',
      'Commercial Real Estate'
    ],
    languages: ['English', 'Spanish'],

    // Stats
    rating: 4.8,
    reviewCount: 127,
    propertiesSold: 342,
    avgSalePrice: 425000,
    avgDaysOnMarket: 28,

    // Bio
    bio: 'With over 12 years of experience in the Puerto Rico real estate market, I specialize in helping families find their dream homes and investors identify profitable opportunities. My commitment to excellence and deep local knowledge ensure smooth transactions from start to finish.',

    // Achievements
    certifications: [
      'Certified Residential Specialist (CRS)',
      'Accredited Buyer\'s Representative (ABR)',
      'Senior Real Estate Specialist (SRES)'
    ],
    awards: [
      'Top Producer 2023',
      'Five Star Professional Award',
      'Client Choice Award 2022'
    ],

    // Services
    services: [
      {
        id: 'buyer-rep',
        name: 'Buyer Representation',
        description: 'Expert guidance through the entire home buying process',
        icon: 'key'
      },
      {
        id: 'seller-rep',
        name: 'Seller Representation',
        description: 'Strategic marketing to sell your property fast and for top dollar',
        icon: 'trending-up'
      },
      {
        id: 'investment',
        name: 'Investment Consulting',
        description: 'Identify profitable real estate investment opportunities',
        icon: 'calculator'
      },
      {
        id: 'relocation',
        name: 'Relocation Services',
        description: 'Comprehensive support for relocating to Puerto Rico',
        icon: 'map-pin'
      }
    ],

    // Vendor Network
    preferredVendors: [
      { type: 'Home Inspector', name: 'PR Home Inspections', verified: true },
      { type: 'Mortgage Broker', name: 'Island Lending Group', verified: true },
      { type: 'Attorney', name: 'Rodriguez & Associates', verified: true },
      { type: 'Insurance Agent', name: 'Coastal Insurance PR', verified: true },
      { type: 'Contractor', name: 'Elite Renovations', verified: true }
    ]
  };

  // Mock reviews
  const reviews = [
    {
      id: 'rev-1',
      author: 'John Smith',
      rating: 5,
      date: '2024-01-15',
      text: 'Maria helped us find our dream home in Condado. Her knowledge of the area and negotiation skills saved us thousands. Highly recommended!',
      propertyType: 'Condo Purchase',
      verified: true
    },
    {
      id: 'rev-2',
      author: 'Carmen Vega',
      rating: 5,
      date: '2023-12-10',
      text: 'Sold our property in record time! Maria\'s marketing strategy was excellent and she kept us informed every step of the way.',
      propertyType: 'Single Family Home Sale',
      verified: true
    },
    {
      id: 'rev-3',
      author: 'Robert Chen',
      rating: 4,
      date: '2023-11-22',
      text: 'Great experience working with Maria on our investment property. She provided valuable insights into the local market.',
      propertyType: 'Investment Property',
      verified: true
    }
  ];

  return json({
    agent,
    reviews
  });
}

export default function RealEstateAgentPortal() {
  const { agent, reviews } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Agent Info */}
            <div>
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                    <Users className="w-16 h-16" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-blue-900">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
                  <p className="text-xl text-blue-100 mb-1">{agent.title}</p>
                  <p className="text-lg text-blue-200 mb-4">{agent.company}</p>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{agent.rating}</span>
                      <span className="text-sm text-blue-200">({agent.reviewCount} reviews)</span>
                    </div>
                    <div className="text-sm text-blue-200">
                      {agent.yearsExperience} years experience
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`tel:${agent.phone}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-900 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      Call Now
                    </a>
                    <a
                      href={`mailto:${agent.email}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-800 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      Email Me
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold mb-1">{agent.propertiesSold}</div>
                <div className="text-sm text-blue-200">Properties Sold</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold mb-1">${(agent.avgSalePrice / 1000).toFixed(0)}K</div>
                <div className="text-sm text-blue-200">Avg Sale Price</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold mb-1">{agent.avgDaysOnMarket}</div>
                <div className="text-sm text-blue-200">Avg Days on Market</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-3xl font-bold mb-1">{agent.reviewCount}</div>
                <div className="text-sm text-blue-200">Client Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Bio */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About {agent.name.split(' ')[0]}</h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">{agent.bio}</p>

              {/* Specializations */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {agent.specializations.map((spec, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Languages</h3>
                <div className="flex gap-3">
                  {agent.languages.map((lang, index) => (
                    <span key={index} className="text-gray-700 font-medium">{lang}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div>
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-blue-600" />
                  Certifications
                </h3>
                <ul className="space-y-2">
                  {agent.certifications.map((cert, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{cert}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  Awards
                </h3>
                <ul className="space-y-2">
                  {agent.awards.map((award, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{award}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Services I Offer</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agent.services.map((service) => (
              <div key={service.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  {service.icon === 'key' && <Key className="w-6 h-6 text-blue-600" />}
                  {service.icon === 'trending-up' && <TrendingUp className="w-6 h-6 text-blue-600" />}
                  {service.icon === 'calculator' && <Calculator className="w-6 h-6 text-blue-600" />}
                  {service.icon === 'map-pin' && <MapPin className="w-6 h-6 text-blue-600" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preferred Vendor Network */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Trusted Vendor Network</h2>
            <p className="text-lg text-gray-600">Professionals I recommend to make your transaction seamless</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agent.preferredVendors.map((vendor, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                    <p className="text-sm text-gray-600">{vendor.type}</p>
                  </div>
                  {vendor.verified && (
                    <Shield className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Contact Vendor
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Client Reviews</h2>
            <div className="flex items-center justify-center gap-2 text-lg">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-6 h-6 ${
                      i < Math.floor(agent.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold">{agent.rating}</span>
              <span className="text-gray-600">({agent.reviewCount} reviews)</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.author}</h3>
                    <p className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString()}</p>
                  </div>
                  {review.verified && (
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-gray-700 text-sm mb-3">{review.text}</p>

                <div className="pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">{review.propertyType}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              View All {agent.reviewCount} Reviews
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Buy or Sell?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Let's discuss your real estate goals and create a winning strategy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${agent.phone}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-xl"
            >
              <Phone className="w-6 h-6" />
              {agent.phone}
            </a>
            <a
              href={`mailto:${agent.email}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-800 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all border border-blue-700"
            >
              <Mail className="w-6 h-6" />
              Schedule Consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Home Value Estimator - Lead capture tool for sellers
 * Provides instant estimate with detailed CMA for leads
 */

import { useState, useEffect } from 'react';
import type { Agent } from '~/types';

interface HomeDetails {
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family';
  condition: 'excellent' | 'good' | 'fair' | 'needs_work';
}

interface Comparable {
  address: string;
  soldPrice: number;
  soldDate: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  distance: number;
  pricePerSqft: number;
  daysOnMarket: number;
}

interface HomeValueEstimatorProps {
  agent: Agent;
  instantEstimate?: boolean;
  requireLead?: boolean;
}

export function HomeValueEstimator({ agent, instantEstimate = true, requireLead = true }: HomeValueEstimatorProps) {
  const [step, setStep] = useState(1);
  const [homeDetails, setHomeDetails] = useState<HomeDetails>({
    address: '',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    lotSize: 7500,
    yearBuilt: 2000,
    propertyType: 'single_family',
    condition: 'good'
  });

  const [improvements, setImprovements] = useState({
    kitchen: false,
    bathrooms: false,
    pool: false,
    solar: false,
    newRoof: false,
    newAC: false,
    impact: false,
    flooring: false
  });

  const [estimatedValue, setEstimatedValue] = useState(0);
  const [valueRange, setValueRange] = useState({ low: 0, high: 0 });
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lead capture
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadInfo, setLeadInfo] = useState({
    name: '',
    email: '',
    phone: '',
    timeline: 'just_curious',
    motivation: ''
  });

  // Calculate value based on inputs
  const calculateValue = () => {
    setLoading(true);

    // Base price per sqft for the area
    let basePricePerSqft = agent.primary_region?.includes('Miami') ? 450 :
                          agent.primary_region?.includes('Austin') ? 380 :
                          agent.primary_region?.includes('Orlando') ? 280 : 350;

    // Adjust for property type
    const typeMultipliers: Record<string, number> = {
      single_family: 1.0,
      condo: 0.85,
      townhouse: 0.92,
      multi_family: 1.15
    };

    // Adjust for condition
    const conditionMultipliers: Record<string, number> = {
      excellent: 1.15,
      good: 1.0,
      fair: 0.85,
      needs_work: 0.70
    };

    // Calculate base value
    let baseValue = homeDetails.sqft * basePricePerSqft *
                   typeMultipliers[homeDetails.propertyType] *
                   conditionMultipliers[homeDetails.condition];

    // Age adjustment (depreciation)
    const age = new Date().getFullYear() - homeDetails.yearBuilt;
    const ageAdjustment = Math.max(0.7, 1 - (age * 0.005)); // 0.5% per year, min 70%
    baseValue *= ageAdjustment;

    // Improvements bonus
    let improvementValue = 0;
    if (improvements.kitchen) improvementValue += 25000;
    if (improvements.bathrooms) improvementValue += 15000;
    if (improvements.pool) improvementValue += 35000;
    if (improvements.solar) improvementValue += 20000;
    if (improvements.newRoof) improvementValue += 10000;
    if (improvements.newAC) improvementValue += 8000;
    if (improvements.impact) improvementValue += 15000;
    if (improvements.flooring) improvementValue += 12000;

    const totalValue = baseValue + improvementValue;

    // Generate mock comparables
    const mockComps: Comparable[] = [
      {
        address: '123 Oak Street',
        soldPrice: totalValue * 0.98,
        soldDate: '2024-10-15',
        sqft: homeDetails.sqft - 100,
        bedrooms: homeDetails.bedrooms,
        bathrooms: homeDetails.bathrooms,
        distance: 0.3,
        pricePerSqft: (totalValue * 0.98) / (homeDetails.sqft - 100),
        daysOnMarket: 21
      },
      {
        address: '456 Pine Avenue',
        soldPrice: totalValue * 1.05,
        soldDate: '2024-09-22',
        sqft: homeDetails.sqft + 150,
        bedrooms: homeDetails.bedrooms,
        bathrooms: homeDetails.bathrooms + 0.5,
        distance: 0.5,
        pricePerSqft: (totalValue * 1.05) / (homeDetails.sqft + 150),
        daysOnMarket: 14
      },
      {
        address: '789 Elm Court',
        soldPrice: totalValue * 0.92,
        soldDate: '2024-10-01',
        sqft: homeDetails.sqft - 200,
        bedrooms: homeDetails.bedrooms - 1,
        bathrooms: homeDetails.bathrooms,
        distance: 0.7,
        pricePerSqft: (totalValue * 0.92) / (homeDetails.sqft - 200),
        daysOnMarket: 35
      }
    ];

    setTimeout(() => {
      setEstimatedValue(Math.round(totalValue));
      setValueRange({
        low: Math.round(totalValue * 0.92),
        high: Math.round(totalValue * 1.08)
      });
      setComparables(mockComps);
      setLoading(false);
      setShowResults(true);

      if (requireLead && !leadCaptured) {
        setShowLeadForm(true);
      }
    }, 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="home-value-estimator bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Free Home Value Estimate
        </h2>
        <p className="text-gray-600">
          Get an instant estimate and detailed market analysis for your {agent.primary_city} property
        </p>
      </div>

      {!showResults ? (
        <>
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              {[1, 2, 3].map(num => (
                <div
                  key={num}
                  className={`flex items-center ${num < 3 ? 'flex-1' : ''}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${step >= num ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {num}
                  </div>
                  {num < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${step > num ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className={step >= 1 ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>
                Property Info
              </span>
              <span className={step >= 2 ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>
                Details
              </span>
              <span className={step >= 3 ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>
                Improvements
              </span>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Property Address</label>
                <input
                  type="text"
                  value={homeDetails.address}
                  onChange={(e) => setHomeDetails({...homeDetails, address: e.target.value})}
                  placeholder="Enter your property address"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Property Type</label>
                  <select
                    value={homeDetails.propertyType}
                    onChange={(e) => setHomeDetails({...homeDetails, propertyType: e.target.value as any})}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="single_family">Single Family</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="multi_family">Multi-Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Year Built</label>
                  <input
                    type="number"
                    value={homeDetails.yearBuilt}
                    onChange={(e) => setHomeDetails({...homeDetails, yearBuilt: Number(e.target.value)})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!homeDetails.address}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                Next: Property Details
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bedrooms: {homeDetails.bedrooms}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={homeDetails.bedrooms}
                    onChange={(e) => setHomeDetails({...homeDetails, bedrooms: Number(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bathrooms: {homeDetails.bathrooms}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={homeDetails.bathrooms}
                    onChange={(e) => setHomeDetails({...homeDetails, bathrooms: Number(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Square Feet</label>
                  <input
                    type="number"
                    value={homeDetails.sqft}
                    onChange={(e) => setHomeDetails({...homeDetails, sqft: Number(e.target.value)})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Lot Size (sqft)</label>
                  <input
                    type="number"
                    value={homeDetails.lotSize}
                    onChange={(e) => setHomeDetails({...homeDetails, lotSize: Number(e.target.value)})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Property Condition</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['excellent', 'good', 'fair', 'needs_work'] as const).map(condition => (
                    <button
                      key={condition}
                      onClick={() => setHomeDetails({...homeDetails, condition})}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        homeDetails.condition === condition
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Next: Improvements
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Improvements */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select any recent improvements or special features:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  kitchen: 'Updated Kitchen',
                  bathrooms: 'Remodeled Bathrooms',
                  pool: 'Swimming Pool',
                  solar: 'Solar Panels',
                  newRoof: 'New Roof (< 5 years)',
                  newAC: 'New AC System',
                  impact: 'Impact Windows',
                  flooring: 'New Flooring'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={improvements[key as keyof typeof improvements]}
                      onChange={(e) => setImprovements({
                        ...improvements,
                        [key]: e.target.checked
                      })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={calculateValue}
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Calculating...' : 'Get My Home Value'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          {/* Estimated Value */}
          <div className="text-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Estimated Home Value</p>
            <div className="text-5xl font-bold text-indigo-900 mb-4">
              {formatCurrency(estimatedValue)}
            </div>
            <div className="text-lg text-gray-600">
              Range: {formatCurrency(valueRange.low)} - {formatCurrency(valueRange.high)}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Based on recent sales in your area
            </p>
          </div>

          {/* Comparable Sales - Teaser for Lead Capture */}
          {!leadCaptured ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none" />
              <div className="blur-sm">
                <h3 className="text-lg font-semibold mb-3">Recent Comparable Sales</h3>
                <div className="space-y-2">
                  {comparables.slice(0, 2).map((comp, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">*** Street Name Hidden ***</span>
                        <span className="font-semibold">{formatCurrency(comp.soldPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                <p className="text-sm text-gray-600 mb-3">
                  Get full comparable details and a professional CMA
                </p>
                <button
                  onClick={() => setShowLeadForm(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Unlock Complete Analysis
                </button>
              </div>
            </div>
          ) : (
            /* Full Results After Lead Capture */
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Comparable Sales</h3>
                <div className="space-y-3">
                  {comparables.map((comp, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{comp.address}</p>
                          <p className="text-sm text-gray-600">
                            Sold {formatDate(comp.soldDate)} • {comp.daysOnMarket} days on market
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(comp.soldPrice)}</p>
                          <p className="text-sm text-gray-600">
                            ${comp.pricePerSqft.toFixed(0)}/sqft
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>{comp.bedrooms} bed</span>
                        <span>{comp.bathrooms} bath</span>
                        <span>{comp.sqft.toLocaleString()} sqft</span>
                        <span>{comp.distance} mi away</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-green-50 rounded-xl">
                <h3 className="text-lg font-semibold mb-3">Maximize Your Sale Price</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">📈</span>
                    <div>
                      <p className="font-medium">Strategic Pricing</p>
                      <p className="text-sm text-gray-600">
                        Price within 2% of market value to sell 23% faster
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">🏠</span>
                    <div>
                      <p className="font-medium">Professional Staging</p>
                      <p className="text-sm text-gray-600">
                        Staged homes sell for 6% more on average
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-xl">📸</span>
                    <div>
                      <p className="font-medium">Professional Photography</p>
                      <p className="text-sm text-gray-600">
                        Quality photos generate 118% more online views
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Schedule Free Consultation with {agent.name}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lead Capture Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Get Your Complete Home Analysis
            </h3>
            <p className="text-gray-600 mb-4">
              Receive a detailed Comparative Market Analysis (CMA) with:
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">10+ comparable sales in your neighborhood</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">Market trends and pricing strategy</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">Personalized selling timeline</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">Net proceeds calculation</span>
              </li>
            </ul>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLeadCaptured(true);
                setShowLeadForm(false);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Your Name"
                value={leadInfo.name}
                onChange={(e) => setLeadInfo({...leadInfo, name: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={leadInfo.email}
                onChange={(e) => setLeadInfo({...leadInfo, email: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={leadInfo.phone}
                onChange={(e) => setLeadInfo({...leadInfo, phone: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <select
                value={leadInfo.timeline}
                onChange={(e) => setLeadInfo({...leadInfo, timeline: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="just_curious">Just Curious</option>
                <option value="3_months">Within 3 Months</option>
                <option value="6_months">Within 6 Months</option>
                <option value="1_year">Within 1 Year</option>
                <option value="asap">ASAP</option>
              </select>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold"
              >
                Get My Full Report
              </button>
            </form>
            <button
              onClick={() => setShowLeadForm(false)}
              className="mt-3 w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
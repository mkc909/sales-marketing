/**
 * Mortgage Calculator - Free tier tool for all agent profiles
 * Includes optional lead capture for enhanced features
 */

import { useState, useEffect } from 'react';
import type { Agent } from '~/types';

interface MortgageCalculatorProps {
  agent: Agent;
  enhanced?: boolean; // Show enhanced features for paid tiers
  leadCapture?: boolean; // Require lead capture for certain features
}

export function MortgageCalculator({ agent, enhanced = false, leadCapture = false }: MortgageCalculatorProps) {
  // Basic inputs
  const [homePrice, setHomePrice] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000); // 20%
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.0);
  const [loanTerm, setLoanTerm] = useState(30);

  // Enhanced inputs (paid tiers)
  const [propertyTax, setPropertyTax] = useState(enhanced ? 5000 : 0);
  const [homeInsurance, setHomeInsurance] = useState(enhanced ? 1200 : 0);
  const [hoa, setHOA] = useState(enhanced ? 0 : 0);
  const [pmi, setPMI] = useState(0);

  // Lead capture state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  // Calculated values
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);

  // Update down payment when percentage changes
  useEffect(() => {
    setDownPayment(Math.round(homePrice * (downPaymentPercent / 100)));
  }, [homePrice, downPaymentPercent]);

  // Calculate PMI if down payment < 20%
  useEffect(() => {
    if (downPaymentPercent < 20) {
      setPMI(Math.round((homePrice - downPayment) * 0.005 / 12)); // 0.5% annually
    } else {
      setPMI(0);
    }
  }, [downPayment, downPaymentPercent, homePrice]);

  // Main calculation
  useEffect(() => {
    const principal = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;

    // Calculate monthly mortgage payment (P&I)
    const monthlyPI = principal *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Add taxes, insurance, HOA, PMI for total monthly
    const monthlyTax = propertyTax / 12;
    const monthlyInsurance = homeInsurance / 12;
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + hoa + pmi;

    setMonthlyPayment(Math.round(totalMonthly));
    setTotalPayment(Math.round(totalMonthly * numPayments));
    setTotalInterest(Math.round(monthlyPI * numPayments - principal));
  }, [homePrice, downPayment, interestRate, loanTerm, propertyTax, homeInsurance, hoa, pmi]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEnhancedFeatures = () => {
    if (leadCapture && !leadCaptured) {
      setShowLeadForm(true);
    }
  };

  return (
    <div className="mortgage-calculator bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mortgage Calculator</h2>
        {agent.subscription_tier === 'ghost' && (
          <span className="text-sm text-gray-500">
            Provided by {agent.name}
          </span>
        )}
      </div>

      {/* Basic Inputs - Always Available */}
      <div className="space-y-6">
        <div>
          <label className="flex justify-between mb-2">
            <span className="font-semibold">Home Price</span>
            <span className="text-lg">{formatCurrency(homePrice)}</span>
          </label>
          <input
            type="range"
            min="100000"
            max="2000000"
            step="10000"
            value={homePrice}
            onChange={(e) => setHomePrice(Number(e.target.value))}
            className="w-full slider"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>$100k</span>
            <span>$2M</span>
          </div>
        </div>

        <div>
          <label className="flex justify-between mb-2">
            <span className="font-semibold">Down Payment</span>
            <span className="text-lg">
              {formatCurrency(downPayment)} ({downPaymentPercent}%)
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full slider"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
          {downPaymentPercent < 20 && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ PMI required for down payments less than 20%
            </p>
          )}
        </div>

        <div>
          <label className="flex justify-between mb-2">
            <span className="font-semibold">Interest Rate</span>
            <span className="text-lg">{interestRate.toFixed(2)}%</span>
          </label>
          <input
            type="range"
            min="3"
            max="10"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full slider"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>3%</span>
            <span>10%</span>
          </div>
        </div>

        <div>
          <label className="flex justify-between mb-2">
            <span className="font-semibold">Loan Term</span>
            <span className="text-lg">{loanTerm} years</span>
          </label>
          <div className="flex gap-2">
            {[15, 20, 30].map(term => (
              <button
                key={term}
                onClick={() => setLoanTerm(term)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  loanTerm === term
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {term} Year
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Features - Gated for Free Users */}
        {enhanced || leadCaptured ? (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-gray-700">Additional Costs</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Property Tax (Annual)
                </label>
                <input
                  type="number"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Home Insurance (Annual)
                </label>
                <input
                  type="number"
                  value={homeInsurance}
                  onChange={(e) => setHomeInsurance(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  HOA Fees (Monthly)
                </label>
                <input
                  type="number"
                  value={hoa}
                  onChange={(e) => setHOA(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {downPaymentPercent < 20 && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    PMI (Monthly)
                  </label>
                  <input
                    type="number"
                    value={pmi}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t pt-6">
            <button
              onClick={handleEnhancedFeatures}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              🔓 Unlock Advanced Calculator (Include Taxes & Insurance)
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monthly Payment</span>
            <span className="text-3xl font-bold text-indigo-900">
              {formatCurrency(monthlyPayment)}
            </span>
          </div>

          {(enhanced || leadCaptured) && (
            <>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Principal & Interest</span>
                  <span className="font-semibold">
                    {formatCurrency(monthlyPayment - propertyTax/12 - homeInsurance/12 - hoa - pmi)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Property Tax</span>
                  <span>{formatCurrency(propertyTax / 12)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Home Insurance</span>
                  <span>{formatCurrency(homeInsurance / 12)}</span>
                </div>
                {hoa > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">HOA Fees</span>
                    <span>{formatCurrency(hoa)}</span>
                  </div>
                )}
                {pmi > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PMI</span>
                    <span>{formatCurrency(pmi)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total of {loanTerm * 12} Payments</span>
              <span>{formatCurrency(totalPayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Interest Paid</span>
              <span>{formatCurrency(totalInterest)}</span>
            </div>
          </div>
        </div>

        {/* CTA for Agent Contact */}
        <div className="mt-6 p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600 mb-3">
            Ready to start your home search in {agent.primary_region || agent.city}?
          </p>
          <button
            popovertarget="lead-capture"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Get Pre-Approved Today
          </button>
        </div>
      </div>

      {/* Amortization Schedule Preview - Premium Feature */}
      {agent.subscription_tier === 'premium' && (
        <div className="mt-6 border-t pt-6">
          <button className="text-indigo-600 font-semibold hover:text-indigo-800">
            📊 View Full Amortization Schedule →
          </button>
        </div>
      )}

      {/* Lead Capture Popover */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Get Your Personalized Payment Plan
            </h3>
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
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold"
              >
                Unlock Advanced Features
              </button>
            </form>
            <button
              onClick={() => setShowLeadForm(false)}
              className="mt-3 w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(
            to right,
            #6366f1 0%,
            #6366f1 ${((homePrice - 100000) / 1900000) * 100}%,
            #e5e7eb ${((homePrice - 100000) / 1900000) * 100}%,
            #e5e7eb 100%
          );
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
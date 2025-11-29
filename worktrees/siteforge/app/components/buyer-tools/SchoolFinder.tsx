/**
 * School Finder Tool - Professional tier feature for buyers with children
 * Integrates with GreatSchools API for ratings and boundaries
 */

import { useState, useEffect } from 'react';
import type { Agent } from '~/types';

interface School {
  id: string;
  name: string;
  type: 'elementary' | 'middle' | 'high';
  rating: number;
  distance: number;
  address: string;
  enrollment: number;
  studentTeacherRatio: number;
  testScores: {
    math: number;
    reading: number;
  };
}

interface SchoolFinderProps {
  agent: Agent;
  propertyAddress?: string;
  leadCapture?: boolean;
}

export function SchoolFinder({ agent, propertyAddress, leadCapture = true }: SchoolFinderProps) {
  const [searchAddress, setSearchAddress] = useState(propertyAddress || '');
  const [schoolType, setSchoolType] = useState<'all' | 'elementary' | 'middle' | 'high'>('all');
  const [minRating, setMinRating] = useState(7);
  const [maxDistance, setMaxDistance] = useState(5);

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Lead capture for detailed reports
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);

  // Mock data for demo - would connect to GreatSchools API
  const mockSchools: School[] = [
    {
      id: '1',
      name: 'Coral Gables Elementary',
      type: 'elementary',
      rating: 9,
      distance: 0.8,
      address: '105 Minorca Ave, Coral Gables, FL 33134',
      enrollment: 450,
      studentTeacherRatio: 15,
      testScores: { math: 85, reading: 88 }
    },
    {
      id: '2',
      name: 'Ponce de Leon Middle School',
      type: 'middle',
      rating: 8,
      distance: 1.2,
      address: '5801 Augusto St, Coral Gables, FL 33146',
      enrollment: 750,
      studentTeacherRatio: 18,
      testScores: { math: 78, reading: 82 }
    },
    {
      id: '3',
      name: 'Coral Gables Senior High',
      type: 'high',
      rating: 9,
      distance: 1.5,
      address: '450 Bird Rd, Coral Gables, FL 33146',
      enrollment: 2800,
      studentTeacherRatio: 22,
      testScores: { math: 80, reading: 85 }
    },
    {
      id: '4',
      name: 'Sunset Elementary',
      type: 'elementary',
      rating: 8,
      distance: 2.1,
      address: '5120 Sunset Dr, Miami, FL 33143',
      enrollment: 520,
      studentTeacherRatio: 16,
      testScores: { math: 75, reading: 79 }
    },
    {
      id: '5',
      name: 'Carver Middle School',
      type: 'middle',
      rating: 7,
      distance: 2.8,
      address: '4901 Lincoln Dr, Miami, FL 33133',
      enrollment: 680,
      studentTeacherRatio: 20,
      testScores: { math: 70, reading: 74 }
    }
  ];

  const handleSearch = async () => {
    if (!searchAddress) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const filtered = mockSchools.filter(school => {
        const typeMatch = schoolType === 'all' || school.type === schoolType;
        const ratingMatch = school.rating >= minRating;
        const distanceMatch = school.distance <= maxDistance;
        return typeMatch && ratingMatch && distanceMatch;
      });
      setSchools(filtered);
      setLoading(false);
    }, 1000);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-50';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSchoolIcon = (type: string) => {
    switch(type) {
      case 'elementary': return '🎨';
      case 'middle': return '📚';
      case 'high': return '🎓';
      default: return '🏫';
    }
  };

  return (
    <div className="school-finder bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">School District Research</h2>
        <p className="text-gray-600">
          Find top-rated schools near any {agent.primary_city} property
        </p>
      </div>

      {/* Search Controls */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Property Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Enter address or neighborhood"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">School Type</label>
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">All Schools</option>
              <option value="elementary">Elementary</option>
              <option value="middle">Middle School</option>
              <option value="high">High School</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Min Rating: {minRating}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Distance: {maxDistance} mi
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {schools.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{schools.length} Schools Found</h3>
            {!leadCaptured && (
              <button
                onClick={() => setShowLeadForm(true)}
                className="text-indigo-600 font-semibold hover:text-indigo-800"
              >
                📊 Get Detailed Reports
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {schools.map(school => (
              <div
                key={school.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedSchool(school)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getSchoolIcon(school.type)}</span>
                      <div>
                        <h4 className="font-semibold text-lg">{school.name}</h4>
                        <p className="text-sm text-gray-600">
                          {school.type.charAt(0).toUpperCase() + school.type.slice(1)} School •
                          {' '}{school.distance} miles away
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <span className="text-xs text-gray-500">Rating</span>
                        <div className={`mt-1 px-3 py-1 rounded-full text-center font-bold ${getRatingColor(school.rating)}`}>
                          {school.rating}/10
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">Students</span>
                        <p className="font-semibold">{school.enrollment}</p>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">Student:Teacher</span>
                        <p className="font-semibold">{school.studentTeacherRatio}:1</p>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">Test Scores</span>
                        <div className="flex gap-2 text-sm">
                          <span className="font-semibold">M: {school.testScores.math}%</span>
                          <span className="font-semibold">R: {school.testScores.reading}%</span>
                        </div>
                      </div>
                    </div>

                    {leadCaptured && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600">{school.address}</p>
                        <div className="flex gap-4 mt-2">
                          <button className="text-sm text-indigo-600 font-semibold">
                            View Boundaries →
                          </button>
                          <button className="text-sm text-indigo-600 font-semibold">
                            Schedule Tour →
                          </button>
                          <button className="text-sm text-indigo-600 font-semibold">
                            Compare Schools →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* School Score Visualization */}
                  <div className="ml-4">
                    <div className="w-20 h-20 relative">
                      <svg className="transform -rotate-90 w-20 h-20">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke={school.rating >= 8 ? '#10b981' : school.rating >= 6 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(school.rating / 10) * 226.2} 226.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{school.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected School Detail Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedSchool.name}</h3>
                <p className="text-gray-600">{selectedSchool.address}</p>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Academic Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Math Proficiency</span>
                      <span className="font-semibold">{selectedSchool.testScores.math}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reading Proficiency</span>
                      <span className="font-semibold">{selectedSchool.testScores.reading}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">School Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Enrollment</span>
                      <span className="font-semibold">{selectedSchool.enrollment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Student:Teacher Ratio</span>
                      <span className="font-semibold">{selectedSchool.studentTeacherRatio}:1</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Programs Offered</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">AP Classes</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">STEM</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Arts</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Sports</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Parent Reviews</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {'★★★★☆'.split('').map((star, i) => (
                        <span key={i} className="text-yellow-500">{star}</span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">4.2/5 (127 reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-4">
                Want to see homes in this school district?
              </p>
              <button
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                onClick={() => {
                  setSelectedSchool(null);
                  // Trigger search for homes in this school district
                }}
              >
                Show Available Homes in {selectedSchool.name} District
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Capture for Detailed Reports */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Get Complete School Reports
            </h3>
            <p className="text-gray-600 mb-4">
              Unlock detailed school reports including test scores, demographics,
              and parent reviews for all schools in {agent.primary_city}.
            </p>
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
              <select className="w-full px-4 py-2 border rounded-lg">
                <option>Number of Children</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4+</option>
              </select>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold"
              >
                Get School Reports
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

      {/* Empty State */}
      {schools.length === 0 && !loading && searchAddress && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <span className="text-4xl">🏫</span>
          <p className="mt-4 text-gray-600">
            No schools found matching your criteria.
            <br />
            Try adjusting your filters or search radius.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!searchAddress && (
        <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
          <span className="text-4xl">🎒</span>
          <h3 className="mt-4 text-xl font-semibold">
            Education Matters in Real Estate
          </h3>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            Great schools can increase property values by up to 20%.
            Search any {agent.primary_city} address to see nearby school options.
          </p>
          {agent.subscription_tier === 'professional' && (
            <div className="mt-6 p-4 bg-white rounded-lg inline-block">
              <p className="text-sm font-semibold text-indigo-600">
                Premium Feature: Includes private school options
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
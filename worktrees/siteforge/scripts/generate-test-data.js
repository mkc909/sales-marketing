#!/usr/bin/env node

/**
 * ProGeoData Test Data Generator
 *
 * Generates realistic professional data across 6 industries:
 * - Real Estate, Legal, Insurance, Mortgage, Financial, Contractor
 *
 * Creates SQL files for progressive import testing:
 * - test-10.sql (10 records)
 * - small-100.sql (100 records)
 * - medium-1000.sql (1,000 records)
 * - large-10000.sql (10,000 records)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// DATA POOLS - Realistic names, companies, and locations
// ============================================================================

const FIRST_NAMES = {
  male: [
    'James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph',
    'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
    'Steven', 'Andrew', 'Kenneth', 'Joshua', 'Kevin', 'Brian', 'George', 'Timothy',
    'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
    'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
    'Samuel', 'Raymond', 'Gregory', 'Frank', 'Alexander', 'Patrick', 'Jack', 'Dennis',
    'Carlos', 'Jose', 'Miguel', 'Juan', 'Roberto', 'Fernando', 'Luis', 'Jorge',
    'Antonio', 'Francisco', 'Manuel', 'Ricardo', 'Eduardo', 'Rafael', 'Alejandro'
  ],
  female: [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
    'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Dorothy', 'Melissa',
    'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen',
    'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela', 'Emma', 'Nicole',
    'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel', 'Carolyn',
    'Janet', 'Catherine', 'Maria', 'Heather', 'Diane', 'Ruth', 'Julie', 'Olivia',
    'Joyce', 'Virginia', 'Victoria', 'Kelly', 'Lauren', 'Christina', 'Joan'
  ]
};

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson',
  'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross'
];

// Geographic data by state
const LOCATIONS = {
  FL: {
    name: 'Florida',
    cities: [
      { name: 'Miami', zip: '33101', county: 'Miami-Dade' },
      { name: 'Orlando', zip: '32801', county: 'Orange' },
      { name: 'Tampa', zip: '33602', county: 'Hillsborough' },
      { name: 'Jacksonville', zip: '32099', county: 'Duval' },
      { name: 'Fort Lauderdale', zip: '33301', county: 'Broward' },
      { name: 'West Palm Beach', zip: '33401', county: 'Palm Beach' },
      { name: 'Naples', zip: '34102', county: 'Collier' },
      { name: 'Sarasota', zip: '34236', county: 'Sarasota' },
      { name: 'Tallahassee', zip: '32301', county: 'Leon' },
      { name: 'St. Petersburg', zip: '33701', county: 'Pinellas' },
      { name: 'Clearwater', zip: '33755', county: 'Pinellas' },
      { name: 'Fort Myers', zip: '33901', county: 'Lee' },
      { name: 'Pensacola', zip: '32501', county: 'Escambia' },
      { name: 'Boca Raton', zip: '33431', county: 'Palm Beach' },
      { name: 'Gainesville', zip: '32601', county: 'Alachua' }
    ]
  },
  TX: {
    name: 'Texas',
    cities: [
      { name: 'Houston', zip: '77001', county: 'Harris' },
      { name: 'Dallas', zip: '75201', county: 'Dallas' },
      { name: 'Austin', zip: '78701', county: 'Travis' },
      { name: 'San Antonio', zip: '78205', county: 'Bexar' },
      { name: 'Fort Worth', zip: '76102', county: 'Tarrant' },
      { name: 'El Paso', zip: '79901', county: 'El Paso' },
      { name: 'Arlington', zip: '76010', county: 'Tarrant' },
      { name: 'Plano', zip: '75074', county: 'Collin' },
      { name: 'Corpus Christi', zip: '78401', county: 'Nueces' },
      { name: 'Lubbock', zip: '79401', county: 'Lubbock' },
      { name: 'Irving', zip: '75038', county: 'Dallas' },
      { name: 'Frisco', zip: '75034', county: 'Collin' },
      { name: 'The Woodlands', zip: '77380', county: 'Montgomery' },
      { name: 'Sugar Land', zip: '77478', county: 'Fort Bend' },
      { name: 'McKinney', zip: '75069', county: 'Collin' }
    ]
  },
  CA: {
    name: 'California',
    cities: [
      { name: 'Los Angeles', zip: '90001', county: 'Los Angeles' },
      { name: 'San Diego', zip: '92101', county: 'San Diego' },
      { name: 'San Francisco', zip: '94102', county: 'San Francisco' },
      { name: 'San Jose', zip: '95113', county: 'Santa Clara' },
      { name: 'Sacramento', zip: '95814', county: 'Sacramento' },
      { name: 'Long Beach', zip: '90802', county: 'Los Angeles' },
      { name: 'Oakland', zip: '94612', county: 'Alameda' },
      { name: 'Fresno', zip: '93721', county: 'Fresno' },
      { name: 'Irvine', zip: '92602', county: 'Orange' },
      { name: 'Santa Ana', zip: '92701', county: 'Orange' },
      { name: 'Anaheim', zip: '92805', county: 'Orange' },
      { name: 'Riverside', zip: '92501', county: 'Riverside' },
      { name: 'Stockton', zip: '95202', county: 'San Joaquin' },
      { name: 'Bakersfield', zip: '93301', county: 'Kern' },
      { name: 'Palo Alto', zip: '94301', county: 'Santa Clara' }
    ]
  }
};

// ============================================================================
// INDUSTRY-SPECIFIC DATA
// ============================================================================

const INDUSTRIES = {
  real_estate: {
    professions: ['agent', 'broker'],
    companies: [
      'Keller Williams Realty', 'RE/MAX', 'Coldwell Banker', 'Century 21',
      'Berkshire Hathaway HomeServices', 'Sotheby\'s International Realty',
      'Compass', 'eXp Realty', 'HomeSmart', 'Realty ONE Group',
      'Better Homes and Gardens Real Estate', 'Engel & Völkers',
      'Douglas Elliman', 'Corcoran Group', 'Redfin', 'Zillow',
      'Weichert Realtors', 'Long & Foster', 'John L. Scott Real Estate',
      'Pacific Sotheby\'s International Realty', 'Christie\'s International Real Estate'
    ],
    specializations: [
      'Residential Sales', 'Luxury Homes', 'Commercial Real Estate',
      'Investment Properties', 'First-Time Buyers', 'Waterfront Properties',
      'New Construction', 'Foreclosures', 'Short Sales', 'Condominiums',
      'Land Development', 'Property Management', 'Relocation Services',
      'Senior Housing', 'Green/Sustainable Homes', 'Historic Properties'
    ],
    licensePrefix: 'RE',
    yearsExperienceRange: [1, 35]
  },
  legal: {
    professions: ['attorney', 'paralegal'],
    companies: [
      'Morgan & Morgan', 'Greenberg Traurig', 'Holland & Knight',
      'Baker McKenzie', 'DLA Piper', 'Latham & Watkins', 'Kirkland & Ellis',
      'Skadden Arps', 'Jones Day', 'Sidley Austin', 'White & Case',
      'Hogan Lovells', 'Ropes & Gray', 'WilmerHale', 'Cooley LLP',
      'Gibson Dunn', 'Paul Hastings', 'Morrison & Foerster',
      'Perkins Coie', 'Akerman LLP', 'Buchanan Ingersoll & Rooney',
      'Carlton Fields', 'Foley & Lardner', 'Hunton Andrews Kurth'
    ],
    specializations: [
      'Personal Injury', 'Family Law', 'Criminal Defense', 'Corporate Law',
      'Real Estate Law', 'Immigration Law', 'Estate Planning', 'Tax Law',
      'Employment Law', 'Intellectual Property', 'Civil Litigation',
      'Business Law', 'Bankruptcy Law', 'Medical Malpractice',
      'Environmental Law', 'Securities Law', 'Healthcare Law',
      'Mergers & Acquisitions', 'Patent Law', 'Contract Law'
    ],
    licensePrefix: 'BAR',
    yearsExperienceRange: [1, 40]
  },
  insurance: {
    professions: ['agent', 'broker'],
    companies: [
      'State Farm', 'Allstate', 'Geico', 'Progressive', 'Farmers Insurance',
      'Liberty Mutual', 'Nationwide', 'USAA', 'Travelers', 'American Family',
      'MetLife', 'Prudential', 'New York Life', 'Northwestern Mutual',
      'MassMutual', 'Guardian Life', 'Principal Financial', 'AIG',
      'Chubb', 'Hartford', 'Zurich', 'Berkshire Hathaway Insurance',
      'Auto-Owners Insurance', 'Erie Insurance', 'Mutual of Omaha'
    ],
    specializations: [
      'Auto Insurance', 'Home Insurance', 'Life Insurance', 'Health Insurance',
      'Business Insurance', 'Commercial Insurance', 'Disability Insurance',
      'Long-Term Care', 'Umbrella Insurance', 'Flood Insurance',
      'Workers Compensation', 'Professional Liability', 'Cyber Insurance',
      'Marine Insurance', 'Aviation Insurance', 'Renters Insurance',
      'Medicare Supplements', 'Annuities', 'Group Benefits'
    ],
    licensePrefix: 'INS',
    yearsExperienceRange: [1, 30]
  },
  mortgage: {
    professions: ['loan_officer', 'broker'],
    companies: [
      'Quicken Loans/Rocket Mortgage', 'Wells Fargo Home Mortgage',
      'Chase Home Lending', 'Bank of America', 'US Bank Home Mortgage',
      'Caliber Home Loans', 'United Wholesale Mortgage', 'PennyMac',
      'loanDepot', 'Guaranteed Rate', 'CrossCountry Mortgage',
      'Movement Mortgage', 'Fairway Independent Mortgage', 'Guild Mortgage',
      'CMG Financial', 'Home Point Financial', 'AmeriSave Mortgage',
      'Better.com', 'PrimeLending', 'Nations Lending', 'Supreme Lending',
      'Cornerstone Home Lending', 'PHH Mortgage', 'HomeServices Lending'
    ],
    specializations: [
      'Conventional Loans', 'FHA Loans', 'VA Loans', 'USDA Loans',
      'Jumbo Loans', 'First-Time Homebuyers', 'Refinancing',
      'Reverse Mortgages', 'Construction Loans', 'Investment Property Loans',
      'Self-Employed Borrowers', 'Low Down Payment', 'Bad Credit Mortgages',
      'Bridge Loans', 'Non-QM Loans', 'Portfolio Loans', 'Cash-Out Refinance',
      'ARM Loans', 'Fixed-Rate Mortgages', 'Home Equity Loans'
    ],
    licensePrefix: 'NMLS',
    yearsExperienceRange: [1, 25]
  },
  financial: {
    professions: ['advisor', 'planner'],
    companies: [
      'Edward Jones', 'Morgan Stanley', 'Merrill Lynch', 'UBS',
      'Wells Fargo Advisors', 'Raymond James', 'Ameriprise Financial',
      'Charles Schwab', 'Fidelity Investments', 'TD Ameritrade',
      'RBC Wealth Management', 'LPL Financial', 'Baird', 'Stifel',
      'Janney Montgomery Scott', 'Oppenheimer & Co', 'Waddell & Reed',
      'Lincoln Financial', 'Principal Financial Group', 'Vanguard',
      'TIAA', 'MassMutual Financial Group', 'Northwestern Mutual',
      'New York Life Investments', 'Commonwealth Financial Network'
    ],
    specializations: [
      'Retirement Planning', 'Wealth Management', 'Investment Advisory',
      'Estate Planning', 'Tax Planning', 'College Savings', '401(k) Planning',
      'Portfolio Management', 'Risk Management', 'Financial Planning',
      'Insurance Planning', 'Social Security Planning', 'Trust Services',
      'Business Succession Planning', 'Charitable Giving', 'Divorce Planning',
      'Executive Compensation', 'Stock Options', 'Real Estate Investment',
      'Alternative Investments'
    ],
    licensePrefix: 'CFP',
    yearsExperienceRange: [1, 35]
  },
  contractor: {
    professions: ['general_contractor', 'electrician', 'plumber', 'hvac'],
    companies: [
      'ABC Contractors', 'BuildRight Construction', 'Premier Builders',
      'Elite Construction Group', 'Apex Contracting', 'Precision Build',
      'Mastercraft Contractors', 'Summit Construction', 'Skyline Builders',
      'Foundation Construction Co', 'Integrity Contractors', 'Legacy Builders',
      'Horizon Construction', 'ProBuild Contractors', 'Vertex Construction',
      'Diamond Builders', 'Crown Construction', 'Alliance Contractors',
      'Vanguard Builders', 'Sterling Construction', 'Metro Contractors',
      'Urban Build Group', 'Coastal Contractors', 'Pioneer Construction',
      'Titan Builders'
    ],
    specializations: [
      'Residential Construction', 'Commercial Construction', 'Remodeling',
      'Kitchen Renovations', 'Bathroom Renovations', 'Electrical Wiring',
      'HVAC Installation', 'Plumbing Repairs', 'Roofing', 'Flooring',
      'Painting', 'Drywall', 'Carpentry', 'Concrete Work', 'Foundation Repair',
      'Window Installation', 'Siding', 'Deck Building', 'Basement Finishing',
      'Home Additions', 'Solar Installation', 'Smart Home Systems',
      'Water Heaters', 'Emergency Services', 'Preventive Maintenance'
    ],
    licensePrefix: 'CL',
    yearsExperienceRange: [2, 40]
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomChoices(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateSlug(firstName, lastName, id) {
  return `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${id}`;
}

function generateEmail(firstName, lastName, company) {
  const domain = company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/realty|insurance|mortgage|financial|law|construction/g, '')
    .substring(0, 15) + '.com';
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generatePhone() {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${area}) ${prefix}-${line}`;
}

function generateLicenseNumber(industryData, state) {
  const prefix = industryData.licensePrefix;
  const number = randomInt(100000, 999999);
  return `${prefix}-${state}-${number}`;
}

function generateWebsite(company) {
  const domain = company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/realty|insurance|mortgage|financial|law|construction/g, '')
    .substring(0, 20);
  return `https://www.${domain}.com`;
}

function generateBio(firstName, profession, industry, yearsExperience, specializations) {
  const professionName = profession.replace(/_/g, ' ');
  const specs = specializations.slice(0, 2).join(' and ');

  return `${firstName} is a dedicated ${professionName} with ${yearsExperience} years of experience in ${industry}. ` +
    `Specializing in ${specs}, ${firstName} is committed to providing exceptional service and expert guidance. ` +
    `Known for attention to detail and client satisfaction.`;
}

// ============================================================================
// PROFESSIONAL DATA GENERATOR
// ============================================================================

function generateProfessional(id, industryKey) {
  const industryData = INDUSTRIES[industryKey];
  const gender = randomChoice(['male', 'female']);
  const firstName = randomChoice(FIRST_NAMES[gender]);
  const lastName = randomChoice(LAST_NAMES);
  const profession = randomChoice(industryData.professions);

  // Select random state and city
  const stateKey = randomChoice(['FL', 'TX', 'CA']);
  const stateData = LOCATIONS[stateKey];
  const city = randomChoice(stateData.cities);

  // Generate core data
  const company = randomChoice(industryData.companies);
  const yearsExperience = randomInt(...industryData.yearsExperienceRange);
  const specializations = randomChoices(industryData.specializations, randomInt(2, 4));
  const certifications = generateCertifications(industryKey, profession);

  // Contact info
  const phone = generatePhone();
  const email = generateEmail(firstName, lastName, company);
  const website = generateWebsite(company);

  // License info
  const licenseNumber = generateLicenseNumber(industryData, stateKey);
  const licenseState = stateKey;

  // Location
  const address = `${randomInt(100, 9999)} ${randomChoice(['Main', 'Oak', 'Maple', 'Pine', 'Cedar', 'Elm'])} ${randomChoice(['St', 'Ave', 'Blvd', 'Dr'])}`;

  // Additional fields
  const slug = generateSlug(firstName, lastName, id);
  const bio = generateBio(firstName, profession, industryKey, yearsExperience, specializations);
  const rating = (4.0 + Math.random()).toFixed(1);
  const reviewCount = randomInt(5, 150);

  // Service regions (nearby cities)
  const serviceRegions = randomChoices(
    stateData.cities.map(c => c.name),
    randomInt(3, 6)
  );

  // Languages
  const languages = ['English'];
  if (Math.random() > 0.7) languages.push('Spanish');
  if (Math.random() > 0.95) languages.push(randomChoice(['French', 'Mandarin', 'Portuguese']));

  return {
    id,
    slug,
    firstName,
    lastName,
    industry: industryKey,
    profession,
    company,
    licenseNumber,
    licenseState,
    yearsExperience,
    specializations,
    certifications,
    phone,
    email,
    website,
    address,
    city: city.name,
    state: stateKey,
    zipCode: city.zip,
    county: city.county,
    serviceRegions,
    bio,
    rating: parseFloat(rating),
    reviewCount,
    languages,
    verified: Math.random() > 0.2,
    featured: Math.random() > 0.9,
    active: true
  };
}

function generateCertifications(industry, profession) {
  const certs = {
    real_estate: ['CRS - Certified Residential Specialist', 'ABR - Accredited Buyer Representative', 'GRI - Graduate REALTOR Institute', 'SRES - Senior Real Estate Specialist'],
    legal: ['Board Certified', 'AV Rated', 'Super Lawyers', 'Best Lawyers in America'],
    insurance: ['CPCU - Chartered Property Casualty Underwriter', 'CLU - Chartered Life Underwriter', 'ChFC - Chartered Financial Consultant'],
    mortgage: ['CMC - Certified Mortgage Consultant', 'CRMS - Certified Residential Mortgage Specialist'],
    financial: ['CFP - Certified Financial Planner', 'CFA - Chartered Financial Analyst', 'ChFC - Chartered Financial Consultant', 'CIMA - Certified Investment Management Analyst'],
    contractor: ['Licensed & Insured', 'BBB Accredited', 'OSHA Certified', 'EPA Lead-Safe Certified']
  };

  const available = certs[industry] || [];
  return randomChoices(available, randomInt(1, 3));
}

// ============================================================================
// SQL GENERATION
// ============================================================================

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value) || typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateSQLInsert(professional) {
  const fields = [
    'id', 'slug', 'first_name', 'last_name', 'industry', 'profession',
    'company', 'license_number', 'license_state', 'years_experience',
    'specializations', 'certifications', 'phone', 'email', 'website',
    'address', 'city', 'state', 'zip_code', 'county', 'service_regions',
    'bio', 'rating', 'review_count', 'languages', 'verified', 'featured',
    'active', 'created_at', 'updated_at'
  ];

  const timestamp = new Date().toISOString();

  const values = [
    professional.id,
    professional.slug,
    professional.firstName,
    professional.lastName,
    professional.industry,
    professional.profession,
    professional.company,
    professional.licenseNumber,
    professional.licenseState,
    professional.yearsExperience,
    professional.specializations,
    professional.certifications,
    professional.phone,
    professional.email,
    professional.website,
    professional.address,
    professional.city,
    professional.state,
    professional.zipCode,
    professional.county,
    professional.serviceRegions,
    professional.bio,
    professional.rating,
    professional.reviewCount,
    professional.languages,
    professional.verified,
    professional.featured,
    professional.active,
    timestamp,
    timestamp
  ];

  return `INSERT INTO professionals (${fields.join(', ')}) VALUES (${values.map(escapeSQL).join(', ')});`;
}

// ============================================================================
// MAIN GENERATION LOGIC
// ============================================================================

function generateDataset(count, startId = 1) {
  const professionals = [];
  const industries = Object.keys(INDUSTRIES);

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    // Distribute evenly across industries
    const industryKey = industries[i % industries.length];
    const professional = generateProfessional(id, industryKey);
    professionals.push(professional);
  }

  return professionals;
}

function generateSQLFile(professionals, filename) {
  const header = `-- ProGeoData Test Data
-- Generated: ${new Date().toISOString()}
-- Records: ${professionals.length}
-- Industries: real_estate, legal, insurance, mortgage, financial, contractor

`;

  const inserts = professionals.map(p => generateSQLInsert(p)).join('\n');

  const footer = `

-- Verify import
SELECT
  industry,
  COUNT(*) as count,
  AVG(rating) as avg_rating,
  COUNT(DISTINCT state) as states_covered
FROM professionals
GROUP BY industry
ORDER BY industry;
`;

  const content = header + inserts + footer;

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, content, 'utf8');

  return filepath;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function main() {
  console.log('🚀 ProGeoData Test Data Generator\n');
  console.log('Generating realistic professional data across 6 industries...\n');

  const datasets = [
    { count: 10, filename: 'test-10.sql', description: 'Testing (10 records)' },
    { count: 100, filename: 'small-100.sql', description: 'Small batch (100 records)' },
    { count: 1000, filename: 'medium-1000.sql', description: 'Medium batch (1,000 records)' },
    { count: 10000, filename: 'large-10000.sql', description: 'Large batch (10,000 records)' }
  ];

  let startId = 1;

  datasets.forEach(({ count, filename, description }) => {
    console.log(`📊 Generating ${description}...`);
    const professionals = generateDataset(count, startId);
    const filepath = generateSQLFile(professionals, filename);
    console.log(`   ✅ Created: ${filepath}`);
    console.log(`   📈 Distribution:`);

    // Show distribution
    const distribution = {};
    professionals.forEach(p => {
      distribution[p.industry] = (distribution[p.industry] || 0) + 1;
    });

    Object.entries(distribution).forEach(([industry, count]) => {
      console.log(`      ${industry.padEnd(15)} ${count.toString().padStart(5)} records`);
    });

    console.log('');
    startId += count;
  });

  console.log('✨ All test data files generated successfully!\n');
  console.log('📁 Files created in: data/');
  console.log('   - test-10.sql (10 records)');
  console.log('   - small-100.sql (100 records)');
  console.log('   - medium-1000.sql (1,000 records)');
  console.log('   - large-10000.sql (10,000 records)\n');
  console.log('🔄 Next steps:');
  console.log('   1. Review data/test-10.sql to verify data quality');
  console.log('   2. Run: npm run import:test');
  console.log('   3. Progress to larger datasets after verification\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateProfessional,
  generateDataset,
  generateSQLFile
};

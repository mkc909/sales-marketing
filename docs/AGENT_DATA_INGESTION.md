# FL & TX Agent Data Ingestion Strategy

## Executive Summary

Loading all active Florida and Texas real estate agents into D1 requires a multi-source approach combining MLS rosters, state licensing APIs, and web scraping. With ~200,000 FL agents and ~150,000 TX agents, we need an efficient batch ingestion pipeline.

## Data Sources & Acquisition

### Primary Sources

#### 1. State License Databases (Most Reliable)
```typescript
interface LicenseSource {
  florida: {
    api: 'https://www.myfloridalicense.com/datadownload/',
    format: 'CSV',
    updateFrequency: 'weekly',
    fields: [
      'license_number',
      'full_name',
      'license_type',
      'status', // Active, Inactive, Expired
      'original_issue_date',
      'expiration_date',
      'mailing_address',
      'email', // Sometimes available
      'phone', // Sometimes available
    ],
    cost: 'FREE',
    totalRecords: '~200,000'
  },

  texas: {
    api: 'https://www.trec.texas.gov/public-information',
    format: 'CSV/API',
    updateFrequency: 'daily',
    fields: [
      'license_number',
      'full_name',
      'license_type',
      'status',
      'sponsoring_broker',
      'license_issue_date',
      'expiration_date',
      'public_address',
      'county'
    ],
    cost: 'FREE',
    totalRecords: '~150,000'
  }
}
```

#### 2. MLS Roster Data (Rich Information)
```typescript
interface MLSSource {
  // Florida Regional MLS Systems
  florida_mls: [
    {
      name: 'Miami MLS',
      coverage: ['Miami-Dade', 'Broward'],
      api: 'RETS/WebAPI',
      agentCount: '~35,000',
      requiredMembership: true
    },
    {
      name: 'Orlando Regional',
      coverage: ['Orange', 'Seminole', 'Osceola'],
      api: 'RETS',
      agentCount: '~20,000',
      requiredMembership: true
    },
    {
      name: 'Tampa Bay RMLS',
      coverage: ['Hillsborough', 'Pinellas'],
      api: 'WebAPI',
      agentCount: '~25,000',
      requiredMembership: true
    }
  ],

  // Texas MLS Systems
  texas_mls: [
    {
      name: 'HAR (Houston)',
      coverage: ['Harris', 'Fort Bend', 'Montgomery'],
      api: 'WebAPI',
      agentCount: '~45,000',
      requiredMembership: true
    },
    {
      name: 'NTREIS (Dallas)',
      coverage: ['Dallas', 'Collin', 'Denton'],
      api: 'RETS',
      agentCount: '~30,000',
      requiredMembership: true
    },
    {
      name: 'ABOR (Austin)',
      coverage: ['Travis', 'Williamson'],
      api: 'WebAPI',
      agentCount: '~15,000',
      requiredMembership: true
    }
  ]
}
```

#### 3. Brokerage Websites (Supplemental)
```typescript
interface BrokerageSource {
  majorBrokerages: [
    {
      name: 'Keller Williams',
      agentDirectory: 'https://www.kw.com/agent/search',
      scrapeMethod: 'Playwright',
      estimatedAgents: '~180,000 nationwide'
    },
    {
      name: 'RE/MAX',
      agentDirectory: 'https://www.remax.com/real-estate-agents',
      scrapeMethod: 'API + Scraping',
      estimatedAgents: '~140,000 nationwide'
    },
    {
      name: 'Coldwell Banker',
      agentDirectory: 'https://www.coldwellbanker.com/real-estate-agents',
      scrapeMethod: 'Scraping',
      estimatedAgents: '~90,000 nationwide'
    }
  ]
}
```

## Ingestion Pipeline Architecture

### Phase 1: State License Data Import
```typescript
// workers/agent-ingestion/src/license-import.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // Run weekly
    if (event.cron === '0 2 * * MON') {
      await this.importFloridaLicenses(env);
      await this.importTexasLicenses(env);
    }
  },

  async importFloridaLicenses(env: Env) {
    // Download CSV from Florida DBPR
    const csvUrl = 'https://www.myfloridalicense.com/datadownload/licenseData.asp';
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    // Parse CSV
    const agents = this.parseCSV(csvText);

    // Batch insert to D1
    const BATCH_SIZE = 1000;
    for (let i = 0; i < agents.length; i += BATCH_SIZE) {
      const batch = agents.slice(i, i + BATCH_SIZE);

      const stmt = env.DB.prepare(`
        INSERT OR REPLACE INTO agents (
          license_number, name, state, status,
          license_type, expiration_date, created_at,
          source, slug
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batchPromises = batch.map(agent => {
        const slug = this.generateSlug(agent.name, agent.state);
        return stmt.bind(
          agent.licenseNumber,
          agent.name,
          'FL',
          agent.status,
          agent.licenseType,
          agent.expirationDate,
          new Date().toISOString(),
          'FL_LICENSE_DB',
          slug
        ).run();
      });

      await Promise.all(batchPromises);
    }

    // Log import stats
    await env.DB.prepare(`
      INSERT INTO import_logs (source, state, count, timestamp)
      VALUES ('FL_LICENSE_DB', 'FL', ?, ?)
    `).bind(agents.length, Date.now()).run();
  }
}
```

### Phase 2: MLS Data Enrichment
```typescript
// workers/agent-ingestion/src/mls-enrichment.ts
class MLSEnrichment {
  async enrichFromMLS(env: Env) {
    // Get agents without MLS data
    const agentsToEnrich = await env.DB.prepare(`
      SELECT * FROM agents
      WHERE mls_id IS NULL
      AND state IN ('FL', 'TX')
      AND status = 'ACTIVE'
      LIMIT 1000
    `).all();

    for (const agent of agentsToEnrich.results) {
      try {
        // Try to match with MLS roster
        const mlsData = await this.searchMLSRoster(agent.name, agent.state);

        if (mlsData) {
          await env.DB.prepare(`
            UPDATE agents SET
              mls_id = ?,
              brokerage = ?,
              office_phone = ?,
              cell_phone = ?,
              email = ?,
              photo_url = ?,
              bio = ?,
              specialties = ?,
              years_experience = ?,
              total_sales = ?,
              enriched_at = ?
            WHERE license_number = ?
          `).bind(
            mlsData.mlsId,
            mlsData.brokerage,
            mlsData.officePhone,
            mlsData.cellPhone,
            mlsData.email,
            mlsData.photoUrl,
            mlsData.bio,
            mlsData.specialties,
            mlsData.yearsExperience,
            mlsData.totalSales,
            new Date().toISOString(),
            agent.license_number
          ).run();
        }
      } catch (error) {
        console.error(`Failed to enrich ${agent.name}:`, error);
      }
    }
  }

  async searchMLSRoster(name: string, state: string): Promise<any> {
    // Implementation depends on MLS access
    // Could use RETS, WebAPI, or scraping

    if (state === 'FL') {
      // Try Miami MLS first
      const miamiResult = await this.searchMiamiMLS(name);
      if (miamiResult) return miamiResult;

      // Try Orlando Regional
      const orlandoResult = await this.searchOrlandoMLS(name);
      if (orlandoResult) return orlandoResult;
    }

    if (state === 'TX') {
      // Try HAR (Houston)
      const houstonResult = await this.searchHoustonMLS(name);
      if (houstonResult) return houstonResult;

      // Try NTREIS (Dallas)
      const dallasResult = await this.searchDallasMLS(name);
      if (dallasResult) return dallasResult;
    }

    return null;
  }
}
```

### Phase 3: Brokerage Scraping
```typescript
// workers/agent-ingestion/src/brokerage-scraper.ts
import { chromium } from 'playwright';

class BrokerageScraper {
  async scrapeKellerWilliams(state: string) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to KW agent search
    await page.goto(`https://www.kw.com/agent/search?state=${state}`);

    const agents = [];
    let hasNextPage = true;

    while (hasNextPage) {
      // Wait for agents to load
      await page.waitForSelector('.agent-card');

      // Extract agent data
      const pageAgents = await page.evaluate(() => {
        const cards = document.querySelectorAll('.agent-card');
        return Array.from(cards).map(card => ({
          name: card.querySelector('.agent-name')?.textContent?.trim(),
          phone: card.querySelector('.agent-phone')?.textContent?.trim(),
          email: card.querySelector('.agent-email')?.textContent?.trim(),
          office: card.querySelector('.agent-office')?.textContent?.trim(),
          photo: card.querySelector('.agent-photo img')?.src,
          profileUrl: card.querySelector('a')?.href
        }));
      });

      agents.push(...pageAgents);

      // Check for next page
      const nextButton = await page.$('button.next-page');
      if (nextButton && !await nextButton.isDisabled()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        hasNextPage = false;
      }
    }

    await browser.close();
    return agents;
  }
}
```

### Phase 4: Ghost Profile Generation
```typescript
// workers/agent-ingestion/src/ghost-profiles.ts
class GhostProfileGenerator {
  async generateGhostProfiles(env: Env) {
    // Get top agents by city
    const topAgents = await env.DB.prepare(`
      SELECT a.*, COUNT(l.id) as listing_count
      FROM agents a
      LEFT JOIN listings l ON a.id = l.agent_id
      WHERE a.state IN ('FL', 'TX')
      AND a.status = 'ACTIVE'
      GROUP BY a.id
      ORDER BY listing_count DESC
      LIMIT 10000
    `).all();

    for (const agent of topAgents.results) {
      // Generate slug if not exists
      if (!agent.slug) {
        agent.slug = this.generateSlug(agent.name, agent.city);
      }

      // Create ghost profile page data
      await env.DB.prepare(`
        UPDATE agents SET
          ghost_profile = true,
          profile_views = 0,
          fake_leads_count = ?,
          profile_created_at = ?,
          slug = ?
        WHERE id = ?
      `).bind(
        Math.floor(Math.random() * 10) + 3, // 3-12 fake leads
        new Date().toISOString(),
        agent.slug,
        agent.id
      ).run();

      // Generate QR code
      await this.generateQRCode(agent.slug, env);

      // Create shortlink
      await env.LINKS.put(agent.slug, JSON.stringify({
        destination: `https://estateflow.com/agent/${agent.slug}`,
        type: 'agent_profile',
        created: Date.now()
      }));
    }
  }

  generateSlug(name: string, location: string): string {
    const clean = (str: string) => str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${clean(name)}-${clean(location)}`.substring(0, 50);
  }
}
```

## D1 Schema Optimizations for Scale

```sql
-- Optimized agents table for 350k+ records
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  license_number TEXT UNIQUE,
  mls_id TEXT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  state TEXT NOT NULL,
  city TEXT,
  county TEXT,
  status TEXT DEFAULT 'ACTIVE',

  -- Contact
  email TEXT,
  phone TEXT,
  cell_phone TEXT,
  office_phone TEXT,

  -- Brokerage
  brokerage TEXT,
  brokerage_license TEXT,
  office_address TEXT,

  -- Profile
  photo_url TEXT,
  bio TEXT,
  specialties TEXT,
  years_experience INTEGER,

  -- Stats
  total_sales INTEGER DEFAULT 0,
  avg_sale_price DECIMAL(12, 2),
  avg_dom INTEGER, -- Days on market
  listing_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,

  -- Ghost profile
  ghost_profile BOOLEAN DEFAULT true,
  claimed_at TIMESTAMP,
  claimed_by TEXT,
  profile_views INTEGER DEFAULT 0,
  fake_leads_count INTEGER DEFAULT 7,

  -- Metadata
  source TEXT, -- 'FL_LICENSE', 'TX_TREC', 'MLS', 'SCRAPE'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enriched_at TIMESTAMP,

  -- Indexes
  INDEX idx_state_city (state, city),
  INDEX idx_slug (slug),
  INDEX idx_license (license_number),
  INDEX idx_mls (mls_id),
  INDEX idx_brokerage (brokerage),
  INDEX idx_status (status),
  INDEX idx_ghost (ghost_profile, claimed_at)
);

-- Separate table for large text fields (bio, reviews)
CREATE TABLE agent_content (
  agent_id TEXT PRIMARY KEY,
  bio TEXT,
  achievements TEXT,
  testimonials TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Partitioned analytics table
CREATE TABLE agent_analytics_2024_q4 (
  agent_id TEXT,
  event_type TEXT,
  timestamp INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  INDEX idx_agent_time (agent_id, timestamp)
) PARTITION BY RANGE(timestamp);
```

## Import Process Implementation

### Step 1: Initial License Import (Day 1)
```bash
# Download Florida licenses
curl -O https://www.myfloridalicense.com/datadownload/RE_licenses.csv

# Download Texas licenses
curl -O https://www.trec.texas.gov/sites/default/files/license-holders.csv

# Run import worker
wrangler tail agent-ingestion --format json
```

### Step 2: MLS Enrichment (Day 2-3)
```typescript
// Schedule enrichment batches
const ENRICHMENT_SCHEDULE = {
  'Miami-Dade': 'batch_001',
  'Broward': 'batch_002',
  'Palm Beach': 'batch_003',
  'Orange': 'batch_004',
  'Hillsborough': 'batch_005',
  'Harris': 'batch_006',
  'Dallas': 'batch_007',
  'Travis': 'batch_008'
};
```

### Step 3: Priority Ghost Profiles (Day 4)
```sql
-- Identify high-value targets
SELECT
  name,
  city,
  COUNT(*) as listing_count,
  AVG(list_price) as avg_price
FROM agents a
JOIN listings l ON a.id = l.agent_id
WHERE a.state IN ('FL', 'TX')
AND a.ghost_profile = false
GROUP BY a.id
ORDER BY listing_count DESC, avg_price DESC
LIMIT 5000;
```

### Step 4: Monitoring & Updates
```typescript
// workers/agent-ingestion/src/monitoring.ts
class IngestionMonitor {
  async generateReport(env: Env) {
    const stats = await env.DB.prepare(`
      SELECT
        state,
        COUNT(*) as total_agents,
        COUNT(CASE WHEN mls_id IS NOT NULL THEN 1 END) as with_mls,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
        COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
        COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as with_photo,
        COUNT(CASE WHEN ghost_profile = true THEN 1 END) as ghost_profiles,
        COUNT(CASE WHEN claimed_at IS NOT NULL THEN 1 END) as claimed
      FROM agents
      GROUP BY state
    `).all();

    return {
      timestamp: new Date().toISOString(),
      stats: stats.results,
      recommendations: this.generateRecommendations(stats.results)
    };
  }
}
```

## Cost Analysis

### Data Acquisition Costs
```typescript
const COSTS = {
  stateLicenses: {
    florida: 0, // Free public records
    texas: 0    // Free public records
  },

  mlsAccess: {
    miami: 500,    // Monthly MLS membership
    orlando: 400,  // Monthly MLS membership
    tampa: 450,    // Monthly MLS membership
    houston: 600,  // Monthly MLS membership
    dallas: 550,   // Monthly MLS membership
    austin: 400    // Monthly MLS membership
  },

  scraping: {
    playwright: 0,     // Open source
    proxies: 200,      // Monthly rotating proxies
    captchaSolving: 100 // 2captcha or similar
  },

  storage: {
    d1: {
      reads: 0.001,    // Per 1000 reads
      writes: 0.005,   // Per 1000 writes
      storage: 0.25    // Per GB per month
    }
  },

  totalMonthly: 3500,
  perAgent: 0.01 // $0.01 per agent profile
};
```

## Timeline

### Week 1: License Data
- Day 1-2: Import FL licenses (~200k records)
- Day 3-4: Import TX licenses (~150k records)
- Day 5: Data validation and deduplication

### Week 2: MLS Enrichment
- Day 6-8: Miami, Fort Lauderdale, West Palm Beach
- Day 9-10: Orlando, Tampa, Jacksonville
- Day 11-12: Houston, Dallas, Austin, San Antonio

### Week 3: Ghost Profiles
- Day 13-14: Generate top 10,000 ghost profiles
- Day 15: Create QR codes and shortlinks
- Day 16: Deploy profile pages

### Week 4: Optimization
- Day 17-18: Performance tuning
- Day 19: Search indexing
- Day 20: Analytics setup

## Success Metrics

```typescript
const SUCCESS_METRICS = {
  coverage: {
    florida: '95% of active agents', // ~190k of 200k
    texas: '93% of active agents'    // ~140k of 150k
  },

  enrichment: {
    withEmail: '40%',     // ~140k agents
    withPhone: '60%',     // ~210k agents
    withPhoto: '30%',     // ~105k agents
    withMLS: '70%'        // ~245k agents
  },

  ghostProfiles: {
    created: 10000,
    claimed: 500,         // 5% claim rate in first month
    leadsGenerated: 2000, // Average 0.2 leads per profile
    conversionRate: '2%'  // Leads to paid accounts
  },

  performance: {
    importSpeed: '5000 agents/minute',
    queryLatency: '<10ms',
    profileLoadTime: '<100ms'
  }
};
```

## Conclusion

Loading FL and TX agents into D1 is achievable through:

1. **Free state license databases** as the foundation
2. **MLS partnerships** for enrichment (requires membership)
3. **Strategic scraping** for missing data
4. **Ghost profile generation** for top 10,000 agents
5. **Batch processing** to handle 350k+ records efficiently

Total implementation: ~4 weeks
Total cost: ~$3,500 initial + $500/month maintenance
Expected ROI: 500 claimed profiles × $49/mo = $24,500/mo
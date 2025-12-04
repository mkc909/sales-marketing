/**
 * ProGeoData Queue Seed Worker
 *
 * Seeds the scrape queue with ZIP codes from FL, TX, and CA.
 * Runs on cron schedule (daily) or manual HTTP trigger.
 *
 * Responsibilities:
 * - Load ZIP codes for target states
 * - Check scrape_queue_state for already queued items
 * - Send new messages to progeodata-scrape-queue
 * - Update D1 state tracking
 */

interface Env {
  SCRAPE_QUEUE: Queue<ScrapeMessage>;
  DB: D1Database;
  SEED_STATE: KVNamespace;
  SEED_VERSION: string;
  DEFAULT_PRIORITY: string;
  DEBUG?: string;
}

interface ScrapeMessage {
  zip_code: string;
  state: string;
  source_type: string;
  profession: string;
  priority: number;
  scheduled_at: string;
}

interface QueueState {
  zip_code: string;
  state: string;
  status: string;
  priority: number;
  last_attempted_at: string | null;
}

// Sample ZIP codes for initial testing (will be expanded to full datasets)
const TEST_ZIP_CODES = {
  FL: ['33101', '33109', '33139', '33140', '33141'], // Miami area
  TX: ['75001', '75201', '75202', '75203', '75204'], // Dallas area
  CA: ['90210', '90211', '90212', '90401', '90402'], // LA area
  WA: ['98070', '98101', '98102', '98103', '98104'], // Vashon Island (98070) + Seattle downtown
};

// Production ZIP code datasets (top 100 per state by population)
const PRODUCTION_ZIP_CODES = {
  FL: [
    // Miami-Dade County
    '33101', '33109', '33125', '33126', '33127', '33128', '33129', '33130', '33131', '33132',
    '33133', '33134', '33135', '33136', '33137', '33138', '33139', '33140', '33141', '33142',
    '33143', '33144', '33145', '33146', '33147', '33149', '33150', '33154', '33155', '33156',
    '33157', '33158', '33160', '33161', '33162', '33165', '33166', '33167', '33168', '33169',
    '33170', '33172', '33173', '33174', '33175', '33176', '33177', '33178', '33179', '33180',
    '33181', '33182', '33183', '33184', '33185', '33186', '33187', '33189', '33190', '33193',
    // Broward County (Fort Lauderdale area)
    '33004', '33009', '33019', '33020', '33021', '33023', '33024', '33025', '33026', '33027',
    '33028', '33029', '33060', '33062', '33063', '33064', '33065', '33066', '33067', '33068',
    '33069', '33071', '33073', '33076', '33301', '33304', '33305', '33306', '33308', '33309',
    '33311', '33312', '33313', '33314', '33315', '33316', '33317', '33319', '33321', '33322',
  ],
  TX: [
    // Dallas County
    '75001', '75006', '75019', '75040', '75041', '75042', '75043', '75044', '75050', '75060',
    '75061', '75062', '75080', '75081', '75082', '75115', '75134', '75149', '75150', '75159',
    '75180', '75181', '75182', '75201', '75202', '75203', '75204', '75205', '75206', '75207',
    '75208', '75209', '75210', '75211', '75212', '75214', '75215', '75216', '75217', '75218',
    '75219', '75220', '75223', '75224', '75225', '75226', '75227', '75228', '75229', '75230',
    '75231', '75232', '75233', '75234', '75235', '75236', '75237', '75238', '75240', '75241',
    // Harris County (Houston)
    '77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010',
    '77011', '77012', '77013', '77014', '77015', '77016', '77017', '77018', '77019', '77020',
    '77021', '77022', '77023', '77024', '77025', '77026', '77027', '77028', '77029', '77030',
    '77031', '77032', '77033', '77034', '77035', '77036', '77037', '77038', '77039', '77040',
  ],
  CA: [
    // Los Angeles County
    '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90010', '90011',
    '90012', '90013', '90014', '90015', '90016', '90017', '90018', '90019', '90020', '90021',
    '90022', '90023', '90024', '90025', '90026', '90027', '90028', '90029', '90031', '90032',
    '90033', '90034', '90035', '90036', '90037', '90038', '90039', '90040', '90041', '90042',
    '90043', '90044', '90045', '90046', '90047', '90048', '90049', '90056', '90057', '90058',
    '90059', '90061', '90062', '90063', '90064', '90065', '90066', '90067', '90068', '90069',
    // Orange County
    '92602', '92603', '92604', '92606', '92610', '92612', '92614', '92617', '92618', '92620',
    '92627', '92630', '92637', '92648', '92649', '92651', '92653', '92655', '92657', '92660',
    '92661', '92662', '92663', '92677', '92679', '92683', '92688', '92691', '92692', '92694',
    '92701', '92703', '92704', '92705', '92706', '92707', '92708', '92780', '92782', '92801',
  ],
  WA: [
    // Vashon Island (MUST INCLUDE - User specifically requested)
    '98070',
    // Seattle Core
    '98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98112',
    '98115', '98116', '98117', '98118', '98119', '98121', '98122', '98125', '98126', '98133',
    '98134', '98136', '98144', '98146', '98154', '98155', '98158', '98161', '98164', '98166',
    '98168', '98174', '98177', '98178', '98188', '98195', '98199',
    // Bellevue/Eastside
    '98004', '98005', '98006', '98007', '98008', '98009', '98011', '98027', '98029', '98033',
    '98034', '98039', '98040', '98052', '98053', '98056', '98059', '98074', '98075', '98077',
    // Tacoma area
    '98402', '98403', '98404', '98405', '98406', '98407', '98408', '98409', '98411', '98412',
    '98413', '98416', '98418', '98421', '98422', '98424', '98444', '98445', '98446', '98447',
    // Everett/North
    '98201', '98203', '98204', '98205', '98206', '98207', '98208', '98213', '98270', '98271',
    '98272', '98273', '98274', '98275', '98290', '98291', '98292', '98293', '98294', '98296',
  ],
};

// Map states to source types
const STATE_SOURCE_MAP: Record<string, string> = {
  FL: 'FL_DBPR',
  TX: 'TX_TREC',
  CA: 'CA_DRE',
  WA: 'WA_DOL',  // Washington Department of Licensing
};

/**
 * Get ZIP codes for seeding based on mode
 */
function getZipCodes(mode: 'test' | 'production'): typeof TEST_ZIP_CODES {
  return mode === 'test' ? TEST_ZIP_CODES : PRODUCTION_ZIP_CODES;
}

/**
 * Check if a ZIP is already queued or recently processed
 */
async function isAlreadyQueued(
  db: D1Database,
  zipCode: string,
  state: string,
  sourceType: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT status, last_attempted_at
       FROM scrape_queue_state
       WHERE zip_code = ? AND state = ? AND source_type = ?`
    )
    .bind(zipCode, state, sourceType)
    .first<QueueState>();

  if (!result) {
    return false; // Not in queue at all
  }

  // Re-queue if:
  // - Status is 'failed' and hasn't been attempted in 24 hours
  // - Status is 'completed' and hasn't been attempted in 7 days
  const lastAttempt = result.last_attempted_at
    ? new Date(result.last_attempted_at)
    : null;
  const now = new Date();

  if (result.status === 'failed' && lastAttempt) {
    const hoursSinceAttempt =
      (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);
    return hoursSinceAttempt < 24; // Don't re-queue if attempted within 24 hours
  }

  if (result.status === 'completed' && lastAttempt) {
    const daysSinceAttempt =
      (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAttempt < 7; // Don't re-queue if completed within 7 days
  }

  // Don't re-queue if currently queued or processing
  if (['queued', 'processing'].includes(result.status)) {
    return true;
  }

  return false;
}

/**
 * Insert or update queue state in D1
 */
async function upsertQueueState(
  db: D1Database,
  zipCode: string,
  state: string,
  sourceType: string,
  priority: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO scrape_queue_state
       (zip_code, state, source_type, profession, status, priority, queued_at, updated_at)
       VALUES (?, ?, ?, 'real_estate', 'queued', ?, ?, ?)
       ON CONFLICT(zip_code, state, source_type, profession) DO UPDATE SET
         status = 'queued',
         priority = excluded.priority,
         queued_at = excluded.queued_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      zipCode,
      state,
      sourceType,
      priority,
      new Date().toISOString(),
      new Date().toISOString()
    )
    .run();
}

/**
 * Seed the queue with ZIP codes
 */
async function seedQueue(
  env: Env,
  mode: 'test' | 'production',
  states?: string[],
  force: boolean = false
): Promise<{ queued: number; skipped: number; errors: number }> {
  const zipCodes = getZipCodes(mode);
  const targetStates = states || Object.keys(zipCodes);
  const defaultPriority = parseInt(env.DEFAULT_PRIORITY || '5');

  let queued = 0;
  let skipped = 0;
  let errors = 0;

  console.log(
    `Starting queue seed - Mode: ${mode}, States: ${targetStates.join(', ')}`
  );

  for (const state of targetStates) {
    const stateZips = zipCodes[state as keyof typeof zipCodes];
    if (!stateZips) {
      console.warn(`No ZIP codes found for state: ${state}`);
      continue;
    }

    const sourceType = STATE_SOURCE_MAP[state];
    console.log(`Processing ${stateZips.length} ZIPs for ${state} (${sourceType})`);

    for (const zip of stateZips) {
      try {
        // Check if already queued (unless force is true)
        if (!force) {
          const alreadyQueued = await isAlreadyQueued(env.DB, zip, state, sourceType);
          if (alreadyQueued) {
            skipped++;
            if (env.DEBUG) {
              console.log(`Skipped ${state}-${zip}: already queued or recently processed`);
            }
            continue;
          }
        }

        // Create queue message
        const message: ScrapeMessage = {
          zip_code: zip,
          state: state,
          source_type: sourceType,
          profession: 'real_estate',
          priority: defaultPriority,
          scheduled_at: new Date().toISOString(),
        };

        // Send to queue
        await env.SCRAPE_QUEUE.send(message);

        // Update D1 state
        await upsertQueueState(env.DB, zip, state, sourceType, defaultPriority);

        queued++;
        if (env.DEBUG) {
          console.log(`Queued ${state}-${zip} for scraping`);
        }
      } catch (error) {
        errors++;
        console.error(`Error queuing ${state}-${zip}:`, error);
      }
    }
  }

  console.log(
    `Queue seed complete - Queued: ${queued}, Skipped: ${skipped}, Errors: ${errors}`
  );

  return { queued, skipped, errors };
}

/**
 * HTTP handler for manual triggers and monitoring
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          version: env.SEED_VERSION,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Manual seed trigger
    if (url.pathname === '/seed' && request.method === 'POST') {
      try {
        // Parse request body for options
        const body: any = await request.json().catch(() => ({}));
        const mode = (body.mode as 'test' | 'production') || 'test';
        const states = body.states as string[] | undefined;
        const force = body.force as boolean | undefined;

        console.log(`Manual seed triggered - Mode: ${mode}, States: ${states?.join(', ') || 'all'}, Force: ${force || false}`);

        const result = await seedQueue(env, mode, states, force);

        return new Response(
          JSON.stringify({
            success: true,
            mode,
            states: states || 'all',
            result,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Seed error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Queue status endpoint
    if (url.pathname === '/status' && request.method === 'GET') {
      try {
        const stats = await env.DB.prepare(
          `SELECT
             state,
             source_type,
             status,
             COUNT(*) as count
           FROM scrape_queue_state
           GROUP BY state, source_type, status
           ORDER BY state, source_type, status`
        ).all();

        const queueHealth = await env.DB.prepare(
          `SELECT * FROM queue_health`
        ).all();

        return new Response(
          JSON.stringify({
            stats: stats.results,
            health: queueHealth.results,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Status error:', error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('ProGeoData Queue Seed Worker\n\nEndpoints:\n- POST /seed - Trigger manual seed\n- GET /status - Queue status\n- GET /health - Health check', {
      status: 200,
    });
  },

  /**
   * Cron trigger handler - runs daily at 6 AM UTC
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron triggered queue seed at', new Date().toISOString());

    try {
      // Run in production mode for cron
      const result = await seedQueue(env, 'production');

      // Store last run stats in KV
      await env.SEED_STATE.put(
        'last_cron_run',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          result,
        }),
        {
          expirationTtl: 86400 * 7, // Keep for 7 days
        }
      );

      console.log('Cron seed completed:', result);
    } catch (error) {
      console.error('Cron seed error:', error);
    }
  },
};

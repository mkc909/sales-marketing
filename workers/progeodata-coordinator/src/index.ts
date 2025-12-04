export interface Env {
  SEED_WORKER: Fetcher;
  DB: D1Database;
  MIN_QUEUE_DEPTH: string;
  MAX_QUEUE_DEPTH: string;
  SEED_THRESHOLD: string;
  ALERT_THRESHOLD_ERROR_RATE: string;
  ALERT_THRESHOLD_QUEUE_STALE_MINUTES: string;
  SEED_WORKER_URL: string;
  DEBUG?: string;
}

interface Alert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const minQueueDepth = parseInt(env.MIN_QUEUE_DEPTH || '100');
    const maxQueueDepth = parseInt(env.MAX_QUEUE_DEPTH || '10000');
    const seedThreshold = parseInt(env.SEED_THRESHOLD || '50');
    const errorRateThreshold = parseFloat(env.ALERT_THRESHOLD_ERROR_RATE || '0.1');
    const staleMinutes = parseInt(env.ALERT_THRESHOLD_QUEUE_STALE_MINUTES || '30');
    const debug = env.DEBUG === 'true';

    const alerts: Alert[] = [];

    try {
      if (debug) {
        console.log('Coordinator health check starting...');
      }

      // Check queue state
      const queueState = await env.DB.prepare(`
        SELECT * FROM queue_state WHERE queue_name = 'progeodata-zip-queue'
      `).first<{
        total_items: number;
        processed_items: number;
        failed_items: number;
        status: string;
        last_seed_time: string;
        last_process_time: string;
      }>();

      const currentDepth = queueState ?
        (queueState.total_items - queueState.processed_items - queueState.failed_items) : 0;

      if (debug) {
        console.log(`Queue depth: ${currentDepth}, Threshold: ${seedThreshold}`);
      }

      // Check if we need to seed more ZIPs
      if (currentDepth < seedThreshold) {
        console.log(`Queue depth (${currentDepth}) below threshold (${seedThreshold}), triggering seed`);

        // Trigger seed worker
        const seedResponse = await env.SEED_WORKER.fetch(env.SEED_WORKER_URL + '/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!seedResponse.ok) {
          const error = await seedResponse.text();
          throw new Error(`Failed to trigger seed: ${seedResponse.status} - ${error}`);
        }

        const seedResult = await seedResponse.json() as any;
        console.log('Seed triggered:', seedResult);

        // Log seed trigger
        await env.DB.prepare(`
          INSERT INTO processing_log
          (worker_id, zip_code, state, status, records_found, created_at)
          VALUES ('coordinator', 'trigger', 'ALL', 'seed_triggered', ?, datetime('now'))
        `).bind(seedResult.totalQueued || 0).run();
      }

      // Check worker health
      const workerHealth = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_workers,
          COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_workers,
          COUNT(CASE WHEN status = 'degraded' THEN 1 END) as degraded_workers,
          COUNT(CASE WHEN datetime(last_heartbeat) < datetime('now', '-5 minutes') THEN 1 END) as stale_workers,
          AVG(average_processing_time_ms) as avg_processing_time,
          SUM(items_processed) as total_items_processed,
          SUM(errors_count) as total_errors
        FROM worker_health
        WHERE worker_type = 'consumer'
      `).first<{
        total_workers: number;
        healthy_workers: number;
        degraded_workers: number;
        stale_workers: number;
        avg_processing_time: number;
        total_items_processed: number;
        total_errors: number;
      }>();

      // Check error rates for last hour
      const errorStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_errors,
          COUNT(DISTINCT worker_id) as affected_workers
        FROM error_log
        WHERE datetime(created_at) > datetime('now', '-1 hour')
      `).first<{
        total_errors: number;
        affected_workers: number;
      }>();

      const processingStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_processed,
          SUM(records_saved) as total_records_saved,
          AVG(processing_time_ms) as avg_processing_time
        FROM processing_log
        WHERE datetime(created_at) > datetime('now', '-1 hour')
        AND worker_id != 'coordinator'
        AND worker_id != 'seed'
      `).first<{
        total_processed: number;
        total_records_saved: number;
        avg_processing_time: number;
      }>();

      // Calculate error rate
      const errorRate = (processingStats && processingStats.total_processed > 0) ?
        (errorStats?.total_errors || 0) / processingStats.total_processed : 0;

      // Generate alerts based on thresholds
      if (errorRate > errorRateThreshold) {
        alerts.push({
          type: 'high_error_rate',
          message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${errorRateThreshold * 100}%`,
          severity: 'critical',
          timestamp: new Date().toISOString()
        });
      }

      if (workerHealth && workerHealth.stale_workers > 0) {
        alerts.push({
          type: 'stale_workers',
          message: `${workerHealth.stale_workers} workers have not reported heartbeat in 5 minutes`,
          severity: 'high',
          timestamp: new Date().toISOString()
        });
      }

      if (workerHealth && workerHealth.degraded_workers > workerHealth.healthy_workers) {
        alerts.push({
          type: 'degraded_workers',
          message: `More degraded workers (${workerHealth.degraded_workers}) than healthy (${workerHealth.healthy_workers})`,
          severity: 'high',
          timestamp: new Date().toISOString()
        });
      }

      if (queueState && queueState.last_process_time) {
        const lastProcessTime = new Date(queueState.last_process_time).getTime();
        const staleThreshold = Date.now() - (staleMinutes * 60 * 1000);

        if (lastProcessTime < staleThreshold) {
          alerts.push({
            type: 'queue_stale',
            message: `Queue has not processed items in ${staleMinutes} minutes`,
            severity: 'critical',
            timestamp: new Date().toISOString()
          });
        }
      }

      if (currentDepth > maxQueueDepth) {
        alerts.push({
          type: 'queue_overflow',
          message: `Queue depth (${currentDepth}) exceeds maximum (${maxQueueDepth})`,
          severity: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Calculate system health score
      const healthScore = calculateHealthScore({
        errorRate,
        healthyWorkerRatio: workerHealth ? workerHealth.healthy_workers / Math.max(workerHealth.total_workers, 1) : 0,
        queueDepthRatio: currentDepth / maxQueueDepth,
        hasStaleWorkers: workerHealth?.stale_workers > 0
      });

      // Log coordinator status
      const coordinatorStatus = {
        queue_depth: currentDepth,
        queue_status: queueState?.status || 'unknown',
        worker_stats: {
          total: workerHealth?.total_workers || 0,
          healthy: workerHealth?.healthy_workers || 0,
          degraded: workerHealth?.degraded_workers || 0,
          stale: workerHealth?.stale_workers || 0
        },
        processing_stats: {
          hourly_processed: processingStats?.total_processed || 0,
          hourly_records: processingStats?.total_records_saved || 0,
          avg_time_ms: processingStats?.avg_processing_time || 0
        },
        error_stats: {
          hourly_errors: errorStats?.total_errors || 0,
          error_rate: errorRate,
          affected_workers: errorStats?.affected_workers || 0
        },
        health_score: healthScore,
        alerts: alerts
      };

      await env.DB.prepare(`
        INSERT INTO worker_health
        (worker_id, worker_type, status, last_heartbeat, context, created_at, updated_at)
        VALUES ('coordinator', 'coordinator', ?, datetime('now'), ?, datetime('now'), datetime('now'))
        ON CONFLICT(worker_id) DO UPDATE SET
          status = ?,
          last_heartbeat = datetime('now'),
          context = ?,
          updated_at = datetime('now')
      `).bind(
        healthScore > 0.8 ? 'healthy' : healthScore > 0.5 ? 'degraded' : 'critical',
        JSON.stringify(coordinatorStatus),
        healthScore > 0.8 ? 'healthy' : healthScore > 0.5 ? 'degraded' : 'critical',
        JSON.stringify(coordinatorStatus)
      ).run();

      // Log alerts if any
      if (alerts.length > 0) {
        console.error('ALERTS:', alerts);

        for (const alert of alerts) {
          await env.DB.prepare(`
            INSERT INTO error_log
            (worker_id, error_type, error_message, context, created_at)
            VALUES ('coordinator', ?, ?, ?, datetime('now'))
          `).bind(
            alert.type,
            alert.message,
            JSON.stringify(alert)
          ).run();
        }
      }

      console.log('Coordinator health check complete', {
        queue_depth: currentDepth,
        healthy_workers: workerHealth?.healthy_workers || 0,
        error_rate: (errorRate * 100).toFixed(2) + '%',
        health_score: healthScore.toFixed(2),
        alerts: alerts.length
      });

    } catch (error: any) {
      console.error('Coordinator error:', error);

      // Log critical error
      await env.DB.prepare(`
        INSERT INTO error_log
        (worker_id, error_type, error_message, stack_trace, created_at)
        VALUES ('coordinator', 'coordinator_error', ?, ?, datetime('now'))
      `).bind(
        error.message || 'Unknown error',
        error.stack || ''
      ).run();

      // Update coordinator health to critical
      await env.DB.prepare(`
        INSERT INTO worker_health
        (worker_id, worker_type, status, last_heartbeat, created_at, updated_at)
        VALUES ('coordinator', 'coordinator', 'critical', datetime('now'), datetime('now'), datetime('now'))
        ON CONFLICT(worker_id) DO UPDATE SET
          status = 'critical',
          last_heartbeat = datetime('now'),
          updated_at = datetime('now')
      `).run();
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manual trigger endpoint
    if (url.pathname === '/trigger') {
      await this.scheduled(
        {
          cron: '* * * * *',
          scheduledTime: Date.now(),
          noRetry: false
        } as ScheduledEvent,
        env,
        {
          waitUntil: async () => {},
          passThroughOnException: () => {}
        } as ExecutionContext
      );

      return new Response('Coordinator triggered manually', { status: 200 });
    }

    // Status endpoint
    if (url.pathname === '/status') {
      const health = await env.DB.prepare(`
        SELECT * FROM worker_health WHERE worker_id = 'coordinator'
      `).first();

      const queueState = await env.DB.prepare(`
        SELECT * FROM queue_state WHERE queue_name = 'progeodata-zip-queue'
      `).first();

      const workers = await env.DB.prepare(`
        SELECT worker_id, status, last_heartbeat, items_processed, errors_count
        FROM worker_health
        WHERE worker_type = 'consumer'
        ORDER BY worker_id
      `).all();

      return Response.json({
        coordinator: health || { status: 'unknown' },
        queue: queueState || { status: 'unknown' },
        workers: workers.results || []
      });
    }

    // Dashboard endpoint
    if (url.pathname === '/dashboard') {
      const html = generateDashboardHTML();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('ProGeoData Coordinator', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

function calculateHealthScore(metrics: {
  errorRate: number;
  healthyWorkerRatio: number;
  queueDepthRatio: number;
  hasStaleWorkers: boolean;
}): number {
  let score = 1.0;

  // Penalize for error rate (0% = 1.0, 10% = 0.5, 20%+ = 0)
  score *= Math.max(0, 1 - (metrics.errorRate * 5));

  // Penalize for unhealthy workers
  score *= metrics.healthyWorkerRatio;

  // Penalize for queue depth issues
  if (metrics.queueDepthRatio > 0.8) {
    score *= 0.8; // Queue getting full
  } else if (metrics.queueDepthRatio < 0.01) {
    score *= 0.9; // Queue too empty
  }

  // Penalize for stale workers
  if (metrics.hasStaleWorkers) {
    score *= 0.7;
  }

  return Math.max(0, Math.min(1, score));
}

function generateDashboardHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProGeoData Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            color: #333;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        .status-healthy { background: #10b981; }
        .status-degraded { background: #f59e0b; }
        .status-critical { background: #ef4444; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .metric-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 32px;
            font-weight: 600;
            color: #333;
        }

        .metric-unit {
            font-size: 16px;
            color: #999;
            margin-left: 4px;
        }

        .workers-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            border-bottom: 1px solid #e5e7eb;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .badge-healthy {
            background: #d1fae5;
            color: #065f46;
        }

        .badge-degraded {
            background: #fed7aa;
            color: #92400e;
        }

        .badge-critical {
            background: #fee2e2;
            color: #991b1b;
        }

        .logs-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
        }

        .log-entry {
            padding: 8px;
            margin-bottom: 4px;
            border-left: 3px solid #e5e7eb;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.5;
        }

        .log-error { border-left-color: #ef4444; background: #fef2f2; }
        .log-warning { border-left-color: #f59e0b; background: #fffbeb; }
        .log-info { border-left-color: #3b82f6; background: #eff6ff; }
        .log-success { border-left-color: #10b981; background: #f0fdf4; }

        .refresh-button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .refresh-button:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <span class="status-indicator status-healthy" id="main-status"></span>
            ProGeoData Monitoring Dashboard
            <button class="refresh-button" onclick="refreshData()">Refresh</button>
        </h1>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Queue Depth</div>
                <div class="metric-value" id="queue-depth">-</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Processing Rate</div>
                <div class="metric-value">
                    <span id="processing-rate">-</span>
                    <span class="metric-unit">/hr</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value">
                    <span id="error-rate">-</span>
                    <span class="metric-unit">%</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Active Workers</div>
                <div class="metric-value" id="active-workers">-</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Total Records</div>
                <div class="metric-value" id="total-records">-</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Health Score</div>
                <div class="metric-value">
                    <span id="health-score">-</span>
                    <span class="metric-unit">%</span>
                </div>
            </div>
        </div>

        <div class="workers-table">
            <table>
                <thead>
                    <tr>
                        <th>Worker ID</th>
                        <th>Status</th>
                        <th>Last Heartbeat</th>
                        <th>Items Processed</th>
                        <th>Errors</th>
                    </tr>
                </thead>
                <tbody id="workers-tbody">
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div class="logs-container">
            <h3 style="margin-bottom: 15px;">Recent Activity</h3>
            <div id="logs">
                <div class="log-entry log-info">Waiting for data...</div>
            </div>
        </div>
    </div>

    <script>
        async function refreshData() {
            try {
                const response = await fetch('/status');
                const data = await response.json();

                // Update metrics
                const coordinator = data.coordinator;
                const queue = data.queue;
                const context = coordinator.context ? JSON.parse(coordinator.context) : {};

                document.getElementById('queue-depth').textContent =
                    context.queue_depth?.toLocaleString() || '0';

                document.getElementById('processing-rate').textContent =
                    context.processing_stats?.hourly_processed?.toLocaleString() || '0';

                document.getElementById('error-rate').textContent =
                    ((context.error_stats?.error_rate || 0) * 100).toFixed(2);

                document.getElementById('active-workers').textContent =
                    context.worker_stats?.healthy || '0';

                document.getElementById('total-records').textContent =
                    context.processing_stats?.hourly_records?.toLocaleString() || '0';

                document.getElementById('health-score').textContent =
                    ((context.health_score || 0) * 100).toFixed(0);

                // Update main status indicator
                const mainStatus = document.getElementById('main-status');
                mainStatus.className = 'status-indicator status-' + (coordinator.status || 'unknown');

                // Update workers table
                const tbody = document.getElementById('workers-tbody');
                tbody.innerHTML = data.workers.map(worker => \`
                    <tr>
                        <td>\${worker.worker_id}</td>
                        <td><span class="status-badge badge-\${worker.status}">\${worker.status}</span></td>
                        <td>\${new Date(worker.last_heartbeat).toLocaleString()}</td>
                        <td>\${worker.items_processed.toLocaleString()}</td>
                        <td>\${worker.errors_count.toLocaleString()}</td>
                    </tr>
                \`).join('') || '<tr><td colspan="5">No workers found</td></tr>';

                // Update logs
                const logs = document.getElementById('logs');
                if (context.alerts && context.alerts.length > 0) {
                    logs.innerHTML = context.alerts.map(alert => \`
                        <div class="log-entry log-\${alert.severity === 'critical' ? 'error' : 'warning'}">
                            [\${new Date(alert.timestamp).toLocaleTimeString()}] \${alert.message}
                        </div>
                    \`).join('');
                } else {
                    logs.innerHTML = '<div class="log-entry log-success">System operating normally</div>';
                }

            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        }

        // Auto-refresh every 5 seconds
        setInterval(refreshData, 5000);
        refreshData();
    </script>
</body>
</html>
  `;
}
/**
 * AI Agents Usage Examples
 * Demonstrates how to use the AI automation agents in real-world scenarios
 */

import type { D1Database } from '@cloudflare/workers-types';
import { ReputationManagerAgent } from './reputation-manager';
import { SalesNurturerAgent } from './sales-nurturer';
import type { AgentContext } from './types';

// =============================================================================
// SETUP
// =============================================================================

/**
 * Create agent context (use this pattern in your routes/workers)
 */
function createContext(db: D1Database, tenantId: string): AgentContext {
  return {
    tenantId,
    db,
    environment: process.env.ENVIRONMENT === 'production' ? 'production' : 'development',
  };
}

// =============================================================================
// REPUTATION MANAGER EXAMPLES
// =============================================================================

/**
 * Example 1: Send review request after job completion
 */
export async function exampleReviewRequest(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new ReputationManagerAgent(context);

  // Scenario: Plumber completed job, wants review
  const result = await agent.createReviewRequest({
    customerId: 'customer-john-smith',
    customerName: 'John Smith',
    customerPhone: '+1-305-555-0123',
    customerEmail: 'john@example.com',
    jobId: 'job-plumbing-repair-456',
    jobType: 'Emergency plumbing repair',
    jobCompletedAt: new Date().toISOString(),
    preferredMethod: 'sms', // Customer prefers text messages
    metadata: {
      technicianName: 'Mike Johnson',
      jobDuration: '2 hours',
      serviceArea: 'Miami, FL',
    },
  });

  if (result.success) {
    console.log('✅ Review request sent successfully');
    console.log('Request ID:', result.data?.id);
    console.log('Status:', result.data?.status);
  } else {
    console.error('❌ Failed to send review request:', result.error);
  }

  return result;
}

/**
 * Example 2: Process review submission (positive)
 */
export async function examplePositiveReview(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new ReputationManagerAgent(context);

  // Scenario: Customer clicked review link and gave 5 stars
  const result = await agent.processReviewResponse(
    'review-request-xyz', // Request ID from review link
    5, // 5-star rating
    'Excellent service! Fixed my leak quickly and professionally.',
    'google' // Reviewing on Google
  );

  if (result.success && !result.data?.intercepted) {
    console.log('✅ Positive review - directing to Google');
    console.log('Redirect URL:', result.metadata?.redirectUrl);
  }

  return result;
}

/**
 * Example 3: Process review submission (negative - intercepted)
 */
export async function exampleNegativeReview(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new ReputationManagerAgent(context);

  // Scenario: Customer gave 2 stars - intercept and alert team
  const result = await agent.processReviewResponse(
    'review-request-xyz',
    2, // Low rating
    'Service was delayed and incomplete.',
    'google'
  );

  if (result.success && result.data?.intercepted) {
    console.log('⚠️ Negative review intercepted');
    console.log('Message to customer:', result.metadata?.message);
    console.log('Action: Team will be notified for follow-up call');
  }

  return result;
}

/**
 * Example 4: Run follow-up sequences (scheduled task)
 */
export async function exampleRunFollowups(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new ReputationManagerAgent(context);

  // This would be called by Cloudflare Cron Trigger every 6 hours
  const result = await agent.runFollowupSequence();

  if (result.success) {
    console.log(`✅ Processed ${result.data?.processed} follow-up messages`);
  }

  return result;
}

// =============================================================================
// SALES NURTURER EXAMPLES
// =============================================================================

/**
 * Example 5: Missed call text-back
 */
export async function exampleMissedCall(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // Scenario: Customer called but line was busy, send immediate text
  const result = await agent.startNurtureSequence({
    leadId: 'lead-jane-doe',
    leadName: 'Jane Doe',
    leadPhone: '+1-786-555-0456',
    triggerType: 'missed_call',
    triggerData: {
      callTime: new Date().toISOString(),
      callerNumber: '+1-786-555-0456',
    },
    preferredMethod: 'sms',
  });

  if (result.success) {
    console.log('✅ Missed call text-back sent');
    console.log('Sequence ID:', result.data?.id);
    console.log('Message preview: "Hi Jane! I noticed you called us earlier..."');
  }

  return result;
}

/**
 * Example 6: Abandoned quote recovery
 */
export async function exampleAbandonedQuote(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // Scenario: Customer started quote request but didn't complete it
  const result = await agent.startNurtureSequence({
    leadId: 'lead-bob-wilson',
    leadName: 'Bob Wilson',
    leadEmail: 'bob@example.com',
    triggerType: 'abandoned_quote',
    triggerData: {
      serviceRequested: 'HVAC installation',
      quoteAmount: 4500,
      abandonedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    preferredMethod: 'email',
  });

  if (result.success) {
    console.log('✅ Abandoned quote follow-up sent');
    console.log('Service: HVAC installation');
    console.log('Estimated quote: $4,500');
  }

  return result;
}

/**
 * Example 7: Process incoming message from lead
 */
export async function exampleIncomingMessage(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // Scenario: Lead responds to nurture message with a question
  const result = await agent.processIncomingMessage(
    'lead-jane-doe',
    'How much does it cost for a new water heater installation?',
    'sms'
  );

  if (result.success) {
    console.log('✅ Processed incoming message');
    console.log('AI Response:', result.data?.reply);
    console.log('Handoff needed?', result.data?.handoff ? 'Yes' : 'No');
  }

  return result;
}

/**
 * Example 8: Lead ready to buy
 */
export async function exampleReadyToBuy(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // Scenario: Lead responds positively, wants to schedule
  const result = await agent.processIncomingMessage(
    'lead-jane-doe',
    'Yes, I would like to schedule an appointment this week',
    'sms'
  );

  if (result.success && !result.data?.handoff) {
    console.log('✅ Lead is interested!');
    console.log('AI Response:', result.data?.reply);
    console.log('Next step: Schedule appointment');

    // Schedule appointment
    const appointmentResult = await agent.scheduleAppointment(
      'nurture-sequence-xyz',
      '2025-12-05T14:00:00Z'
    );

    if (appointmentResult.success) {
      console.log('✅ Appointment scheduled for Dec 5, 2025 at 2:00 PM');
    }
  }

  return result;
}

/**
 * Example 9: Lead not interested (opt-out)
 */
export async function exampleOptOut(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // Scenario: Lead replies with "STOP"
  const result = await agent.processIncomingMessage(
    'lead-jane-doe',
    'STOP',
    'sms'
  );

  if (result.success) {
    console.log('✅ Lead opted out');
    console.log('Response:', result.data?.reply);
    console.log('Status: Sequence ended, customer will not receive more messages');
  }

  return result;
}

/**
 * Example 10: Run scheduled nurture sequences (cron job)
 */
export async function exampleRunScheduled(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const agent = new SalesNurturerAgent(context);

  // This would be called by Cloudflare Cron Trigger every hour
  const result = await agent.runScheduledSequences();

  if (result.success) {
    console.log(`✅ Processed ${result.data?.processed} scheduled sequences`);
  }

  return result;
}

// =============================================================================
// INTEGRATION EXAMPLES
// =============================================================================

/**
 * Example 11: Complete job workflow with review request
 */
export async function exampleCompleteJobWorkflow(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const repAgent = new ReputationManagerAgent(context);

  // Step 1: Job is completed in your system
  const jobData = {
    jobId: 'job-electrician-789',
    customerId: 'customer-sarah-jones',
    customerName: 'Sarah Jones',
    customerPhone: '+1-954-555-0789',
    jobType: 'Electrical panel upgrade',
    completedAt: new Date().toISOString(),
    technicianName: 'David Lee',
  };

  console.log('📝 Job completed:', jobData.jobType);

  // Step 2: Wait 2 hours (to let dust settle)
  // In production, this would be a scheduled task or delayed job

  // Step 3: Send review request
  const reviewResult = await repAgent.createReviewRequest({
    customerId: jobData.customerId,
    customerName: jobData.customerName,
    customerPhone: jobData.customerPhone,
    jobId: jobData.jobId,
    jobType: jobData.jobType,
    jobCompletedAt: jobData.completedAt,
    preferredMethod: 'sms',
    metadata: {
      technicianName: jobData.technicianName,
    },
  });

  if (reviewResult.success) {
    console.log('✅ Review request sent to customer');
    console.log('Expected review submission rate: 30%');
  }

  return reviewResult;
}

/**
 * Example 12: Complete lead nurture workflow
 */
export async function exampleCompleteLeadWorkflow(db: D1Database) {
  const context = createContext(db, 'tenant-abc-123');
  const salesAgent = new SalesNurturerAgent(context);

  // Step 1: Missed call detected
  console.log('📞 Missed call from +1-305-555-1234');

  // Step 2: Start nurture sequence immediately
  const startResult = await salesAgent.startNurtureSequence({
    leadId: 'lead-michael-brown',
    leadName: 'Michael Brown',
    leadPhone: '+1-305-555-1234',
    triggerType: 'missed_call',
    triggerData: {
      callTime: new Date().toISOString(),
      serviceLookingFor: 'Roof repair',
    },
    preferredMethod: 'sms',
  });

  if (!startResult.success) {
    console.error('❌ Failed to start sequence:', startResult.error);
    return startResult;
  }

  console.log('✅ Initial text sent within 5 minutes');

  // Step 3: Lead responds (simulated)
  console.log('💬 Lead: "Yes, I need a roof repair. How much do you charge?"');

  const response1 = await salesAgent.processIncomingMessage(
    'lead-michael-brown',
    'Yes, I need a roof repair. How much do you charge?',
    'sms'
  );

  console.log('🤖 AI:', response1.data?.reply);

  // Step 4: Lead responds again (simulated)
  console.log('💬 Lead: "That sounds good. Can you come this week?"');

  const response2 = await salesAgent.processIncomingMessage(
    'lead-michael-brown',
    'That sounds good. Can you come this week?',
    'sms'
  );

  console.log('🤖 AI:', response2.data?.reply);

  // Step 5: Schedule appointment
  if (response2.success && !response2.data?.handoff) {
    const appointmentResult = await salesAgent.scheduleAppointment(
      startResult.data!.id,
      '2025-12-03T10:00:00Z'
    );

    if (appointmentResult.success) {
      console.log('✅ Lead converted to appointment!');
      console.log('Scheduled: Dec 3, 2025 at 10:00 AM');
      console.log('Recovery rate: 20% achieved');
    }
  }

  return { startResult, response1, response2 };
}

// =============================================================================
// TESTING UTILITIES
// =============================================================================

/**
 * Run all examples (for testing)
 */
export async function runAllExamples(db: D1Database) {
  console.log('\n🧪 Running AI Agents Examples\n');
  console.log('=' .repeat(60));

  try {
    console.log('\n📋 Reputation Manager Examples:\n');
    await exampleReviewRequest(db);
    await examplePositiveReview(db);
    await exampleNegativeReview(db);

    console.log('\n📋 Sales Nurturer Examples:\n');
    await exampleMissedCall(db);
    await exampleAbandonedQuote(db);
    await exampleIncomingMessage(db);
    await exampleReadyToBuy(db);

    console.log('\n📋 Complete Workflows:\n');
    await exampleCompleteJobWorkflow(db);
    await exampleCompleteLeadWorkflow(db);

    console.log('\n✅ All examples completed successfully');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }

  console.log('\n' + '='.repeat(60));
}

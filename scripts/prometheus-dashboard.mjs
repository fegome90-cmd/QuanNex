#!/usr/bin/env node

import fetch from 'node-fetch';

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:3000/metrics';

async function getMetricValue(metricName) {
  try {
    const response = await fetch(METRICS_URL);
    const text = await response.text();

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith(metricName) && !line.startsWith('#')) {
        const value = line.split(' ')[1];
        return parseFloat(value) || 0;
      }
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching metric ${metricName}:`, error.message);
    return 0;
  }
}

async function generateDashboard() {
  console.log('📊 QuanNex Mini Dashboard');
  console.log('========================\n');

  // AutoFix Metrics
  const autofixSuccess = await getMetricValue('qn_autofix_success_total');
  const autofixFailure = await getMetricValue('qn_autofix_failure_total');
  const autofixTotal = autofixSuccess + autofixFailure;
  const autofixRate = autofixTotal > 0 ? ((autofixSuccess / autofixTotal) * 100).toFixed(1) : 0;

  console.log('🔧 AutoFix Metrics:');
  console.log(`   Success Rate: ${autofixRate}% (${autofixSuccess}/${autofixTotal})`);
  console.log(`   Success Total: ${autofixSuccess}`);
  console.log(`   Failure Total: ${autofixFailure}\n`);

  // Playbook Metrics
  const playbookMatch = await getMetricValue('qn_playbook_match_total');
  const playbookMismatch = await getMetricValue('qn_playbook_mismatch_total');
  const playbookTotal = playbookMatch + playbookMismatch;
  const playbookRate = playbookTotal > 0 ? ((playbookMatch / playbookTotal) * 100).toFixed(1) : 0;

  console.log('📋 Playbook Metrics:');
  console.log(`   Match Rate: ${playbookRate}% (${playbookMatch}/${playbookTotal})`);
  console.log(`   Correct Matches: ${playbookMatch}`);
  console.log(`   Mismatches: ${playbookMismatch}\n`);

  // Verify Duration (p95)
  const verifyDuration = await getMetricValue('qn_verify_duration_seconds_bucket{le="5"}');
  console.log('⚡ Performance Metrics:');
  console.log(`   Verify Duration (p95): ${verifyDuration}s`);

  // SLO Status
  console.log('\n🎯 SLO Status:');
  console.log(
    `   AutoFix Success Rate: ${autofixRate >= 70 ? '✅' : '❌'} (${autofixRate}% / 70%)`
  );
  console.log(
    `   Playbook Match Rate: ${playbookRate >= 90 ? '✅' : '❌'} (${playbookRate}% / 90%)`
  );
  console.log(
    `   Verify Performance: ${verifyDuration <= 30 ? '✅' : '❌'} (${verifyDuration}s / 30s)`
  );

  console.log('\n📈 Dashboard URL: http://localhost:3000/metrics');
}

generateDashboard().catch(console.error);

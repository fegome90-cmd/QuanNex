#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import testPolicyVersioning from '../taskdb-core/tests/policy-versioning-acceptance.test.mjs';

if (import.meta.url === `file://${process.argv[1]}`) {
  testPolicyVersioning()
    .then(() => {
      console.log('\n✅ Policy versioning acceptance suite passed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Policy versioning acceptance suite failed:', error.message);
      process.exit(1);
    });
}

export default testPolicyVersioning;

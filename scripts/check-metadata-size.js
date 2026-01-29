#!/usr/bin/env node
/*
  Check .metadata.json size against thresholds and exit non-zero when critical.
  Thresholds:
    - Recommended: 3 MB (INFO)
    - Warning:     5 MB (WARN)
    - Critical:   10 MB (FAIL)
*/
const fs = require('fs');
const path = require('path');

const os = require('os');
const metadataPath = path.resolve(os.homedir(), '.cache', 'awesome-copilot-mcp', 'metadata.json');
const recommendedThresholdMB = Number(process.env.METADATA_RECOMMENDED_MB || 3);
const warningThresholdMB = Number(process.env.METADATA_WARNING_MB || 5);
const criticalThresholdMB = Number(process.env.METADATA_CRITICAL_MB || 10);

function toMB(bytes) { return bytes / 1024 / 1024; }

(async function main() {
  try {
    if (!fs.existsSync(metadataPath)) {
      console.log('ℹ️  .metadata.json not found. Skipping size check.');
      process.exit(0);
    }

    const stats = fs.statSync(metadataPath);
    const sizeMB = toMB(stats.size);

    console.log(`📦 .metadata.json size: ${sizeMB.toFixed(2)} MB`);
    console.log(`   thresholds: recommended=${recommendedThresholdMB}MB, warning=${warningThresholdMB}MB, critical=${criticalThresholdMB}MB`);

    if (sizeMB >= criticalThresholdMB) {
      console.error(`❌ CRITICAL: .metadata.json is ${sizeMB.toFixed(2)} MB (>= ${criticalThresholdMB} MB). Failing build.`);
      process.exit(1);
    } else if (sizeMB >= warningThresholdMB) {
      console.warn(`⚠️  WARNING: .metadata.json is ${sizeMB.toFixed(2)} MB (>= ${warningThresholdMB} MB). Consider optimization.`);
    } else if (sizeMB >= recommendedThresholdMB) {
      console.info(`ℹ️  INFO: .metadata.json is ${sizeMB.toFixed(2)} MB (>= ${recommendedThresholdMB} MB). Monitor growth.`);
    } else {
      console.log('✅ Size within recommended limits.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking metadata size:', err);
    process.exit(2);
  }
})();

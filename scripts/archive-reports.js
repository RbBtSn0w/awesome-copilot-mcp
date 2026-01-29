#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const reportsDir = path.join(repoRoot, 'docs', 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const filesToArchive = [
  'DELIVERY_REPORT.md',
  'FINAL_SUMMARY.txt',
  'PROJECT_COMPLETE.md',
  'TEST_COVERAGE_REPORT.md',
  'REFACTORING_COMPLETE.md',
  'METADATA_GENERATION.md',
  'METADATA_OPTIMIZATION.md',
  'PROMPT_ALIGNMENT_ANALYSIS.md',
  'PROMPT_ALIGNMENT_QUICK_FIX.md',
  'TOOL_ALIGNMENT_ANALYSIS.md',
  'TOOL_ALIGNMENT_QUICK_FIX.md',
  'ALIGNMENT_COMPLETE.sh'
];

filesToArchive.forEach((file) => {
  const src = path.join(repoRoot, file);
  const dest = path.join(reportsDir, file);
  if (fs.existsSync(src)) {
    // Copy original content to docs/reports unless destination already exists
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`Archived ${file} -> docs/reports/${file}`);
    } else {
      console.log(`docs/reports/${file} already exists, skipping copy`);
    }

    // Overwrite root file with pointer message
    const pointer = '# 📦 Archived: ' + file + '\n\nThis file has been archived to docs/reports/' + file + '.\n\n';
    fs.writeFileSync(src, pointer, 'utf8');
    console.log(`Replaced root ${file} with pointer to docs/reports/${file}`);
  } else {
    console.log(`Source file not found: ${file}`);
  }
});

console.log('Archive operation complete.');

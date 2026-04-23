#!/usr/bin/env node

const fs = require('fs');

const RISK_LABELS = {
  low: 'deps:risk:low',
  toolchain: 'deps:risk:toolchain',
  runtime: 'deps:risk:runtime',
  actions: 'deps:risk:actions',
};

const MERGE_LABELS = {
  auto: 'deps:merge:auto',
  manual: 'deps:merge:manual',
};

const TOOLCHAIN_DEPENDENCY_PATTERNS = [
  /^typescript$/,
  /^@types\/node$/,
  /^eslint$/,
  /^@typescript-eslint\//,
  /^vitest$/,
  /^@vitest\//,
  /^semantic-release$/,
  /^@semantic-release\//,
  /^conventional-changelog-conventionalcommits$/,
  /^@commitlint\//,
];

function normalizeList(value) {
  if (!value) return [];
  if (typeof value === 'object' && !Array.isArray(value)) {
    if ('name' in value) {
      return normalizeList(value.name);
    }
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeList(item))
      .filter(Boolean);
  }

  const stringValue = String(value).trim();
  if (!stringValue) return [];

  if (stringValue.startsWith('[') && stringValue.endsWith(']')) {
    try {
      return normalizeList(JSON.parse(stringValue));
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  return stringValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isToolchainDependency(name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  return TOOLCHAIN_DEPENDENCY_PATTERNS.some((pattern) => pattern.test(normalizedName));
}

function classifyDependabotPr(input = {}) {
  const title = String(input.title || '').trim().toLowerCase();
  const updateType = String(input.updateType || '').trim().toLowerCase();
  const dependencyType = String(input.dependencyType || '').trim().toLowerCase();
  const dependencyNames = normalizeList(input.dependencyNames).map((item) => item.toLowerCase());
  const labels = normalizeList(input.labels).map((item) => item.toLowerCase());

  const isActionsUpdate = labels.includes('github-actions') || title.startsWith('ci(deps)');
  const isRuntimeUpdate =
    dependencyNames.includes('@modelcontextprotocol/sdk') ||
    dependencyType.includes('production') ||
    title.startsWith('chore(deps):');
  const isToolchainUpdate = dependencyNames.some(isToolchainDependency);
  const isMajorUpdate = updateType === 'version-update:semver-major';

  let risk = 'low';
  let autoMerge = true;
  let reason = 'Low-risk development dependency update can flow through automated merge after CI succeeds.';

  if (isActionsUpdate) {
    risk = 'actions';
    autoMerge = false;
    reason = 'GitHub Actions updates stay in the manual review queue.';
  } else if (isRuntimeUpdate) {
    risk = 'runtime';
    autoMerge = false;
    reason = 'Runtime dependency updates require manual review before merge.';
  } else if (isToolchainUpdate) {
    risk = 'toolchain';
    autoMerge = false;
    reason = 'High-impact developer tooling updates require manual review before merge.';
  }

  if (isMajorUpdate) {
    autoMerge = false;
    reason = `${reason} Major version updates are never auto-merged.`;
  }

  return {
    autoMerge,
    dependencies: dependencyNames,
    mergeLabel: autoMerge ? MERGE_LABELS.auto : MERGE_LABELS.manual,
    mergePolicy: autoMerge ? 'auto' : 'manual',
    reason,
    risk,
    riskLabel: RISK_LABELS[risk],
    updateType,
  };
}

function groupForLabels(labels) {
  const normalizedLabels = normalizeList(labels).map((item) => item.toLowerCase());

  if (normalizedLabels.includes(RISK_LABELS.runtime)) return 'runtime';
  if (normalizedLabels.includes(RISK_LABELS.toolchain)) return 'toolchain';
  if (normalizedLabels.includes(RISK_LABELS.actions)) return 'actions';
  if (normalizedLabels.includes(RISK_LABELS.low)) return 'low';
  return 'unclassified';
}

function renderDependencyInbox(prs = []) {
  const groups = {
    runtime: [],
    toolchain: [],
    actions: [],
    low: [],
    unclassified: [],
  };

  for (const pr of prs) {
    groups[groupForLabels(pr.labels || [])].push(pr);
  }

  const orderedGroups = [
    ['runtime', 'Runtime Review Queue'],
    ['toolchain', 'Toolchain Review Queue'],
    ['actions', 'GitHub Actions Review Queue'],
    ['low', 'Low-Risk Auto-Merge Queue'],
    ['unclassified', 'Needs Classification'],
  ];

  const lines = [
    '# Dependency Inbox',
    '',
    `Generated at: \`${new Date().toISOString()}\``,
    '',
    `Open Dependabot PRs: **${prs.length}**`,
  ];

  if (!prs.length) {
    lines.push('', 'No open Dependabot PRs.');
    return `${lines.join('\n')}\n`;
  }

  for (const [groupKey, heading] of orderedGroups) {
    const items = groups[groupKey];
    if (!items.length) continue;

    lines.push('', `## ${heading} (${items.length})`, '');
    for (const pr of items) {
      const updatedAt = pr.updatedAt ? String(pr.updatedAt).slice(0, 10) : 'unknown';
      lines.push(`- [#${pr.number}](${pr.url}) ${pr.title} (updated ${updatedAt})`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function printUsage() {
  console.error(
    'Usage:\n' +
      '  node scripts/dependency-automation.js classify --title <title> --update-type <type> --dependency-type <type> --dependency-names <names> --labels <labels>\n' +
      '  node scripts/dependency-automation.js render-inbox --input <path|- >'
  );
}

function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const nextValue = args[i + 1];
    options[key] = nextValue && !nextValue.startsWith('--') ? nextValue : '';
    if (options[key] !== '') i += 1;
  }

  return options;
}

function readJsonInput(inputPath) {
  if (!inputPath || inputPath === '-') {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  }

  return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (command === 'classify') {
    const result = classifyDependabotPr({
      title: options.title,
      updateType: options['update-type'],
      dependencyType: options['dependency-type'],
      dependencyNames: options['dependency-names'],
      labels: options.labels,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  if (command === 'render-inbox') {
    const input = readJsonInput(options.input);
    process.stdout.write(renderDependencyInbox(input));
    return 0;
  }

  printUsage();
  return 1;
}

module.exports = {
  classifyDependabotPr,
  renderDependencyInbox,
};

if (require.main === module) {
  process.exit(main());
}

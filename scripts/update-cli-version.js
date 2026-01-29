const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const CLI_TS = path.join(__dirname, '..', 'src', 'cli.ts');

try {
    // 1. Read new version from package.json
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    const newVersion = pkg.version;
    console.log(`Syncing src/cli.ts to version: ${newVersion}`);

    // 2. Read src/cli.ts
    let cliContent = fs.readFileSync(CLI_TS, 'utf8');

    // 3. Regex replace .version('...')
    // Matches .version('1.0.0'), .version('1.0.0-beta.1'), etc.
    const regex = /\.version\(['"][^'"]+['"]\)/;

    if (!regex.test(cliContent)) {
        console.error('Error: Could not find .version() call in src/cli.ts');
        process.exit(1);
    }

    const updatedContent = cliContent.replace(regex, `.version('${newVersion}')`);

    // 4. Write back
    fs.writeFileSync(CLI_TS, updatedContent, 'utf8');

    // 5. Git add (so it's part of the version commit)
    execSync(`git add "${CLI_TS}"`);

    // 6. Also stage .upstream-sync if it was updated
    const UPSTREAM_SYNC = path.join(__dirname, '..', '.upstream-sync');
    if (fs.existsSync(UPSTREAM_SYNC)) {
        execSync(`git add "${UPSTREAM_SYNC}"`);
    }

    console.log(`Updated and staged version changes`);

} catch (error) {
    console.error('Error updating CLI version:', error.message);
    process.exit(1);
}

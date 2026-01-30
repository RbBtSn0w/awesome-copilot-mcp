#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Sync version from package.json to .mcp/server.json and package-lock.json
 */
function syncMcpVersion() {
    const packagePath = path.join(__dirname, '../package.json');
    const mcpPath = path.join(__dirname, '../.mcp/server.json');
    const lockPath = path.join(__dirname, '../package-lock.json');

    try {
        // Read package.json
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const version = packageJson.version;

        // Update .mcp/server.json
        const mcpJson = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
        mcpJson.version = version;
        if (mcpJson.packages && mcpJson.packages[0]) {
            mcpJson.packages[0].version = version;
        }
        fs.writeFileSync(mcpPath, JSON.stringify(mcpJson, null, 2) + '\n');
        console.log(`✅ Synced version ${version} to .mcp/server.json`);

        // Update package-lock.json
        const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        lockJson.version = version;
        if (lockJson.packages && lockJson.packages[""]) {
            lockJson.packages[""].version = version;
        }
        fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n');
        console.log(`✅ Synced version ${version} to package-lock.json`);

    } catch (error) {
        console.error('❌ Failed to sync version:', error.message);
        process.exit(1);
    }
}

syncMcpVersion();

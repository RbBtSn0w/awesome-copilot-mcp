#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Sync version from package.json to .mcp/server.json
 */
function syncMcpVersion() {
    const packagePath = path.join(__dirname, '../package.json');
    const mcpPath = path.join(__dirname, '../.mcp/server.json');

    try {
        // Read package.json
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const version = packageJson.version;

        // Read .mcp/server.json
        const mcpJson = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));

        // Update version in two places
        mcpJson.version = version;
        if (mcpJson.packages && mcpJson.packages[0]) {
            mcpJson.packages[0].version = version;
        }

        // Write back to .mcp/server.json
        fs.writeFileSync(mcpPath, JSON.stringify(mcpJson, null, 2) + '\n');

        console.log(`✅ Synced version ${version} to .mcp/server.json`);
    } catch (error) {
        console.error('❌ Failed to sync MCP version:', error.message);
        process.exit(1);
    }
}

syncMcpVersion();

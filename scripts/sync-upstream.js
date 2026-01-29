const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, '..', '.upstream-sync');
const UPSTREAM_REPO = 'github/awesome-copilot';
const BRANCH = 'main';

function fetchLatestCommit() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${UPSTREAM_REPO}/commits/${BRANCH}`,
            headers: {
                'User-Agent': 'awesome-copilot-mcp-sync-bot',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.sha);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`GitHub API returned ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log(`Checking upstream ${UPSTREAM_REPO}...`);
        const latestSha = await fetchLatestCommit();
        console.log(`Latest upstream SHA: ${latestSha}`);

        let currentSha = '';
        if (fs.existsSync(STATE_FILE)) {
            currentSha = fs.readFileSync(STATE_FILE, 'utf8').trim();
        }
        console.log(`Current local SHA: ${currentSha}`);

        if (latestSha !== currentSha) {
            console.log('>>> Upstream updated. Triggering release flow.');

            // Update state file
            fs.writeFileSync(STATE_FILE, latestSha);

            // Set output for GitHub Actions
            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `updated=true\n`);
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `sha=${latestSha}\n`);
            }
        } else {
            console.log('>>> No changes detected.');
            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `updated=false\n`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();

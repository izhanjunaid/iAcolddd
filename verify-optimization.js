const https = require('http');

const API_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function verifyOptimization() {
    console.log('🚀 Verifying Financial Optimization\n');

    try {
        // Step 1: Login
        console.log('Step 1: Authenticating...');
        const loginResponse = await makeRequest('POST', '/auth/login', {
            username: 'admin',
            password: 'Admin@123',
        });

        if (loginResponse.status !== 200 && loginResponse.status !== 201) {
            console.error('❌ Login failed:', loginResponse);
            return;
        }

        const token = loginResponse.data.accessToken;
        console.log('✅ Authentication successful\n');

        // Step 2: Measure Trial Balance time BEFORE snapshots (simulated by requesting a date far in past if no snapshots exist, but here we just run it)
        // Note: Since we just added the logic, if no snapshots exist, it falls back to full calculation (which is what we want to test against, but we can't easily "undo" snapshots once created without DB access).
        // For now, we'll just generate snapshots and verify it works and is fast.

        console.log('Step 2: Generating Monthly Balance Snapshots...');
        const startTime = Date.now();
        const snapshotResponse = await makeRequest(
            'POST',
            '/general-ledger/generate-snapshots',
            {},
            token
        );

        if (snapshotResponse.status === 201) {
            console.log(`✅ Snapshots generated in ${Date.now() - startTime}ms`);
        } else {
            console.error('❌ Snapshot generation failed:', snapshotResponse.status, snapshotResponse.data);
            return;
        }
        console.log('');

        // Step 3: Measure Trial Balance time AFTER snapshots
        console.log('Step 3: Requesting Trial Balance (Optimized)...');
        const tbStartTime = Date.now();
        const tbResponse = await makeRequest(
            'GET',
            '/general-ledger/trial-balance?asOfDate=' + new Date().toISOString().split('T')[0],
            null,
            token
        );
        const tbDuration = Date.now() - tbStartTime;

        if (tbResponse.status === 200) {
            console.log(`✅ Trial Balance generated in ${tbDuration}ms`);
            console.log(`   Total Debits: ${tbResponse.data.totalDebits}`);
            console.log(`   Total Credits: ${tbResponse.data.totalCredits}`);
            console.log(`   Difference: ${tbResponse.data.difference}`);
        } else {
            console.error('❌ Trial Balance failed:', tbResponse.status);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

verifyOptimization();

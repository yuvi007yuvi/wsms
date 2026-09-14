const http = require('http');
const https = require('https');

// Target URL: Default to localhost if running, else production
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const BASE_URL = isProd ? 'https://wsms-1.onrender.com/api' : 'http://localhost:5000/api';
const API_KEY = 'ga_live_wsms_sec_99a8b7c6d5e4';

console.log(`\n======================================================`);
console.log(`  GREEN ASSIST API TEST RUNNER`);
console.log(`  Target: ${BASE_URL}`);
console.log(`  API Key: ${API_KEY}`);
console.log(`======================================================\n`);

function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• Testing: ${name}... `);
    try {
      await fn();
      console.log(`\x1b[32m✔ PASSED\x1b[0m`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31m✖ FAILED\x1b[0m`);
      console.error(`  Error:`, err.message || err);
      failed++;
    }
  }

  // 1. Health Check
  await test('Public Health Check (GET /api/health)', async () => {
    const res = await request(`${BASE_URL}/health`);
    if (res.status !== 200 || res.data.status !== 'ok') {
      throw new Error(`Expected 200 with status=ok, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Missing Auth Check
  await test('Security: Missing API Key returns 401 Unauthorized', async () => {
    const res = await request(`${BASE_URL}/weighment`);
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  });

  // 3. Invalid API Key Check
  await test('Security: Invalid API Key returns 403 Forbidden', async () => {
    const res = await request(`${BASE_URL}/weighment`, {
      headers: { 'x-api-key': 'invalid_secret_key_123' }
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  });

  // 4. Live Weighment Slips Feed with valid API Key
  await test('Live Data: GET /api/weighment (Valid x-api-key)', async () => {
    const res = await request(`${BASE_URL}/weighment?limit=5`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
    const slips = res.data.data || [];
    console.log(`\n    [Info] Retrieved ${slips.length} slip(s). Total in system: ${res.data.total}`);
    if (slips.length > 0) {
      const sample = slips[0];
      console.log(`    [Sample] Slip #${sample.slipNumber} | Vehicle: ${sample.vehicle?.vehicleNumber} | Net: ${sample.netWeight} KG | Material: ${sample.material?.name}`);
    }
  });

  // 5. Weighment Summary
  await test('Analytics: GET /api/weighment/summary?reportType=vehicleType', async () => {
    const res = await request(`${BASE_URL}/weighment/summary?reportType=vehicleType`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const categories = res.data.data || [];
    console.log(`\n    [Info] Found ${categories.length} category breakdowns`);
    if (categories.length > 0) {
      console.log(`    [Sample] ${categories[0].key}: ${categories[0].count} trips, Net: ${categories[0].netWeight} KG`);
    }
  });

  // 6. Real-time Dashboard Stats
  await test('KPIs: GET /api/dashboard/stats', async () => {
    const res = await request(`${BASE_URL}/dashboard/stats`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    console.log(`\n    [Info] Dashboard KPIs responded successfully with summary and trend metrics`);
  });

  // 7. Master Data Catalog
  await test('Master Data: GET /api/master/materials', async () => {
    const res = await request(`${BASE_URL}/master/materials`, {
      headers: { 'x-api-key': API_KEY }
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const materials = res.data.data || [];
    console.log(`\n    [Info] Master materials count: ${materials.length}`);
  });

  console.log(`\n======================================================`);
  console.log(`  RESULTS: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log(`======================================================\n`);
}

runTests().catch(err => {
  console.error("Test runner encountered fatal error:", err);
});

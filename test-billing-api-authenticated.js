/**
 * Authenticated Test script for Storage Billing API
 * 1. Logs in to get JWT token
 * 2. Tests the /billing/calculate-storage endpoint with auth
 */

const BASE_URL = 'http://localhost:3000';

// Login credentials (from seed file)
const credentials = {
  username: 'admin',
  password: 'Admin@123',
};

// Test data for billing calculation
const billingTestData = {
  weight: 5000,
  dateIn: '2025-10-01T00:00:00Z',
  dateOut: '2025-10-15T00:00:00Z',
  ratePerKgPerDay: 2,
  labourChargesIn: 5000,
  labourChargesOut: 5000,
  loadingCharges: 3000,
  otherCharges: 0,
  applyGst: true,
  applyWht: true,
};

// Expected results based on documentation
const expectedResults = {
  weight: 5000,
  daysStored: 15,
  ratePerKgPerDay: 2,
  storageCharges: 150000,
  labourCharges: 10000,
  loadingCharges: 3000,
  otherCharges: 0,
  subtotal: 163000,
  gstAmount: 29340,
  gstRate: 18,
  whtAmount: 1630,
  whtRate: 1,
  totalAmount: 190710,
};

async function login() {
  console.log('🔐 Logging in as admin...');

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Login successful!');
    console.log(`   User: ${data.user?.username || 'unknown'}`);
    console.log(`   Token: ${data.accessToken?.substring(0, 20)}...`);

    return data.accessToken;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw error;
  }
}

async function testBillingCalculation(token) {
  console.log('\n🧪 Testing Storage Billing API\n');
  console.log('📋 Test Data:', JSON.stringify(billingTestData, null, 2));
  console.log('\n📊 Expected Results:', JSON.stringify(expectedResults, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/billing/calculate-storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(billingTestData),
    });

    console.log('\n📡 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Request failed:', error);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Response Body:', JSON.stringify(result, null, 2));

    // Validate results
    console.log('\n🔍 Validation:');
    let allPassed = true;

    const fieldsToCheck = [
      'weight', 'daysStored', 'ratePerKgPerDay', 'storageCharges',
      'labourCharges', 'loadingCharges', 'subtotal', 'gstAmount',
      'whtAmount', 'totalAmount'
    ];

    fieldsToCheck.forEach(field => {
      const actual = result[field];
      const expected = expectedResults[field];
      if (actual === expected) {
        console.log(`  ✓ ${field}: ${actual} (correct)`);
      } else {
        console.log(`  ✗ ${field}: ${actual} (expected ${expected})`);
        allPassed = false;
      }
    });

    // Check breakdown
    if (result.breakdown) {
      console.log('\n📝 Calculation Breakdown:');
      console.log(`   Storage: ${result.breakdown.storageCalculation}`);
      console.log(`   Labour:  ${result.breakdown.labourCalculation}`);
      console.log(`   Tax:     ${result.breakdown.taxCalculation}`);
    }

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Storage Billing Module is working correctly!');
    } else {
      console.log('\n⚠️  Some validation failures detected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('=' .repeat(60));
  console.log('🧪 STORAGE BILLING API - AUTHENTICATED TEST');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Login
    const token = await login();

    // Step 2: Test billing calculation
    await testBillingCalculation(token);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test suite completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();

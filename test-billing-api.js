/**
 * Test script for Storage Billing API
 * Tests the /billing/calculate-storage endpoint
 */

const testData = {
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

// Expected results based on documentation:
// Storage Charges = 5000 kg × PKR 2/kg/day × 15 days = PKR 150,000
// Labour = 5000 + 5000 + 3000 = PKR 13,000
// Subtotal = 150,000 + 13,000 = PKR 163,000
// GST (18%) = PKR 29,340
// WHT (1%) = PKR 1,630
// Total = 163,000 + 29,340 - 1,630 = PKR 190,710

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

async function testBillingAPI() {
  console.log('🧪 Testing Storage Billing API\n');
  console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
  console.log('\n📊 Expected Results:', JSON.stringify(expectedResults, null, 2));

  try {
    const response = await fetch('http://localhost:3000/billing/calculate-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n📡 Response Status:', response.status, response.statusText);

    if (response.status === 401 || response.status === 403) {
      console.log('⚠️  Authentication required (expected for protected endpoint)');
      console.log('ℹ️  Endpoint is accessible but requires JWT token');
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
      if (result[field] === expectedResults[field]) {
        console.log(`  ✓ ${field}: ${result[field]} (correct)`);
      } else {
        console.log(`  ✗ ${field}: ${result[field]} (expected ${expectedResults[field]})`);
        allPassed = false;
      }
    });

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log('\n❌ Some tests failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBillingAPI();

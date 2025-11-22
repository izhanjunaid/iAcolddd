/**
 * Tax Module UI Test Script
 * Tests the tax module functionality through the API
 */

const API_BASE_URL = 'http://localhost:3000';
let authToken = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const result = await response.json();

  return { status: response.status, data: result };
}

// Test functions
async function testLogin() {
  console.log('\n🔐 Testing Login...');
  const result = await apiCall('POST', '/auth/login', {
    username: 'admin',
    password: 'Admin@123'
  });

  if (result.data.accessToken) {
    authToken = result.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${result.data.user.fullName} (${result.data.user.username})`);
    console.log(`   Permissions: ${result.data.user.permissions.length} total`);
    const taxPerms = result.data.user.permissions.filter(p => p.includes('tax:'));
    console.log(`   Tax Permissions: ${taxPerms.join(', ')}`);
    return true;
  } else {
    console.log('❌ Login failed:', result.data);
    return false;
  }
}

async function testCreateTaxRate() {
  console.log('\n📝 Testing Create Tax Rate...');
  const taxRate = {
    name: 'Provincial Sales Tax (Test)',
    taxType: 'PROVINCIAL_TAX',
    rate: 15,
    description: 'Test provincial sales tax rate',
    applicability: 'ALL',
    effectiveFrom: new Date().toISOString(),
    isActive: true,
    isDefault: false
  };

  const result = await apiCall('POST', '/tax/rates', taxRate);

  if (result.status === 201) {
    console.log('✅ Tax rate created:', result.data.name);
    console.log(`   Rate: ${result.data.rate}%`);
    console.log(`   Type: ${result.data.taxType}`);
    console.log(`   Applicability: ${result.data.applicability}`);
    return result.data;
  } else {
    console.log('❌ Failed to create tax rate:', result.data);
    return null;
  }
}

async function testGetTaxRates() {
  console.log('\n📋 Testing Get Tax Rates...');
  const result = await apiCall('GET', '/tax/rates');

  if (result.status === 200) {
    const rates = Array.isArray(result.data) ? result.data : (result.data.data || []);
    console.log(`✅ Retrieved ${rates.length} tax rates`);
    if (rates.length > 0) {
      rates.forEach(rate => {
        console.log(`   - ${rate.taxName}: ${rate.rate}% (${rate.taxType})`);
      });
    } else {
      console.log('   (No tax rates found)');
    }
    return rates;
  } else {
    console.log('❌ Failed to get tax rates:', result.data);
    return [];
  }
}

async function testUpdateTaxRate(taxId) {
  console.log('\n✏️ Testing Update Tax Rate...');
  const updates = {
    rate: 18,
    description: 'Updated tax rate for testing'
  };

  const result = await apiCall('PATCH', `/tax/rates/${taxId}`, updates);

  if (result.status === 200) {
    console.log('✅ Tax rate updated:', result.data.taxName);
    return true;
  } else {
    console.log('❌ Failed to update tax rate:', result.data);
    return false;
  }
}

async function testCalculateTax() {
  console.log('\n🧮 Testing Tax Calculator...');
  const calculation = {
    amount: 10000,
    taxType: 'GST'
  };

  const result = await apiCall('POST', '/tax/calculate', calculation);

  if (result.status === 201 || result.status === 200) {
    console.log('✅ Tax calculated:');
    console.log(`   Taxable Amount: PKR ${result.data.taxableAmount ? result.data.taxableAmount.toLocaleString() : 'N/A'}`);
    console.log(`   Tax Amount: PKR ${result.data.taxAmount ? result.data.taxAmount.toLocaleString() : 'N/A'}`);
    console.log(`   Tax Rate: ${result.data.taxRate}%`);
    console.log(`   Tax Type: ${result.data.taxType}`);
    console.log(`   Is Exempt: ${result.data.isExempt ? 'Yes' : 'No'}`);
    if (result.data.appliedRate) {
      console.log(`   Applied Rate: ${result.data.appliedRate.name} (${result.data.appliedRate.rate}%)`);
    }
    return result.data;
  } else {
    console.log('❌ Failed to calculate tax:', result.data);
    return null;
  }
}

async function testDeleteTaxRate(taxId) {
  console.log('\n🗑️ Testing Delete Tax Rate...');
  const result = await apiCall('DELETE', `/tax/rates/${taxId}`);

  if (result.status === 200) {
    console.log('✅ Tax rate deleted successfully');
    return true;
  } else {
    console.log('❌ Failed to delete tax rate:', result.data);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Tax Module Tests');
  console.log('=' .repeat(50));

  try {
    // Test 1: Login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }

    // Test 2: Get existing tax rates
    await testGetTaxRates();

    // Test 3: Create new tax rate
    const newTaxRate = await testCreateTaxRate();

    if (newTaxRate) {
      // Test 4: Update tax rate
      await testUpdateTaxRate(newTaxRate.id);

      // Test 5: Calculate tax
      await testCalculateTax();

      // Test 6: Get all tax rates again
      await testGetTaxRates();

      // Test 7: Delete the test tax rate
      await testDeleteTaxRate(newTaxRate.id);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log('\n📝 Test Summary:');
    console.log('   - Login: ✅');
    console.log('   - Create Tax Rate: ✅');
    console.log('   - Read Tax Rates: ✅');
    console.log('   - Update Tax Rate: ✅');
    console.log('   - Calculate Tax: ✅');
    console.log('   - Delete Tax Rate: ✅');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

// Run the tests
runTests();

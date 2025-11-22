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

async function testFinancialStatements() {
  console.log('🚀 Testing Financial Statements API\n');

  try {
    // Step 1: Login to get JWT token
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

    // Define test period (last 30 days)
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    // Step 2: Test Balance Sheet
    console.log('Step 2: Testing Balance Sheet...');
    const balanceSheetResponse = await makeRequest(
      'POST',
      '/financial-statements/balance-sheet/generate',
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        includeMetrics: true,
        detailed: false,
        includeZeroBalances: false,
      },
      token
    );

    if (balanceSheetResponse.status === 200 || balanceSheetResponse.status === 201) {
      console.log('✅ Balance Sheet generated successfully');
      console.log('   Total Assets:', balanceSheetResponse.data.assets.totalAssets);
      console.log('   Total Liabilities:', balanceSheetResponse.data.liabilities.totalLiabilities);
      console.log('   Total Equity:', balanceSheetResponse.data.equity.totalEquity);
      console.log('   Is Balanced:', balanceSheetResponse.data.isBalanced);
    } else {
      console.error('❌ Balance Sheet failed:', balanceSheetResponse.status);
      console.error('   Error:', balanceSheetResponse.data);
    }
    console.log('');

    // Step 3: Test Income Statement
    console.log('Step 3: Testing Income Statement...');
    const incomeStatementResponse = await makeRequest(
      'POST',
      '/financial-statements/income-statement/generate',
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        multiStep: true,
        includeEbitda: true,
        includeMargins: true,
        taxRate: 29,
      },
      token
    );

    if (incomeStatementResponse.status === 200 || incomeStatementResponse.status === 201) {
      console.log('✅ Income Statement generated successfully');
      console.log('   Total Revenue:', incomeStatementResponse.data.revenue.totalRevenue);
      console.log('   Gross Profit:', incomeStatementResponse.data.grossProfit.amount);
      console.log('   Operating Income:', incomeStatementResponse.data.operatingIncome.amount);
      console.log('   Net Income:', incomeStatementResponse.data.netIncome.amount);
      console.log('   Net Profit Margin:', incomeStatementResponse.data.netIncome.margin.toFixed(2) + '%');
    } else {
      console.error('❌ Income Statement failed:', incomeStatementResponse.status);
      console.error('   Error:', incomeStatementResponse.data);
    }
    console.log('');

    // Step 4: Test Cash Flow Statement
    console.log('Step 4: Testing Cash Flow Statement...');
    const cashFlowResponse = await makeRequest(
      'POST',
      '/financial-statements/cash-flow/generate',
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        indirectMethod: true,
        includeMetrics: true,
      },
      token
    );

    if (cashFlowResponse.status === 200 || cashFlowResponse.status === 201) {
      console.log('✅ Cash Flow Statement generated successfully');
      console.log('   Net Income:', cashFlowResponse.data.operatingActivities.netIncome);
      console.log('   Operating Cash Flow:', cashFlowResponse.data.operatingActivities.netCashFromOperating);
      console.log('   Investing Cash Flow:', cashFlowResponse.data.investingActivities.netCashFromInvesting);
      console.log('   Financing Cash Flow:', cashFlowResponse.data.financingActivities.netCashFromFinancing);
      console.log('   Net Change in Cash:', cashFlowResponse.data.cashSummary.netCashChange);
    } else {
      console.error('❌ Cash Flow Statement failed:', cashFlowResponse.status);
      console.error('   Error:', cashFlowResponse.data);
    }
    console.log('');

    // Step 5: Test Financial Analysis
    console.log('Step 5: Testing Financial Analysis...');
    const analysisResponse = await makeRequest(
      'POST',
      '/financial-statements/analysis/perform',
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        includeTrends: false,
      },
      token
    );

    if (analysisResponse.status === 200 || analysisResponse.status === 201) {
      console.log('✅ Financial Analysis completed successfully');
      console.log('   Current Ratio:', analysisResponse.data.liquidity.currentRatio);
      console.log('   Quick Ratio:', analysisResponse.data.liquidity.quickRatio);
      console.log('   Working Capital:', analysisResponse.data.liquidity.workingCapital);
      console.log('   ROA:', analysisResponse.data.profitability.returnOnAssets.toFixed(2) + '%');
      console.log('   ROE:', analysisResponse.data.profitability.returnOnEquity.toFixed(2) + '%');
      console.log('   Debt to Equity:', analysisResponse.data.solvency.debtToEquity);
    } else {
      console.error('❌ Financial Analysis failed:', analysisResponse.status);
      console.error('   Error:', analysisResponse.data);
    }
    console.log('');

    console.log('✅ All Financial Statements tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests
testFinancialStatements();

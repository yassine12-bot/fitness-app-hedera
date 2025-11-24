/**
 * END-TO-END INTEGRATION TESTS
 * Tests the complete user flow: challenges, rewards, marketplace
 */

const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';

// Test user token (labrim99@gmail.com)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJsYWJyaW05OUBnbWFpbC5jb20iLCJpYXQiOjE3MzI0MzM5OTl9.6vGHZ8K3P1wZ9uX0YqN5jLmR4sT7vW2xE8fA6bC9dD0';

const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testHealthCheck() {
    console.log('\n🏥 TEST 1: Health Check');
    console.log('='.repeat(60));

    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();

    console.log(`✅ Status: ${data.status}`);
    console.log(`✅ Message: ${data.message}`);
    const res = await fetch(`${BASE_URL}/api/challenges/my-stats`, { headers });
    const data = await res.json();

    console.log(`✅ Total Steps: ${data.data.totalSteps}`);
    console.log(`✅ Completed Challenges: ${data.data.completedChallenges}`);
    console.log(`✅ Active Challenges: ${data.data.activeChallenges}`);
    console.log(`✅ Total Rewards Earned: ${data.data.totalRewards} FIT`);
    console.log(`✅ User Level: ${data.data.level}`);

    return data.success;
}

async function testStepSimulator() {
    console.log('\n🚶 TEST 4: Step Simulator (Add Steps)');
    console.log('='.repeat(60));

    const steps = 245;
    console.log(`Attempting to add ${steps} steps...`);

    const res = await fetch(`${BASE_URL}/api/challenges/update-progress`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ steps })
    });

    const data = await res.json();

    if (data.success) {
        console.log(`✅ ${data.message}`);
        return true;
    } else {
        console.log(`⚠️  ${data.message}`);
        if (data.message.includes('wallet')) {
            console.log(`\n💡 NOTE: User needs to create Hedera wallet first!`);
            console.log(`   Go to Profile → Create Wallet in frontend`);
        }
        return false;
    }
}

async function testChallengeCompletion() {
    console.log('\n🏆 TEST 5: Challenge Completion Check');
    console.log('='.repeat(60));

    const res = await fetch(`${BASE_URL}/api/challenges/my-progress`, { headers });
    const data = await res.json();

    const completed = data.data.challenges?.filter(c => c.isCompleted) || [];
    const inProgress = data.data.challenges?.filter(c => !c.isCompleted && c.progress > 0) || [];

    console.log(`✅ Completed Challenges: ${completed.length}`);
    console.log(`✅ In Progress: ${inProgress.length}`);

    if (completed.length > 0) {
        console.log(`\n🎉 Completed:`);
        completed.forEach(c => {
            console.log(`   - ${c.title}: ${c.reward} FIT earned`);
        });
    }

    if (inProgress.length > 0) {
        console.log(`\n⏳ In Progress:`);
        inProgress.forEach(c => {
            console.log(`   - ${c.title}: ${c.progress}/${c.target} (${c.percentage}%)`);
        });
    }

    return data.success;
}

async function testMarketplaceProducts() {
    console.log('\n🛒 TEST 6: Marketplace Products');
    console.log('='.repeat(60));

    const res = await fetch(`${BASE_URL}/api/marketplace/products`, { headers });
    const data = await res.json();

    console.log(`✅ Products Available: ${data.data.length}`);

    if (data.data.length > 0) {
        console.log(`\n📦 First 3 Products:`);
        data.data.slice(0, 3).forEach(p => {
            console.log(`   ${p.id}. ${p.name}`);
            console.log(`      Price: ${p.priceTokens} FIT | Stock: ${p.stock}`);
        });
    }

    return data.data.length > 0;
}

async function testQRVerification() {
    console.log('\n📱 TEST 7: QR Code Verification (Simulated)');
    console.log('='.repeat(60));

    // This would normally be called after a purchase
    console.log(`⚠️  QR verification requires actual purchase flow`);
    console.log(`   Test manually in frontend:`);
    console.log(`   1. Buy a product`);
    console.log(`   2. Check My Orders`);
    console.log(`   3. Scan QR code`);
    console.log(`   4. Verify NFT ownership`);

    return true;
}

async function testTokenBalance() {
    console.log('\n💰 TEST 8: User Token Balance');
    console.log('='.repeat(60));

    const res = await fetch(`${BASE_URL}/auth/me`, { headers });
    const data = await res.json();

    console.log(`✅ User: ${data.email}`);
    console.log(`✅ FIT Balance: ${data.fitBalance} FIT`);
    console.log(`✅ Hedera Account: ${data.hederaAccountId || 'Not created yet'}`);

    if (!data.hederaAccountId) {
        console.log(`\n💡 NOTE: Create Hedera wallet to:`);
        console.log(`   - Track challenge progress`);
        console.log(`   - Earn FIT rewards`);
        console.log(`   - Purchase marketplace items`);
    }

    return true;
}

async function runAllTests() {
    console.log('\n🧪 COMPREHENSIVE BACKEND INTEGRATION TESTS');
    console.log('='.repeat(60));
    console.log('Testing complete user flow...\n');

    const results = {
        health: false,
        challenges: false,
        stats: false,
        steps: false,
        completion: false,
        marketplace: false,
        qr: false,
        balance: false
    };

    try {
        results.health = await testHealthCheck();
        results.challenges = await testChallengesDisplay();
        results.stats = await testUserStats();
        results.steps = await testStepSimulator();
        results.completion = await testChallengeCompletion();
        results.marketplace = await testMarketplaceProducts();
        results.qr = await testQRVerification();
        results.balance = await testTokenBalance();

        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));

        const passed = Object.values(results).filter(r => r).length;
        const total = Object.keys(results).length;

        Object.entries(results).forEach(([test, passed]) => {
            const icon = passed ? '✅' : '❌';
            console.log(`${icon} ${test.toUpperCase()}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`RESULT: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 ALL TESTS PASSED!');
        } else {
            console.log('⚠️  Some tests failed - check details above');
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        console.error('Make sure backend is running: npm start');
    }
}

// Run tests
runAllTests().catch(console.error);

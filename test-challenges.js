// Simple test script to check challenges endpoint
require('dotenv').config();

async function testChallenges() {
    console.log('\n🧪 Testing Challenges Endpoint\n');
    console.log('═'.repeat(60));

    try {
        // Test with a simple fetch
        const response = await fetch('http://localhost:3000/api/challenges/active', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJsYWJyaW05OUBnbWFpbC5jb20iLCJuYW1lIjoieWFzc2luZSBtb2hhbWVkIiwiaWF0IjoxNzY0MDg2NDQ2LCJleHAiOjE3NjQ2OTEyNDZ9.LKuh0BwTMoNQm5vyHE_zF_eFirjYgRtZsX9L3oGNn-8'
            }
        });

        console.log(`\nStatus: ${response.status} ${response.statusText}`);

        const data = await response.json();

        console.log('\nResponse:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ SUCCESS!');
            console.log(`   Total challenges: ${data.data?.totalChallenges || 0}`);
            console.log(`   Daily: ${data.data?.daily?.length || 0}`);
            console.log(`   Duration: ${data.data?.duration?.length || 0}`);
            console.log(`   Social: ${data.data?.social?.length || 0}`);
        } else {
            console.log('\n❌ FAILED!');
            console.log(`   Error: ${data.message || data.error}`);
        }

    } catch (error) {
        console.error('\n❌ Request failed:', error.message);
    }

    console.log('\n' + '═'.repeat(60) + '\n');
}

testChallenges();

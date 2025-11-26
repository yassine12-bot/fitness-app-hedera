// Test if challenges endpoint works
const fetch = require('node-fetch');

async function test() {
    console.log('\n🧪 Testing /api/challenges/active\n');

    try {
        const response = await fetch('http://localhost:3000/api/challenges/active', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJsYWJyaW05OUBnbWFpbC5jb20iLCJuYW1lIjoieWFzc2luZSBtb2hhbWVkIiwiaWF0IjoxNzY0MDg2NDQ2LCJleHAiOjE3NjQ2OTEyNDZ9.LKuh0BwTMoNQm5vyHE_zF_eFirjYgRtZsX9L3oGNn-8'
            }
        });

        console.log(`Status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log('\n✅ Response received!');
            console.log(`   Success: ${data.success}`);
            console.log(`   Total challenges: ${data.data?.totalChallenges || 0}`);
            console.log(`   Daily: ${data.data?.daily?.length || 0}`);
            console.log(`   Duration: ${data.data?.duration?.length || 0}`);
            console.log(`   Social: ${data.data?.social?.length || 0}`);

            if (data.data?.daily?.length > 0) {
                console.log('\n📊 First daily challenge:');
                console.log(`   Title: ${data.data.daily[0].title}`);
                console.log(`   Progress: ${data.data.daily[0].currentProgress}/${data.data.daily[0].target}`);
                console.log(`   Completed: ${data.data.daily[0].isCompleted}`);
            }
        } else {
            const text = await response.text();
            console.log('\n❌ Error response:');
            console.log(text);
        }

    } catch (error) {
        console.error('\n❌ Request failed:', error.message);
    }
}

test();

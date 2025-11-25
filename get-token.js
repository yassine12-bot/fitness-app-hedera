require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function getToken() {
  console.log('🔑 Getting auth token...\n');

  const email = 'walk-test-1764034505381@test.com';
  const password = 'WalkTest123!';

  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password
    });

    const token = response.data.token;

    console.log('✅ Login successful!\n');
    console.log('📋 Copy this token:\n');
    console.log(token);
    console.log('\n');
    console.log('Paste it into the test when prompted.');

  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    console.log('\nMake sure:');
    console.log('  1. Backend is running (npm start)');
    console.log('  2. User exists with this email/password');
  }
}

getToken();
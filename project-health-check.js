const axios = require('axios');

const BASE_URL = 'http://192.168.1.196:5000/api';

const TEST_EMAIL = 'sabelozondo825@gmail.com';
const TEST_PASSWORD = 'Olweth@3';

let accessToken = null;

async function testHealth() {
    try {
        const res = await axios.get(`${BASE_URL}/health`);
        console.log('🔌 /health:', res.status, '| EduPlay API server is running');
    } catch (err) {
        console.error('❌ /health failed:', err.response ? err.response.data : err.message);
    }
}

async function signin() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/signin`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        accessToken = res.data.access_token;
        console.log('✅ Signin success');
    } catch (err) {
        console.error('❌ Signin failed:', err.response ? err.response.data : err.message);
    }
}

async function testProtectedRoutes() {
    if (!accessToken) {
        console.error('❌ Cannot test protected routes, no access token');
        return;
    }

    // Adjust these routes to match your Flask backend
    const routes = [
        '/dashboard',   // changed from /dashboard/overview
        '/games',
        '/lessons',
        '/progress',
        '/challenges',
        '/profile'
    ];

    for (const route of routes) {
        try {
            const res = await axios.get(`${BASE_URL}${route}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            console.log(`✅ ${route} ->`, res.status);
        } catch (err) {
            console.error(`❌ ${route} ->`, err.response ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message);
        }
    }
}

async function testInvalidToken() {
    try {
        await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer INVALID_TOKEN` }
        });
        console.log('❌ /auth/me accepted invalid token (unexpected)');
    } catch (err) {
        console.log('✅ Invalid token test:', err.response ? `${err.response.status} - ${JSON.stringify(err.response.data)}` : err.message);
    }
}

async function runTests() {
    console.log('🚀 SMART AUTH + PROTECTED ROUTES TEST');
    console.log('Base URL:', BASE_URL);
    console.log('Test email:', TEST_EMAIL);
    console.log('============================================\n');

    await testHealth();
    await signin();
    await testProtectedRoutes();
    await testInvalidToken();

    console.log('\n🎯 SMART TEST COMPLETE');
}

runTests();

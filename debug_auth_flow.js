// debug_auth_flow.js - Detailed auth flow debugging
const BASE_URL = 'http://192.168.1.196:5000/api';

async function debugAuthFlow() {
  console.log('🐛 DEBUGGING AUTH FLOW STEP BY STEP\n');
  console.log('📍 Base URL:', BASE_URL, '\n');

  // Step 1: Test basic connectivity
  console.log('1. 🔌 Testing basic connectivity...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ /health: ${healthResponse.status} - ${healthData.message}`);
  } catch (error) {
    console.log(`   ❌ /health: ${error.message}`);
    return;
  }

  // Step 2: Test auth health
  console.log('\n2. 🔐 Testing auth health...');
  try {
    const authHealthResponse = await fetch(`${BASE_URL}/auth/health`);
    const authHealthData = await authHealthResponse.json();
    console.log(`   ✅ /auth/health: ${authHealthResponse.status} - ${authHealthData.message}`);
    console.log(`   📋 Available auth endpoints:`, authHealthData.endpoints);
  } catch (error) {
    console.log(`   ❌ /auth/health: ${error.message}`);
  }

  // Step 3: Test signin with the test user we just created
  console.log('\n3. 🔑 Testing signin with test@test.com...');
  try {
    const signinResponse = await fetch(`${BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      })
    });
    
    const signinText = await signinResponse.text();
    console.log(`   Status: ${signinResponse.status}`);
    console.log(`   Response: ${signinText}`);
    
    if (signinResponse.ok) {
      const signinData = JSON.parse(signinText);
      console.log('   ✅ Signin successful!');
      console.log('   🔑 Token:', signinData.token ? 'Received' : 'Missing');
      console.log('   👤 User:', signinData.user ? `${signinData.user.first_name} ${signinData.user.last_name}` : 'Missing');
      
      // Step 4: Test protected endpoints with the token
      if (signinData.token) {
        await testProtectedEndpoints(signinData.token);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Signin error: ${error.message}`);
  }

  // Step 4: Test signup with new user
  console.log('\n4. 📝 Testing signup with new user...');
  const newEmail = `newuser_${Date.now()}@eduplay.com`;
  try {
    const signupResponse = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: 'Test123!',
        first_name: 'New',
        last_name: 'User'
      })
    });
    
    const signupText = await signupResponse.text();
    console.log(`   Status: ${signupResponse.status}`);
    console.log(`   Response: ${signupText}`);
    
  } catch (error) {
    console.log(`   ❌ Signup error: ${error.message}`);
  }
}

async function testProtectedEndpoints(token) {
  console.log('\n5. 🛡️ Testing protected endpoints...');
  
  const endpoints = [
    '/dashboard/dashboard/overview',
    '/profile/profile',
    '/games/',
    '/lessons/subjects',
    '/progress/user-progress'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.log(`     Error: ${text.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.log(`   ${endpoint}: ❌ ${error.message}`);
    }
  }
}

// Run the debug
debugAuthFlow();
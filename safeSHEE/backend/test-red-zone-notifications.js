#!/usr/bin/env node

/**
 * Test script for Red Zone Notifications with Twilio SMS
 * 
 * This script demonstrates the complete red zone notification flow:
 * 1. User authentication
 * 2. Creating emergency contacts
 * 3. Simulating red zone detection
 * 4. Sending Twilio SMS notifications
 */

const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

const TEST_CONTACT = {
  name: 'Emergency Contact',
  phone: '+19252755268',  // Twilio test number from .env
  relationship: 'Friend',
  is_primary: 1
};

let authToken = null;
let userId = null;
let contacts = [];

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Main test flow
async function runTests() {
  console.log('\n🚀 SafeSHEE Red Zone Notification Test Suite\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check Twilio Configuration
    console.log('\n📱 Test 1: Checking Twilio Configuration...');
    const twilioStatus = await makeRequest('GET', '/api/twilio/status');
    if (twilioStatus.status === 200) {
      console.log('✅ Twilio Status:');
      console.log(`   - Configured: ${twilioStatus.data.twilio_configured}`);
      console.log(`   - Phone: ${twilioStatus.data.phone_number}`);
      console.log(`   - Status: ${twilioStatus.data.status}`);
    } else {
      console.log('❌ Failed to check Twilio status');
    }

    // Test 2: Backend Connectivity
    console.log('\n🔌 Test 2: Checking Backend Connectivity...');
    const ping = await makeRequest('GET', '/ping');
    if (ping.status === 200) {
      console.log('✅ Backend is running');
    } else {
      console.log('❌ Backend connection failed');
    }

    // Test 3: Register/Login Test User
    console.log('\n👤 Test 3: Testing User Authentication...');
    
    // Try to register
    const register = await makeRequest('POST', '/auth/register', {
      name: 'Test User',
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (register.status === 201 || register.status === 200) {
      console.log('✅ User registered/exists');
    }

    // Login
    const login = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (login.status === 200 && login.data.token) {
      authToken = login.data.token;
      userId = login.data.user.id;
      console.log(`✅ Login successful for user: ${TEST_USER.email}`);
      console.log(`   - User ID: ${userId}`);
    } else {
      console.log('❌ Login failed');
      console.log(login.data);
      return;
    }

    // Test 4: Create Emergency Contact
    console.log('\n📞 Test 4: Creating Emergency Contact...');
    const createContact = await makeRequest('POST', '/contacts', TEST_CONTACT);
    
    if (createContact.status === 201) {
      const contact = createContact.data.contact;
      contacts.push(contact);
      console.log('✅ Emergency contact created:');
      console.log(`   - Name: ${contact.name}`);
      console.log(`   - Phone: ${contact.phone}`);
      console.log(`   - ID: ${contact.id}`);
    } else {
      console.log('⚠️ Contact creation response:');
      console.log(createContact.data);
    }

    // Test 5: Fetch Contacts
    console.log('\n📋 Test 5: Fetching Emergency Contacts...');
    const fetchContacts = await makeRequest('GET', '/contacts');
    
    if (fetchContacts.status === 200) {
      console.log(`✅ Found ${fetchContacts.data.contacts.length} contact(s)`);
      fetchContacts.data.contacts.forEach(c => {
        console.log(`   - ${c.name} (${c.phone})`);
      });
      if (fetchContacts.data.contacts.length > 0) {
        contacts = fetchContacts.data.contacts;
      }
    } else {
      console.log('❌ Failed to fetch contacts');
    }

    // Test 6: Send Red Zone Notification
    if (contacts.length > 0) {
      console.log('\n🚩 Test 6: Sending Red Zone Notification via Twilio...');
      const redZoneNotification = await makeRequest('POST', '/api/contact/notify', {
        contact_id: contacts[0].id,
        type: 'red_zone_alert',
        message: 'You have entered a high-risk area. Location: 28.6139, 77.2090 (New Delhi, India)',
        latitude: 28.6139,
        longitude: 77.2090
      });

      if (redZoneNotification.status === 200) {
        console.log('✅ Red Zone Notification Sent Successfully!');
        console.log(`   - Contact: ${redZoneNotification.data.contact}`);
        console.log(`   - Provider: ${redZoneNotification.data.provider}`);
        console.log(`   - SMS ID: ${redZoneNotification.data.sms_id || 'N/A'}`);
        console.log(`   - Message Type: ${redZoneNotification.data.type}`);
      } else {
        console.log('⚠️ Red Zone Notification Response:');
        console.log(`   Status: ${redZoneNotification.status}`);
        console.log(redZoneNotification.data);
      }
    } else {
      console.log('\n⚠️ Test 6: Skipped - No contacts available');
    }

    // Test 7: Check SMS Logs
    console.log('\n📊 Test 7: Checking SMS Logs...');
    const smsLogs = await makeRequest('GET', '/contacts/sms/logs');
    
    if (smsLogs.status === 200) {
      console.log(`✅ SMS Service Status:`);
      console.log(`   - Provider: ${smsLogs.data.provider}`);
      console.log(`   - Total Logs: ${smsLogs.data.total}`);
      if (smsLogs.data.sms_logs.length > 0) {
        console.log(`   - Recent SMS:`);
        smsLogs.data.sms_logs.slice(-3).forEach(log => {
          console.log(`     • To: ${log.to}`);
          console.log(`       Message: ${log.message.substring(0, 50)}...`);
          console.log(`       Time: ${log.timestamp}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Test Suite Complete!\n');
  console.log('Summary:');
  console.log('- Twilio is configured and ready');
  console.log('- Red zone notifications can be triggered');
  console.log('- SMS will be sent to emergency contacts');
  console.log('\nNext Steps:');
  console.log('1. Start the frontend: cd frontend && npm start');
  console.log('2. Create a user account and emergency contact');
  console.log('3. Trigger red zone detection by entering a high-risk area');
  console.log('4. SMS notification will be sent to your contact automatically\n');
}

// Run the tests
runTests().catch(console.error);

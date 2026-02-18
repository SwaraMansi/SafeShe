// SMS service with graceful Twilio fallback

// Attempt to load Twilio (optional)
let twilio = null;
try {
  twilio = require('twilio');
} catch (err) {
  console.log('⚠️  Twilio not installed. Using mock SMS service only.');
  console.log('   To enable Twilio: npm install twilio');
}

// Twilio credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

let twilioClient = null;
const USE_TWILIO = twilio && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE;

if (USE_TWILIO) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio SMS service initialized');
  } catch (err) {
    console.log('⚠️  Twilio initialization failed:', err.message);
    console.log('📱 Using mock SMS service for development');
    twilioClient = null;
  }
} else {
  console.log('📱 Using mock SMS service for development (no valid Twilio credentials)');
}

// Mock SMS log (for testing without Twilio)
const mockSmsLog = [];

async function sendSMS(phoneNumber, message) {
  if (!phoneNumber) {
    console.log('⚠️ No phone number provided for SMS');
    return { success: false, error: 'No phone number' };
  }

  try {
    if (USE_TWILIO && twilioClient) {
      // Send real SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to: phoneNumber
      });
      console.log(`📱 SMS sent via Twilio to ${phoneNumber} (SID: ${result.sid})`);
      return { success: true, provider: 'twilio', sid: result.sid };
    } else {
      // Mock SMS for development
      const mockSms = {
        id: Date.now(),
        to: phoneNumber,
        message: message,
        timestamp: new Date().toISOString(),
        provider: 'mock'
      };
      mockSmsLog.push(mockSms);
      console.log(`📱 [MOCK SMS] to ${phoneNumber}: "${message}"`);
      return { success: true, provider: 'mock', id: mockSms.id };
    }
  } catch (err) {
    console.error('❌ SMS send error:', err.message);
    return { success: false, error: err.message };
  }
}

// Send SOS alert SMS to emergency contacts
async function sendSOSAlert(userName, userEmail, latitude, longitude, contacts = []) {
  const message = `🚨 SAFESHEE EMERGENCY ALERT 🚨\n\n${userName} (${userEmail}) has triggered an SOS.\n\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nPlease respond immediately if you are an emergency contact.`;
  
  const results = [];
  for (const contact of contacts) {
    const result = await sendSMS(contact.phone, message);
    results.push({ contact: contact.name, result });
  }
  return results;
}

// Send status update SMS to emergency contacts
async function sendStatusUpdate(userName, status, contacts = []) {
  const statusEmoji = status === 'resolved' ? '✅' : (status === 'responding' ? '🚗' : '⚠️');
  const message = `${statusEmoji} Alert Update: ${userName}\nStatus: ${status.toUpperCase()}\n\nTime: ${new Date().toLocaleString()}`;
  
  const results = [];
  for (const contact of contacts) {
    const result = await sendSMS(contact.phone, message);
    results.push({ contact: contact.name, result });
  }
  return results;
}

// Get mock SMS log (for testing)
function getMockSmsLog() {
  return mockSmsLog;
}

// Clear mock SMS log
function clearMockSmsLog() {
  mockSmsLog.length = 0;
}

module.exports = {
  sendSMS,
  sendSOSAlert,
  sendStatusUpdate,
  getMockSmsLog,
  clearMockSmsLog,
  isTwilioConfigured: () => USE_TWILIO
};


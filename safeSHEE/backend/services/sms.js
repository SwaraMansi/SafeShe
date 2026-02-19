let twilio = null;
let twilioClient = null;
let USE_TWILIO = false;
let TWILIO_PHONE = null;

try {
  twilio = require('twilio');
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  TWILIO_PHONE = process.env.TWILIO_PHONE;
  
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
    try {
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      USE_TWILIO = true;
      console.log('✅ Twilio SMS service enabled');
    } catch (err) {
      // Silently fall back to mock SMS
      console.log('📱 Mock SMS mode (Twilio unavailable)');
    }
  } else {
    console.log('📱 Mock SMS mode (no Twilio credentials)');
  }
} catch (err) {
  console.log('📱 Mock SMS mode (Twilio library not available)');
}
const mockSmsLog = [];
async function sendSMS(phoneNumber, message) {
  if (!phoneNumber) {
    console.log('⚠️ No phone number provided for SMS');
    return { success: false, error: 'No phone number' };
  }
  try {
    if (USE_TWILIO && twilioClient) {
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to: phoneNumber
      });
      console.log(`📱 SMS sent via Twilio to ${phoneNumber} (SID: ${result.sid})`);
      return { success: true, provider: 'twilio', sid: result.sid };
    } else {
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
async function sendSOSAlert(userName, userEmail, latitude, longitude, contacts = []) {
  const message = `🚨 SAFESHEE EMERGENCY ALERT 🚨\n\n${userName} (${userEmail}) has triggered an SOS.\n\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nPlease respond immediately if you are an emergency contact.`;
  const results = [];
  for (const contact of contacts) {
    const result = await sendSMS(contact.phone, message);
    results.push({ contact: contact.name, result });
  }
  return results;
}
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
function getMockSmsLog() {
  return mockSmsLog;
}
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

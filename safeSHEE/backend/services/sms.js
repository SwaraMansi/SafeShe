let twilio = null;
try {
  twilio = require("twilio");
} catch (err) {
  console.log("⚠️ Twilio not installed.");
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

let twilioClient = null;
const USE_TWILIO =
  twilio && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE;

if (USE_TWILIO) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio SMS service initialized");
  } catch (err) {
    console.log("⚠️ Twilio initialization failed:", err.message);
    twilioClient = null;
  }
} else {
  console.log("📱 Using mock SMS service for development");
}

const mockSmsLog = [];

async function sendSMS(phoneNumber, message) {
  if (!phoneNumber) return { success: false, error: "No phone number" };

  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

  // ✅ 160 chars limit — Trial account ke liye
  const trimmedMessage =
    message.length > 160 ? message.substring(0, 157) + "..." : message;

  try {
    if (USE_TWILIO && twilioClient) {
      const result = await twilioClient.messages.create({
        body: trimmedMessage,
        from: TWILIO_PHONE,
        to: formattedPhone,
      });
      console.log(
        `📱 SMS sent via Twilio to ${formattedPhone} (SID: ${result.sid})`,
      );
      return { success: true, provider: "twilio", sid: result.sid };
    } else {
      const mockSms = {
        id: Date.now(),
        to: formattedPhone,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        provider: "mock",
      };
      mockSmsLog.push(mockSms);
      console.log(`📱 [MOCK SMS] to ${formattedPhone}: "${trimmedMessage}"`);
      return { success: true, provider: "mock", id: mockSms.id };
    }
  } catch (err) {
    console.error("❌ SMS send error:", err.message);
    return { success: false, error: err.message };
  }
}

async function sendSOSAlert(
  userName,
  userEmail,
  latitude,
  longitude,
  contacts = [],
) {
  const lat = typeof latitude === "number" ? latitude.toFixed(4) : latitude;
  const lon = typeof longitude === "number" ? longitude.toFixed(4) : longitude;

  // ✅ Short message — 160 chars ke andar
  const message = `SOS: ${userName} needs help! Location: https://maps.google.com/?q=${lat},${lon}`;

  const results = [];
  for (const contact of contacts) {
    const targetPhone = contact.phone || contact.phoneNumber;
    if (targetPhone) {
      const result = await sendSMS(targetPhone, message);
      results.push({ contact: contact.name, result });
    }
  }
  return results;
}

async function sendStatusUpdate(userName, status, contacts = []) {
  const statusEmoji = status === "resolved" ? "✅" : "⚠️";
  const message = `${statusEmoji} Update: ${userName} is ${status.toUpperCase()}.`;

  const results = [];
  for (const contact of contacts) {
    const targetPhone = contact.phone || contact.phoneNumber;
    if (targetPhone) {
      const result = await sendSMS(targetPhone, message);
      results.push({ contact: contact.name, result });
    }
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
  isTwilioConfigured: () => USE_TWILIO,
};

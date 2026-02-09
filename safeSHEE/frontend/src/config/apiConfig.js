// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  
  // Reports
  REPORTS: `${API_BASE_URL}/reports`,
  REPORTS_USER: `${API_BASE_URL}/reports/user`,
  REPORTS_WEARABLE: `${API_BASE_URL}/reports/wearable-alert`,
  
  // Contacts
  CONTACTS: `${API_BASE_URL}/contacts`,
  CONTACTS_PRIMARY: `${API_BASE_URL}/contacts/primary`,
  CONTACT_NOTIFY: `${API_BASE_URL}/api/contact/notify`,
  
  // Red Zones
  REDZONES: `${API_BASE_URL}/redzones`,
  
  // Analytics
  ANALYTICS: `${API_BASE_URL}/analytics`,
  
  // SOS
  SOS: `${API_BASE_URL}/sos`,
};

export const WS_ENDPOINT = WS_URL;

export default API_BASE_URL;

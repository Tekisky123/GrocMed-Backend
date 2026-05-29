import dotenv from 'dotenv';

dotenv.config();

/**
 * Formats a phone number to standard international format (e.g. +91XXXXXXXXXX).
 * Specifically supports Indian phone numbers, cleaning spacing, formatting prefixes, etc.
 * @param {string} phone 
 * @returns {string|null}
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Remove leading zero if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // For Indian numbers: if it is 10 digits, prefix with 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // If it starts with 91 and has 12 digits, return standard format
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // Otherwise, return it with "+" if it is valid length, or default prefix
  return cleaned.length >= 10 ? '+' + cleaned : null;
};

/**
 * Send a single WhatsApp template message via the AiSensy Campaign API.
 * @param {string} phone - Destination phone number.
 * @param {string} userName - Name of the customer/recipient.
 * @param {string} campaignName - Name of the Live API campaign on AiSensy.
 * @param {Array<string>} templateParams - Placeholder values for the template.
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const sendWhatsAppMessage = async (phone, userName, campaignName, templateParams = []) => {
  const apiKey = process.env.AISENSY_API_KEY;
  if (!apiKey) {
    console.warn('[WHATSAPP SERVICE] AISENSY_API_KEY is not defined. WhatsApp message delivery skipped.');
    return { success: false, error: 'AiSensy API key not configured' };
  }

  const destination = formatPhoneNumber(phone);
  if (!destination) {
    console.warn(`[WHATSAPP SERVICE] Invalid phone number skipped: "${phone}"`);
    return { success: false, error: 'Invalid phone number' };
  }

  const payload = {
    apiKey,
    campaignName,
    destination,
    userName: userName || 'Customer',
    templateParams: templateParams.map(param => String(param)), // Ensure all values are strings
  };

  try {
    console.log(`[WHATSAPP SERVICE] Dispatched campaign "${campaignName}" to: ${destination} with parameters:`, templateParams);

    const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[WHATSAPP SERVICE] Api Response:', data);

    if (response.ok && (data.success === true || data.status === 'success' || data.valid === true)) {
      return { success: true, data };
    } else {
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('[WHATSAPP SERVICE] Network/API Error:', error.message);
    return { success: false, error: error.message };
  }
};

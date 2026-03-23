import { NextResponse } from "next/server";

const BAWA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIzMzl3aG4xVWVvWTVabGtHS0JhVG9JbnQyc1dCZ29xVSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQwNDY2NDY4fQ._Ul8BYxqcqYQ1k1fNlRZEhQeQ5Y_uzG9zWhtsXuCFdI";
const INSTANCE_ID = "eyJ1aWQiOiJoa3pyeVM5TkVOd3dFb05DR2tNMDhwSkdVTHVOa3pyOCIsImNsaWVudF9pZCI6IlRPR0RIRVIgR1lNIn0=";


export async function POST(req: Request) {
  try {
    const { phone, name, gender, fee, registerDate, messageType, expireDate } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    let message = "";

    // Determine title based on gender (case-insensitive)
    const title = gender.toLowerCase() === 'male' ? 'Mudane' : 'Marwo';

    if (messageType === "welcome") {
      // Welcome message for new registration
      message = `*${title}, ${name},* \n\nKusoo Dhawoow TOGDHEER FITNESS CENTER, GYM-ka ugu casrisan ee ku yaala magaaladda Burco.\n\n*Taariikhda Diiwaan Gelinta:* ${registerDate}\n\nFarxad gaar ah ayay noo tahay in aad kamid noqoto Bahda TOGDHEER FITNESS CENTER.\n\n *Nidaamkan waxa hirgaliyay shirkada adeegyada tiknoolajiga ee TAAM SOLUTIONS.*`;
      
    } else if (messageType === "payment") {
      // Payment reminder message
      message = `*Ogaysiiska Lacag Bixinta!* \n\n${title} ${name},\n\nWaxa ay gaadhay wakhtigii ay kaa dhici lahayd lacagta Subscription-ka ee Bisha, fadlan dib u cusboonaysii mar kale.\n\n *Nidaamkan waxa hirgaliyay shirkada adeegyada tiknoolajiga ee TAAM SOLUTIONS.*`;
      
    } else if (messageType === "renewal") {
      // Renewal confirmation message
      const renewalDate = expireDate || registerDate;
      
      message = `*Mahadsanid ${title} ${name}!* \n\nWaxaad si buuxda u cusboonaysiisay Subscription-ka GYM-ka TOGDHEER FITNESS CENTER.\n\n*Macluumaadka Cusboonaysiinta:*
        Lacagta: $${fee}
        Taariikhda Dhamaadka: ${expireDate || '1 bil gudahood'}\n\nWaad ku mahadsan tahay inaad kamid tahay Bahda TOGDHEER FITNESS CENTER! \n\n *Nidaamkan waxa hirgaliyay shirkada adeegyada tiknoolajiga ee TAAM SOLUTIONS.*`;
      
    // } else if (messageType === "admin") {
    //   // Admin notification message
    //   message = `*XUBIN CUSUB  M BAHDA TOGDHEER FITNESS CENTER!*\n\n*Magaca:* ${title} ${name}\n*Telefoonka:* ${phone}\n*Jinsiga:* ${gender}\n*Lacagta:* $${fee}\n*Taariikhda:* ${registerDate}\n\n*Ku soo dhawoow cusbacaal!* `;
    }

    // Format phone number for WhatsApp
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Remove leading zeros and ensure proper format
    let cleanPhone = formattedPhone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '252' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('252')) {
      // Already in correct format
    } else {
      cleanPhone = '252' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    console.log('📱 Sending WhatsApp message:');
    console.log('Phone:', phone);
    console.log('Formatted:', formattedPhone);
    console.log('Clean phone:', cleanPhone);
    console.log('JID:', jid);
    console.log('Message type:', messageType);
    console.log('Gender:', gender);
    console.log('Title:', title);
    console.log('Message:', message);

    // Construct the API URL
    const apiUrl = `https://bawa.app/api/v1/send-text?token=${BAWA_TOKEN}&instance_id=${INSTANCE_ID}&jid=${jid}&msg=${encodeURIComponent(message)}`;

    console.log('🔗 API URL:', apiUrl);

    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TogdheerGym/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // If not JSON, read as text
        const textResponse = await response.text();
        console.log('📡 Raw response:', textResponse);
        
        // Try to parse as JSON if it looks like JSON
        try {
          responseData = JSON.parse(textResponse);
        } catch {
          responseData = { 
            status: response.ok ? 'success' : 'error',
            rawResponse: textResponse,
            statusCode: response.status
          };
        }
      }

      console.log('📡 Response data:', responseData);

      if (response.ok && (responseData.status === "success" || responseData.success)) {
        return NextResponse.json({ 
          success: true, 
          message: "WhatsApp message sent successfully",
          data: responseData
        });
      } else {
        throw new Error(responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Bawa API took too long to respond');
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("❌ WhatsApp API error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to send WhatsApp message",
        details: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
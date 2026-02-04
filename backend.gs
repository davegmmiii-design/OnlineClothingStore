const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;
const NETLIFY_URL = 'https://womenonlineclothingstore.netlify.app';

/**
 * 🚀 PRODUCTION BACKEND - BUGFIX VERSION
 * Fixed: Infinite loop on crash, Image upload handling.
 */

function setWebhook() {
  const myUrl = "https://script.google.com/macros/s/AKfycbz2MLRgD-E7OZjS9cK8YeOTDtRw7BO3NfwYR1ujCGJPjFBLYR6xek_CEKb-8Af8xLN5/exec";
  const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(myUrl);
  const response = UrlFetchApp.fetch(url);
  Logger.log("SERVER RESPONSE: " + response.getContentText());
}

function testBot() {
  sendTelegramMessage(ADMIN_ID, "🚀 CONNECTION TEST: Bot is online!");
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'getProducts') return contentResponse(getSheetData(sheet.getSheetByName('Products')));
    if (action === 'getMyOrders') {
      const data = getSheetData(sheet.getSheetByName('Orders')).filter(o => String(o.User_ID) === String(e.parameter.userId));
      return contentResponse(data);
    }
  } catch (e) {
    return contentResponse({error: e.message});
  }
  return contentResponse({ error: 'Invalid action' });
}

function doPost(e) {
  // CRITICAL: Always return 200 OK to Telegram ASAP to prevent repeat messages (loops)
  try {
    if (!e || !e.postData || !e.postData.contents) return contentResponse({ok: true});
    const postData = JSON.parse(e.postData.contents);
    
    // Log incoming data for debugging in 'Debug_Logs' tab
    debugLog(postData);

    if (postData.message) {
      handleTelegramMessage(postData.message);
    } else if (postData.action) {
      // Handle website actions (createOrder, etc)
      return handleWebsiteAction(postData);
    }
    
  } catch (err) {
    debugLog("CRITICAL ERROR: " + err.message);
  }
  
  // Always return success to Telegram to stop retries
  return contentResponse({ ok: true });
}

function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // WELCOME MESSAGE (Only triggers on exact /start)
  if (text === '/start') {
    const keyboard = { inline_keyboard: [[{ text: "🛍️ Open Boutique", web_app: { url: NETLIFY_URL } }]] };
    sendTelegramMessage(chatId, "Welcome to OnlineClothingStore! 👗✨ Select your items and we will generate your invoice.", keyboard);
    return;
  }

  // 📸 IMAGE UPLOAD HANDLER
  if (message.photo) {
    try {
      const photo = message.photo[message.photo.length - 1]; // Biggest version
      const fileUrl = getTelegramFileUrl(photo.file_id);
      
      sendTelegramMessage(chatId, "⏳ Uploading image to Cloudinary...");
      
      const res = uploadToCloudinary(fileUrl);
      const cloudUrl = res.secure_url;
      
      // Attempt to log to Admin_Log
      try {
        const adminLog = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Admin_Log');
        if (!adminLog) {
          SpreadsheetApp.openById(SHEET_ID).insertSheet('Admin_Log').appendRow(['Date', 'URL']);
        }
        SpreadsheetApp.openById(SHEET_ID).getSheetByName('Admin_Log').appendRow([new Date(), cloudUrl]);
      } catch (e) {
        debugLog("Admin_Log write error: " + e.message);
      }
      
      sendTelegramMessage(chatId, "✅ Upload Successful!\n\nPaste this URL into the 'Image_URL' column in your sheet:\n\n" + cloudUrl);
      
    } catch (err) {
      debugLog("UPLOAD ERROR: " + err.message);
      sendTelegramMessage(chatId, "❌ Image upload failed. Please check if your Cloudinary credentials are correct.");
    }
  }
}

function handleWebsiteAction(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID);
    if (data.action === 'createOrder') {
      const ordersSheet = sheet.getSheetByName('Orders');
      const orderId = 'Order-' + Date.now();
      ordersSheet.appendRow([orderId, data.customerName, data.userId, JSON.stringify(data.items), data.totalPrice, 'Pending', new Date()]);
      sendTelegramMessage(ADMIN_ID, `🛍️ New Order: ${orderId}\nTotal: $${data.totalPrice}`);
      return contentResponse({ success: true, orderId: orderId });
    }
  } catch (e) {
    return contentResponse({ success: false, error: e.message });
  }
  return contentResponse({ ok: true });
}

// ======= UTILITIES =======

function debugLog(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Debug_Logs');
    if (!logSheet) logSheet = ss.insertSheet('Debug_Logs');
    logSheet.appendRow([new Date(), typeof data === 'string' ? data : JSON.stringify(data)]);
  } catch (e) {}
}

function getSheetData(sheet) {
  const v = sheet.getDataRange().getValues();
  return v.slice(1).map(r => {
    const o = {};
    v[0].forEach((h, i) => o[h] = r[i]);
    return o;
  });
}

function contentResponse(d) {
  return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
}

function sendTelegramMessage(chatId, text, markup) {
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text, reply_markup: markup ? JSON.stringify(markup) : undefined })
    });
  } catch (e) {
    debugLog("Message send error: " + e.message);
  }
}

function getTelegramFileUrl(id) {
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${id}`);
  const path = JSON.parse(res.getContentText()).result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${path}`;
}

function uploadToCloudinary(url) {
  const b = UrlFetchApp.fetch(url).getBlob();
  const res = UrlFetchApp.fetch(`https://api.cloudinary.com/v1_1/dykqic1xn/image/upload`, {
    method: 'post', payload: { file: b, upload_preset: 'ml_default' }
  });
  return JSON.parse(res.getContentText());
}

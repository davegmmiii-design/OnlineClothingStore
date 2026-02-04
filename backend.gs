const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;
const NETLIFY_URL = 'https://womenonlineclothingstore.netlify.app';

/**
 * 👗 FINAL STABLE SERVER - REPAIR VERSION
 * This version stops loops and forces data saves.
 */

function setWebhook() {
  const myUrl = "https://script.google.com/macros/s/AKfycbz2MLRgD-E7OZjS9cK8YeOTDtRw7BO3NfwYR1ujCGJPjFBLYR6xek_CEKb-8Af8xLN5/exec";
  const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(myUrl);
  const response = UrlFetchApp.fetch(url);
  Logger.log("SERVER RESPONSE: " + response.getContentText());
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'getProducts') return contentResponse(getSheetData(ss.getSheetByName('Products')));
    if (action === 'getMyOrders') {
      const sheet = ss.getSheetByName('Orders');
      if (!sheet) return contentResponse([]);
      const data = getSheetData(sheet).filter(o => String(o.User_ID) === String(e.parameter.userId));
      return contentResponse(data);
    }
  } catch (e) {
    return contentResponse({error: e.message});
  }
}

function doPost(e) {
  // CRITICAL: Acknowledge Telegram immediately to stop loops
  try {
    if (!e || !e.postData || !e.postData.contents) return contentResponse({ok: true});
    const postData = JSON.parse(e.postData.contents);
    
    // Log for debugging
    debugLog(postData);

    // 1. Handle Order Submissions (from Website)
    if (postData.action === 'createOrder') {
      return handleCreateOrder(postData);
    }

    // 2. Handle Messages (from Telegram)
    if (postData.message) {
      handleTelegramMessage(postData.message);
    }
    
  } catch (err) {
    debugLog("ERROR: " + err.message);
  }
  
  return contentResponse({ ok: true });
}

function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // Only respond to start if it's the first time or specific command
  if (text === '/start') {
    const keyboard = { inline_keyboard: [[{ text: "🛍️ Open Boutique", web_app: { url: NETLIFY_URL } }]] };
    sendTelegramMessage(chatId, "Welcome to OnlineClothingStore! 👗✨ Select your items and we will generate your invoice.", keyboard);
    return;
  }

  // Handle Photo Upload
  if (message.photo) {
    handlePhotoUpload(chatId, message.photo);
  }
}

function handleCreateOrder(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Orders');
    if (!sheet) sheet = ss.insertSheet('Orders');
    
    // Ensure Headers exist
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Order_ID', 'Customer_Name', 'User_ID', 'Items', 'Total_Price', 'Status', 'Timestamp']);
    }

    const orderId = 'ORD-' + Math.floor(Math.random() * 90000 + 10000);
    sheet.appendRow([
      orderId, 
      data.customerName, 
      data.userId, 
      JSON.stringify(data.items), 
      data.totalPrice, 
      'Pending', 
      new Date()
    ]);
    
    sendTelegramMessage(ADMIN_ID, `🛍️ NEW ORDER: ${orderId}\nCustomer: ${data.customerName}\nTotal: $${data.totalPrice}`);
    return contentResponse({ success: true, orderId: orderId });
  } catch (e) {
    debugLog("ORDER FAIL: " + e.message);
    return contentResponse({ success: false, error: e.message });
  }
}

function handlePhotoUpload(chatId, photoArray) {
  try {
    const photo = photoArray[photoArray.length - 1]; // Highest quality
    const fileUrl = getTelegramFileUrl(photo.file_id);
    sendTelegramMessage(chatId, "⏳ Uploading image to Cloudinary...");
    
    const res = uploadToCloudinary(fileUrl);
    const cloudUrl = res.secure_url;
    
    // Log to Admin_Log
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Admin_Log');
    if (!logSheet) {
      logSheet = ss.insertSheet('Admin_Log');
      logSheet.appendRow(['Date', 'URL']);
    }
    logSheet.appendRow([new Date(), cloudUrl]);
    
    sendTelegramMessage(chatId, "✅ Done! Copy this image link:\n\n" + cloudUrl);
  } catch (e) {
    sendTelegramMessage(chatId, "❌ Upload Error: " + e.message);
  }
}

// ======= HELPERS =======

function debugLog(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Debug_Logs');
    if (!logSheet) logSheet = ss.insertSheet('Debug_Logs');
    logSheet.appendRow([new Date(), JSON.stringify(data)]);
  } catch (e) {}
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const v = sheet.getDataRange().getValues();
  if (v.length < 2) return [];
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
  UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, reply_markup: markup ? JSON.stringify(markup) : undefined })
  });
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

const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;
const NETLIFY_URL = 'https://womenonlineclothingstore.netlify.app';

/**
 * 🚀 BULLETPROOF BACKEND - V3
 * Solves: Bot Loops, Order Connection Errors, Image Upload Response.
 */

function setWebhook() {
  const scriptUrl = ScriptApp.getService().getUrl();
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(scriptUrl)}&drop_pending_updates=true`;
  const res = UrlFetchApp.fetch(url);
  Logger.log(res.getContentText());
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    // 🔍 CONNECTION TEST (Access this in browser to verify deployment)
    if (action === 'test') return contentResponse({ status: '✅ ONLINE', message: 'If you see this, your script deployment is PERFECT. Now ensure this URL is in Netlify VITE_APPS_SCRIPT_URL' });
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'getProducts') return contentResponse(getSheetData(ss.getSheetByName('Products')));
    if (action === 'getMyOrders') {
      const sheet = ss.getSheetByName('Orders');
      const data = sheet ? getSheetData(sheet).filter(o => String(o.User_ID) === String(e.parameter.userId)) : [];
      return contentResponse(data);
    }
    return contentResponse({ error: 'Invalid action' });
  } catch (err) {
    return contentResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return contentResponse({ ok: true });
    const postData = JSON.parse(e.postData.contents);
    
    // 🔍 DEDUPLICATION (Stop Loops)
    if (postData.update_id && isDuplicateUpdate(postData.update_id)) {
      return contentResponse({ ok: true });
    }

    // 🛒 CASE 1: WEBSITE ACTION (from Netlify)
    if (postData.action === 'createOrder') {
      const result = handleCreateOrder(postData);
      return contentResponse(result);
    }

    // 🤖 CASE 2: TELEGRAM UPDATE
    const message = postData.message || postData.edited_message;
    if (message && message.chat) {
      handleTelegramMessage(message);
    }
    
    // Always acknowledge Telegram to stop retries
    return contentResponse({ ok: true });
    
  } catch (err) {
    debugLog("POST_CRASH: " + err.message);
    return contentResponse({ ok: true, error: err.message });
  }
}

function isDuplicateUpdate(updateId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let cacheSheet = ss.getSheetByName('Update_Cache') || ss.insertSheet('Update_Cache');
  const values = cacheSheet.getDataRange().getValues();
  const idStr = String(updateId);
  
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === idStr) return true;
  }
  
  cacheSheet.appendRow([idStr, new Date()]);
  if (cacheSheet.getLastRow() > 100) cacheSheet.deleteRow(1); // Keep cache small
  return false;
}

function handleTelegramMessage(message) {
  if (!message || !message.chat) return;
  const chatId = message.chat.id;
  
  try {
    const text = (message.text || '').toLowerCase().trim();
    
    if (text === '/start') {
      const keyboard = { inline_keyboard: [[{ text: "🛍️ Open Boutique", web_app: { url: NETLIFY_URL } }]] };
      sendTelegramMessage(chatId, "Welcome to OnlineClothingStore! 👗✨ Select your items and we will generate your invoice once your order is approved.", keyboard);
      return;
    }

    if (message.photo) {
      handlePhotoUpload(chatId, message.photo);
      return;
    }
  } catch (e) {
    debugLog("MSG_HANDLER_ERR: " + e.message);
    sendTelegramMessage(chatId, "⚠️ System Busy. Please try again in a moment.");
  }
}

function handleCreateOrder(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Order_ID', 'Customer_Name', 'User_ID', 'Items', 'Total_Price', 'Status', 'Timestamp']);
    }

    const orderId = 'ORD-' + Date.now();
    sheet.appendRow([orderId, data.customerName, data.userId, JSON.stringify(data.items), data.totalPrice, 'Pending', new Date()]);

    sendTelegramMessage(ADMIN_ID, `🛍️ NEW ORDER: ${orderId}\nCustomer: ${data.customerName}\nTotal: $${data.totalPrice}`);
    return { success: true, orderId: orderId };
  } catch (e) {
    debugLog("ORDER_FAIL: " + e.message);
    return { success: false, error: e.message };
  }
}

function handlePhotoUpload(chatId, photoArray) {
  try {
    const photo = photoArray[photoArray.length - 1];
    const fileUrl = getTelegramFileUrl(photo.file_id);
    
    sendTelegramMessage(chatId, "⏳ Processing your image... Please wait.");
    
    const res = uploadToCloudinary(fileUrl);
    if (!res || !res.secure_url) throw new Error("Cloudinary upload failed");
    
    const cloudUrl = res.secure_url;
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Admin_Log') || ss.insertSheet('Admin_Log');
    logSheet.appendRow([new Date(), cloudUrl]);
    
    sendTelegramMessage(chatId, "✅ Image Ready!\n\nUse this URL in your Sheet:\n\n" + cloudUrl);
  } catch (e) {
    debugLog("PHOTO_FAIL: " + e.message);
    sendTelegramMessage(chatId, "❌ Image upload failed. Ensure your Cloudinary setup is correct.");
  }
}

// ======= HELPERS =======

function debugLog(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Debug_Logs') || ss.insertSheet('Debug_Logs');
    logSheet.appendRow([new Date(), JSON.stringify(data)]);
  } catch (e) {}
}

function getSheetData(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
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
    debugLog("SND MSG ERR: " + e.message);
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

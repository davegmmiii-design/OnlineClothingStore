const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;
const NETLIFY_URL = 'https://womenonlineclothingstore.netlify.app';

/**
 * 🚀 BULLETPROOF BACKEND - FINAL STABLE
 */

/**
 * 🛠️ DIAGNOSTIC: Step 1 - Check if your Token is Valid.
 */
function testToken() {
  try {
    const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/getMe");
    Logger.log("✅ TOKEN IS VALID: " + res.getContentText());
  } catch (e) {
    Logger.log("❌ TOKEN IS INVALID: Check for extra spaces or typos.");
  }
}

/**
 * 🛠️ DIAGNOSTIC: Step 2 - Check if your Admin ID is Correct.
 */
function checkStatus() {
  const res = sendTelegramMessage(ADMIN_ID, "✅ Bot Status: ONLINE! Your Token and Admin ID are working perfectly.");
  if (res && JSON.parse(res.getContentText()).ok) {
    Logger.log("🚀 SUCCESS! You should see a message on your Telegram.");
  } else {
    Logger.log("❌ FAILED: Response was: " + (res ? res.getContentText() : "No response"));
    Logger.log("💡 TIP: Is '361418833' definitely your ID? Send a message to @userinfobot to verify.");
  }
}

function setWebhook() {
  const scriptUrl = ScriptApp.getService().getUrl();
  if (!scriptUrl) {
    Logger.log("❌ ERROR: You must Deploy > New Deployment > Web App first!");
    return;
  }
  const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(scriptUrl) + "&drop_pending_updates=true";
  const res = UrlFetchApp.fetch(url);
  Logger.log("✅ WEBHOOK SYNCED: " + res.getContentText());
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'test') return contentResponse({ status: '✅ ONLINE' });
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'getProducts') return contentResponse(getSheetData(ss.getSheetByName('Products')));
    if (action === 'getMyOrders') {
      const sheet = ss.getSheetByName('Orders');
      const data = sheet ? getSheetData(sheet).filter(o => String(o.User_ID) === String(e.parameter.userId)) : [];
      return contentResponse(data);
    }
  } catch (err) {
    return contentResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return contentResponse({ ok: true });
    const postData = JSON.parse(e.postData.contents);
    
    if (postData.update_id && isDuplicateUpdate(postData.update_id)) {
      return contentResponse({ ok: true });
    }

    if (postData.action === 'createOrder') {
      return contentResponse(handleCreateOrder(postData));
    }

    const message = postData.message || postData.edited_message;
    if (message && message.chat) {
      handleTelegramMessage(message);
    }
    
    return contentResponse({ ok: true });
  } catch (err) {
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
  if (cacheSheet.getLastRow() > 100) cacheSheet.deleteRow(1);
  return false;
}

function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  try {
    const text = (message.text || '').toLowerCase().trim();
    if (text === '/start') {
      const keyboard = { inline_keyboard: [[{ text: "🛍️ Open Boutique", web_app: { url: NETLIFY_URL } }]] };
      sendTelegramMessage(chatId, "Welcome! 👗 Select items and we will generate your invoice once approved.", keyboard);
      return;
    }
    if (message.photo) {
      handlePhotoUpload(chatId, message.photo);
    }
  } catch (e) {
    sendTelegramMessage(chatId, "⚠️ System Busy.");
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
    sendTelegramMessage(ADMIN_ID, "🛍️ NEW ORDER: " + orderId + "\nTotal: $" + data.totalPrice);
    return { success: true, orderId: orderId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function handlePhotoUpload(chatId, photoArray) {
  try {
    const photo = photoArray[photoArray.length - 1];
    const fileUrl = getTelegramFileUrl(photo.file_id);
    sendTelegramMessage(chatId, "⏳ Processing image...");
    const res = uploadToCloudinary(fileUrl);
    const cloudUrl = res.secure_url;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName('Admin_Log') || ss.insertSheet('Admin_Log');
    logSheet.appendRow([new Date(), cloudUrl]);
    sendTelegramMessage(chatId, "✅ Image Ready:\n\n" + cloudUrl);
  } catch (e) {
    sendTelegramMessage(chatId, "❌ Upload Failed.");
  }
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
    return UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text, reply_markup: markup ? JSON.stringify(markup) : undefined })
    });
  } catch (e) {
    return null;
  }
}

function getTelegramFileUrl(id) {
  const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/getFile?file_id=" + id);
  const path = JSON.parse(res.getContentText()).result.file_path;
  return "https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + path;
}

function uploadToCloudinary(url) {
  const b = UrlFetchApp.fetch(url).getBlob();
  const res = UrlFetchApp.fetch("https://api.cloudinary.com/v1_1/dykqic1xn/image/upload", {
    method: 'post', payload: { file: b, upload_preset: 'ml_default' }
  });
  return JSON.parse(res.getContentText());
}

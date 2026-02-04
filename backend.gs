const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;
const NETLIFY_URL = 'https://womenonlineclothingstore.netlify.app';

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
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  if (action === 'getProducts') return contentResponse(getSheetData(sheet.getSheetByName('Products')));
  if (action === 'getMyOrders') {
    const data = getSheetData(sheet.getSheetByName('Orders')).filter(o => String(o.User_ID) === String(e.parameter.userId));
    return contentResponse(data);
  }
  return contentResponse({ error: 'Invalid action' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return contentResponse({error: "No data"});
    const postData = JSON.parse(e.postData.contents);
    if (postData.message) return handleTelegramMessage(postData.message);
    
    const action = postData.action;
    const sheet = SpreadsheetApp.openById(SHEET_ID);
    if (action === 'createOrder') {
      const ordersSheet = sheet.getSheetByName('Orders');
      const orderId = 'Order-' + Date.now();
      ordersSheet.appendRow([orderId, postData.customerName, postData.userId, JSON.stringify(postData.items), postData.totalPrice, 'Pending', new Date()]);
      sendTelegramMessage(ADMIN_ID, `🛍️ New Order: ${orderId}\nTotal: $${postData.totalPrice}`);
      return contentResponse({ success: true, orderId: orderId });
    }
  } catch (err) {
    return contentResponse({error: err.message});
  }
  return contentResponse({ ok: true });
}

function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  if (text === '/start') {
    const keyboard = { inline_keyboard: [[{ text: "🛍️ Open Boutique", web_app: { url: NETLIFY_URL } }]] };
    sendTelegramMessage(chatId, "Welcome to OnlineClothingStore! 👗✨ Select your items and we will generate your invoice.", keyboard);
  }
  return contentResponse({ ok: true });
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
  UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, reply_markup: markup ? JSON.stringify(markup) : undefined })
  });
}

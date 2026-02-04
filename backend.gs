/**
 * OnlineClothingStore Backend
 * Google Sheets + Telegram Bot + Cloudinary Integration
 */

const SHEET_ID = '1JYBiC5vq7pOb81cGIKOiTcpwB-H3FGg6Mdb-eEShaAw';
const BOT_TOKEN = '8374476514:AAEO2z8Pu0K09nGCoSU5M2qmFgJtQon6ixs';
const ADMIN_ID = 361418833;

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  
  if (action === 'getProducts') {
    const data = getSheetData(sheet.getSheetByName('Products'));
    return contentResponse(data);
  }
  
  if (action === 'getMyOrders') {
    const userId = e.parameter.userId;
    const data = getSheetData(sheet.getSheetByName('Orders'))
      .filter(order => String(order.User_ID) === String(userId));
    return contentResponse(data);
  }
  
  return contentResponse({ error: 'Invalid action' });
}

function doPost(e) {
  const postData = JSON.parse(e.postData.contents);
  
  // Handle Telegram Webhook
  if (postData.message) {
    return handleTelegramMessage(postData.message);
  }
  
  const action = postData.action;
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  
  if (action === 'createOrder') {
    const ordersSheet = sheet.getSheetByName('Orders');
    const orderId = 'OnlineClothingStore-' + Date.now();
    const newOrder = [
      orderId,
      postData.customerName,
      postData.userId,
      JSON.stringify(postData.items),
      postData.totalPrice,
      'Pending',
      new Date()
    ];
    ordersSheet.appendRow(newOrder);
    
    // Notify Admin
    sendTelegramMessage(ADMIN_ID, `🛍️ New Order: ${orderId}\nCustomer: ${postData.customerName}\nTotal: $${postData.totalPrice}\n\nPlease check the dashboard.`);
    
    return contentResponse({ success: true, orderId: orderId });
  }
  
  if (action === 'approveOrder') {
    if (String(postData.adminId) !== String(ADMIN_ID)) return contentResponse({ error: 'Unauthorized' });
    
    const ordersSheet = sheet.getSheetByName('Orders');
    const orderId = postData.orderId;
    const orderData = getSheetData(ordersSheet);
    const orderRowIndex = orderData.findIndex(o => o.Order_ID === orderId) + 2;
    
    if (orderRowIndex > 1) {
      const order = orderData[orderRowIndex - 2];
      ordersSheet.getRange(orderRowIndex, 6).setValue('Approved');
      
      // Update Stock
      const items = JSON.parse(order.Items);
      updateStock(items);
      
      // Notify User & Send Invoice
      const paymentInfo = "[Paste Payment Info from Note]"; // User should replace this
      const message = `✅ Your order ${orderId} has been approved!\n\n${paymentInfo}\n\nGenerating your professional PDF invoice...`;
      sendTelegramMessage(order.User_ID, message);
      
      try {
        const pdfFile = createInvoicePdf(orderId, order);
        sendTelegramFile(order.User_ID, pdfFile.getBlob(), `Invoice-${orderId}.pdf`);
      } catch (e) {
        sendTelegramMessage(order.User_ID, `⚠️ PDF generation failed, but your order is approved. Please contact support. Error: ${e.message}`);
      }
      
      return contentResponse({ success: true });
    }
  }

  return contentResponse({ error: 'Invalid action' });
}

function createInvoicePdf(orderId, order) {
  // This assumes the first sheet is the template OR there's a sheet named 'InvoiceTemplate'
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const templateSheet = ss.getSheetByName('Products'); // Just as a fallback, user should have a template
  // To keep it simple and reliable for the user:
  // We'll create a temporary Doc to act as an invoice if no Sheet template is found, 
  // or just export the Orders row as a PDF if formatted.
  
  // For now, let's create a beautiful simple PDF using DocumentApp
  const doc = DocumentApp.create(`Invoice-${orderId}`);
  const body = doc.getBody();
  body.appendParagraph("OnlineClothingStore").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Invoice: ${orderId}`);
  body.appendParagraph(`Customer: ${order.Customer_Name}`);
  body.appendParagraph(`Date: ${new Date().toLocaleDateString()}`);
  body.appendParagraph("");
  
  const table = body.appendTable();
  const header = table.appendTableRow();
  header.appendTableCell("Item");
  header.appendTableCell("Qty");
  header.appendTableCell("Price");
  
  const items = JSON.parse(order.Items);
  items.forEach(item => {
    const row = table.appendTableRow();
    row.appendTableCell(item.name);
    row.appendTableCell(String(item.quantity));
    row.appendTableCell(`$${item.price}`);
  });
  
  body.appendParagraph("");
  body.appendParagraph(`Total: $${order.Total_Price}`).setBold(true);
  body.appendParagraph("\nPayment Instructions:\n[Paste Payment Info from Note]");
  
  doc.saveAndClose();
  const pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true); // Clean up temp doc
  return pdf;
}

function sendTelegramFile(chatId, blob, filename) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const payload = {
    chat_id: chatId,
    document: blob,
    filename: filename
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    payload: payload
  });
}


function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  if (text === '/start') {
    const welcomeMsg = "Welcome to OnlineClothingStore! 👗✨ Select your items, and I will send you a professional PDF invoice once your order is approved.";
    const keyboard = {
      inline_keyboard: [[
        { text: "🛍️ Open Boutique", web_app: { url: "REPLACE_WITH_VERCEL_URL" } }
      ]]
    };
    sendTelegramMessage(chatId, welcomeMsg, keyboard);
  }
  
  // Media Pipeline
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1]; // Highest resolution
    const fileId = photo.file_id;
    const fileUrl = getTelegramFileUrl(fileId);
    
    // Log to Admin_Log
    const logSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Admin_Log');
    logSheet.appendRow([fileUrl, 'Processing...', 'No']);
    const lastRow = logSheet.getLastRow();

    // Notify received
    sendTelegramMessage(chatId, "📸 Image received! Uploading to Cloudinary...");

    // Upload to Cloudinary using Unsigned Preset
    // Cloudinary URL: https://api.cloudinary.com/v1_1/dykqic1xn/image/upload
    try {
      const cloudinaryResponse = uploadToCloudinary(fileUrl);
      const cloudinaryUrl = cloudinaryResponse.secure_url;
      
      logSheet.getRange(lastRow, 2).setValue(cloudinaryUrl);
      logSheet.getRange(lastRow, 3).setValue('Yes');
      
      sendTelegramMessage(chatId, `✅ Uploaded to Cloudinary:\n${cloudinaryUrl}`);
    } catch (e) {
      sendTelegramMessage(chatId, `❌ Cloudinary Upload Failed: ${e.message}`);
    }
  }
  
  return contentResponse({ ok: true });
}

function updateStock(items) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
  const data = getSheetData(sheet);
  
  items.forEach(item => {
    const rowIndex = data.findIndex(p => String(p.ID) === String(item.id)) + 2;
    if (rowIndex > 1) {
      const currentStock = parseInt(sheet.getRange(rowIndex, 5).getValue());
      sheet.getRange(rowIndex, 5).setValue(currentStock - item.quantity);
    }
  });
}

// Utility Helpers
function getSheetData(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}

function contentResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendTelegramMessage(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

function uploadToCloudinary(fileUrl) {
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dykqic1xn/image/upload`;
  const uploadPreset = 'ml_default'; // User needs to ensure this is set to Unsigned in Cloudinary
  
  const blob = UrlFetchApp.fetch(fileUrl).getBlob();
  const payload = {
    file: blob,
    upload_preset: uploadPreset
  };
  
  const response = UrlFetchApp.fetch(cloudinaryUrl, {
    method: 'post',
    payload: payload
  });
  
  return JSON.parse(response.getContentText());
}

function getTelegramFileUrl(fileId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
  const response = UrlFetchApp.fetch(url);
  const filePath = JSON.parse(response.getContentText()).result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}


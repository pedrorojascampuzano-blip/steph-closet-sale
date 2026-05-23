const SHEET_ID = '1JE7iBPFmE7WJ1ObTprtaLBQxlWQqixdr-f_F_4vwh6A';
const SHEET_NAME = 'Hoja1';

function corsResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return corsResponse_({ ok: true, msg: 'Closet Sale Apps Script endpoint' });
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || 'addItem';

    if (action === 'addItem') {
      const prenda = (body.prenda || '').trim();
      const marca = (body.marca || '').trim();
      const talla = (body.talla || '').trim();
      const precio = Number(body.precio || 0);
      if (!prenda || !(precio > 0)) {
        return corsResponse_({ ok: false, error: 'Faltan datos (prenda y precio son requeridos)' });
      }
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
      // Append: PRENDA | MARCA | TALLA | PRECIO | PRECIO VENTA FINAL
      sheet.appendRow([prenda, marca || '-', talla, precio, '']);
      return corsResponse_({ ok: true, action: 'addItem', row: { prenda, marca, talla, precio } });
    }

    return corsResponse_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return corsResponse_({ ok: false, error: String(err && err.message || err) });
  }
}

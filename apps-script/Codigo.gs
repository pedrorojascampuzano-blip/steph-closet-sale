const SHEET_ID = '1JE7iBPFmE7WJ1ObTprtaLBQxlWQqixdr-f_F_4vwh6A';
const SHEET_NAME = 'Hoja1';
const VTON_SPACE = 'https://yisol-idm-vton.hf.space';
const D3_SPACE = 'https://tencent-hunyuan3d-2.hf.space';
const DAILY_LIMIT = 30;

function corsResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function setProp_(k, v) { PropertiesService.getScriptProperties().setProperty(k, v); }

// Setup helper: open editor, paste your HF token, run this once, then clear the token.
function _setupHfToken() {
  const TOKEN_HERE = 'hf_PASTE_YOUR_TOKEN_HERE';
  if (TOKEN_HERE.indexOf('PASTE') >= 0) {
    throw new Error('Reemplaza TOKEN_HERE con tu HF token antes de correr.');
  }
  setProp_('HF_TOKEN', TOKEN_HERE);
  Logger.log('HF_TOKEN saved to ScriptProperties.');
}

function _readHfToken() {
  Logger.log('HF_TOKEN length: ' + getProp_('HF_TOKEN').length);
}

function checkAndIncrementLimit_(action) {
  const today = Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd');
  const key = 'limit_' + action + '_' + today;
  const count = parseInt(getProp_(key) || '0', 10);
  if (count >= DAILY_LIMIT) {
    const err = new Error('limit');
    err.isLimit = true;
    throw err;
  }
  setProp_(key, String(count + 1));
}

function uploadPublic_(base64DataUrl) {
  const m = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Invalid data URL');
  const contentType = m[1];
  const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const bytes = Utilities.base64Decode(m[2]);
  const blob = Utilities.newBlob(bytes, contentType, 'upload.' + ext);
  const r = UrlFetchApp.fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'post',
    payload: { file: blob },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 400) {
    throw new Error('Upload failed (' + r.getResponseCode() + '): ' + r.getContentText().substring(0, 200));
  }
  const body = JSON.parse(r.getContentText());
  if (!body || !body.data || !body.data.url) {
    throw new Error('Upload bad response: ' + r.getContentText().substring(0, 200));
  }
  // Convert page URL to direct DL: /w8w4637CPNyh/tiny.txt -> /dl/w8w4637CPNyh/tiny.txt
  return body.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
}

function gradioCall_(spaceUrl, endpoint, payload, maxWaitSec) {
  const hfToken = getProp_('HF_TOKEN');
  const headers = {};
  if (hfToken) headers['Authorization'] = 'Bearer ' + hfToken;
  const r1 = UrlFetchApp.fetch(spaceUrl + endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const t1 = r1.getContentText();
  let eventId;
  try { eventId = JSON.parse(t1).event_id; } catch (e) {
    throw new Error('Bad init response: ' + t1.substring(0, 200));
  }
  if (!eventId) throw new Error('No event_id: ' + t1.substring(0, 200));

  const maxIter = Math.ceil((maxWaitSec || 120) / 5);
  let lastText = '';
  for (let i = 0; i < maxIter; i++) {
    Utilities.sleep(5000);
    const r2 = UrlFetchApp.fetch(spaceUrl + endpoint + '/' + eventId, {
      headers: headers,
      muteHttpExceptions: true
    });
    lastText = r2.getContentText();
    if (lastText.indexOf('event: complete') >= 0) {
      const m = lastText.match(/event:\s*complete\s*\n\s*data:\s*([\s\S]*?)(?:\n\n|$)/);
      if (m) {
        try { return JSON.parse(m[1]); } catch (e) { return m[1]; }
      }
      return lastText;
    }
    if (lastText.indexOf('event: error') >= 0) {
      throw new Error('Gradio error: ' + lastText.substring(0, 300));
    }
  }
  throw new Error('Timeout: ' + lastText.substring(0, 200));
}

function fetchAsDataUrl_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (r.getResponseCode() >= 400) {
    throw new Error('Fetch ' + r.getResponseCode() + ' on ' + url.substring(0, 80));
  }
  const blob = r.getBlob();
  const ct = blob.getContentType() || 'application/octet-stream';
  return 'data:' + ct + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

function normalizeHfFileUrl_(url) {
  if (!url) return url;
  // Normalize Gradio temp URLs: /call/<x>/file=... -> /file=...
  return url.replace(/\/call\/[^\/]+\/file=/, '/file=');
}

function extractFirstUrl_(result) {
  if (!result) return null;
  const visit = (x) => {
    if (!x) return null;
    if (typeof x === 'string' && x.startsWith('http')) return x;
    if (Array.isArray(x)) {
      for (let i = 0; i < x.length; i++) { const r = visit(x[i]); if (r) return r; }
      return null;
    }
    if (typeof x === 'object') {
      if (typeof x.url === 'string' && x.url.startsWith('http')) return x.url;
      if (x.value) { const r = visit(x.value); if (r) return r; }
      if (typeof x.path === 'string' && x.path.startsWith('http')) return x.path;
      // Last resort: any nested key
      for (const k in x) { const r = visit(x[k]); if (r) return r; }
    }
    return null;
  };
  return visit(result);
}

function doAddItem_(body) {
  const prenda = (body.prenda || '').trim();
  const marca = (body.marca || '').trim();
  const talla = (body.talla || '').trim();
  const precio = Number(body.precio || 0);
  if (!prenda || !(precio > 0)) {
    return { ok: false, error: 'Faltan datos (prenda y precio son requeridos)' };
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  sheet.appendRow([prenda, marca || '-', talla, precio, '']);
  return { ok: true, action: 'addItem', row: { prenda, marca, talla, precio } };
}

function doTryOn_(body) {
  checkAndIncrementLimit_('tryon');
  if (!body.garment || !body.person) throw new Error('garment y person son requeridos');
  const garmentUrl = uploadPublic_(body.garment);
  const personUrl = uploadPublic_(body.person);
  const data = [
    {
      background: { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' }, orig_name: 'person.jpg' },
      layers: [],
      composite: null
    },
    { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' }, orig_name: 'garment.jpg' },
    'garment',
    true,
    false,
    30,
    42
  ];
  const result = gradioCall_(VTON_SPACE, '/call/tryon', { data: data }, 180);
  const url = normalizeHfFileUrl_(extractFirstUrl_(result));
  if (!url) throw new Error('No URL in result: ' + JSON.stringify(result).substring(0, 200));
  // HF temp URLs expire in seconds. Embed result as data URL so client can cache it.
  const dataUrl = fetchAsDataUrl_(url);
  return { ok: true, resultUrl: dataUrl };
}

function do3D_(body) {
  checkAndIncrementLimit_('_3d');
  if (!body.garment) throw new Error('garment es requerido');
  const garmentUrl = uploadPublic_(body.garment);
  const data = [
    null,
    { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' }, orig_name: 'garment.jpg' },
    null, null, null, null,
    30, 5.0, 1234, 256, true, 8000, true
  ];
  const result = gradioCall_(D3_SPACE, '/call/shape_generation', { data: data }, 180);
  const url = normalizeHfFileUrl_(extractFirstUrl_(result));
  if (!url) throw new Error('No URL in result: ' + JSON.stringify(result).substring(0, 200));
  // HF temp URLs expire fast. Embed GLB as data URL so model-viewer renders it without race.
  const dataUrl = fetchAsDataUrl_(url);
  return { ok: true, resultUrl: dataUrl };
}

function doGet(e) {
  return corsResponse_({ ok: true, msg: 'Closet Sale endpoint v2', actions: ['addItem', 'tryOn', '_3d'] });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return corsResponse_({ ok: false, error: 'No body' });
    }
    const body = JSON.parse(e.postData.contents);
    const action = body.action || 'addItem';
    let result;
    switch (action) {
      case 'addItem': result = doAddItem_(body); break;
      case 'tryOn':   result = doTryOn_(body); break;
      case '_3d':     result = do3D_(body); break;
      default: result = { ok: false, error: 'Unknown action: ' + action };
    }
    return corsResponse_(result);
  } catch (err) {
    if (err.isLimit) {
      return corsResponse_({ ok: false, error: 'limit', message: 'Límite diario alcanzado (' + DAILY_LIMIT + '). Intenta mañana.' });
    }
    return corsResponse_({ ok: false, error: String(err && err.message || err) });
  }
}

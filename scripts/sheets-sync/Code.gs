/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NAM NGÂN TRAVEL — GOOGLE SHEETS → SUPABASE SYNC (Code.gs)
 * Thay thế hoàn toàn n8n workflow cho Phase 4. Chi phí: 0đ.
 *
 * KIẾN TRÚC:
 *   Sheets (file này) ──POST + x-webhook-secret──► /api/departures/sync ──► Supabase
 *                └──────────── báo kết quả ──────► Telegram Bot
 *
 * ⚙️ CÀI ĐẶT (làm 1 lần duy nhất):
 *   1. Sheets → Extensions → Apps Script → dán toàn bộ file này → Save
 *   2. Apps Script → ⚙️ Project Settings → Script Properties → thêm 4 key:
 *        SYNC_API_URL        = https://namngantravel.com/api/departures/sync
 *        WEBHOOK_SECRET      = <cùng giá trị với Vercel env WEBHOOK_SECRET>
 *        TELEGRAM_BOT_TOKEN  = <token bot — cùng bot đang notify lead>
 *        TELEGRAM_CHAT_ID    = <chat id nhận thông báo>
 *      (Dùng Script Properties để KHÔNG hardcode secret vào code)
 *   3. Chạy hàm `setupDailyTrigger` 1 lần (chọn hàm trên toolbar → Run)
 *      → cấp quyền khi Google hỏi → trigger 2h sáng đã được cài.
 *   4. Reload file Sheets → menu "🔄 Nam Ngân Sync" xuất hiện trên toolbar.
 *
 * 📋 CẤU TRÚC SHEET (tab tên "tour_schedules", hàng 1 là header):
 *   A:code | B:departure_date | C:return_date | D:price_adult | E:price_child
 *   F:slots_total | G:slots_booked | H:flight_code_departure
 *   I:flight_code_return | J:status (open|full|cancelled|completed)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────

var CONFIG = {
  SHEET_NAME: 'tour_schedules',
  HEADER_ROW: 1,
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  MAX_ROWS: 2000,
  HTTP_TIMEOUT_RETRIES: 1, // retry 1 lần nếu API lỗi mạng
  VALID_STATUS: ['open', 'full', 'cancelled', 'completed'],
  // Thứ tự cột phải khớp header A→J trong Sheets
  COLUMNS: [
    'code',
    'departure_date',
    'return_date',
    'price_adult',
    'price_child',
    'slots_total',
    'slots_booked',
    'flight_code_departure',
    'flight_code_return',
    'status',
  ],
};

// ─── 1. MENU THỦ CÔNG TRÊN SHEETS ───────────────────────────────────────────

/** Tự chạy mỗi khi mở file Sheets — tạo menu trên toolbar */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Nam Ngân Sync')
    .addItem('Đồng bộ lịch khởi hành ngay', 'manualSync')
    .addSeparator()
    .addItem('Kiểm tra cấu hình', 'checkConfig')
    .addToUi();
}

/** Sync thủ công từ menu — có hiển thị kết quả ngay trên Sheets */
function manualSync() {
  var result = runSync('manual');
  var ui = SpreadsheetApp.getUi();
  if (result.ok) {
    ui.alert(
      '✅ Đồng bộ thành công',
      'Synced: ' + result.synced + ' dòng\n' +
        'Skipped (mã tour lạ): ' + result.skipped + '\n' +
        'Lỗi định dạng tại Sheets: ' + result.localErrors + '\n\n' +
        'Chi tiết đã gửi về Telegram.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('🚨 Đồng bộ thất bại', result.error, ui.ButtonSet.OK);
  }
}

/** Sync tự động — gọi bởi time trigger, không có UI */
function scheduledSync() {
  runSync('scheduled');
}

// ─── 2. TRIGGER 2H SÁNG (chạy setupDailyTrigger 1 LẦN duy nhất) ─────────────

function setupDailyTrigger() {
  // Xóa trigger cũ trùng tên trước — tránh cài đúp chạy 2 lần
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'scheduledSync') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('scheduledSync')
    .timeBased()
    .atHour(2) // 2h sáng theo timezone của script
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  Logger.log('✅ Đã cài trigger scheduledSync chạy 2h sáng hàng ngày (giờ VN)');
}

// ─── 3. LUỒNG SYNC CHÍNH ─────────────────────────────────────────────────────

/**
 * @param {string} mode 'manual' | 'scheduled'
 * @return {{ok: boolean, synced: number, skipped: number, localErrors: number, error: string}}
 */
function runSync(mode) {
  var out = { ok: false, synced: 0, skipped: 0, localErrors: 0, error: '' };

  try {
    var props = getRequiredProps_();

    // 3.1 — Đọc + chuẩn hóa dữ liệu từ Sheets
    var normalized = readAndNormalizeRows_();
    out.localErrors = normalized.errors.length;

    if (normalized.rows.length === 0) {
      out.error =
        'Không có dòng hợp lệ nào trong sheet "' + CONFIG.SHEET_NAME + '".\n' +
        firstErrorsText_(normalized.errors);
      notifyTelegram_(props, buildFailMessage_(mode, out.error));
      return out;
    }

    // 3.2 — POST sang API (retry 1 lần nếu lỗi mạng)
    var apiResult = postToApi_(props, normalized.rows);
    if (!apiResult.ok) {
      out.error = apiResult.error;
      notifyTelegram_(props, buildFailMessage_(mode, out.error));
      return out;
    }

    // 3.3 — Thành công → báo Telegram
    out.ok = true;
    out.synced = apiResult.body.synced_count || 0;
    out.skipped = apiResult.body.skipped_count || 0;

    var msg =
      '✅ ĐỒNG BỘ LỊCH KHỞI HÀNH THÀNH CÔNG (' + modeLabel_(mode) + ')\n' +
      '— Synced: ' + out.synced + ' dòng\n' +
      '— Skipped (mã tour lạ): ' + out.skipped +
      (apiResult.body.skipped_codes && apiResult.body.skipped_codes.length
        ? '\n— Codes: ' + apiResult.body.skipped_codes.join(', ')
        : '') +
      '\n— Lỗi định dạng tại Sheets: ' + out.localErrors +
      (out.localErrors > 0 ? '\n' + firstErrorsText_(normalized.errors) : '');
    notifyTelegram_(props, msg);

    return out;
  } catch (err) {
    out.error = err && err.message ? err.message : String(err);
    try {
      notifyTelegram_(getRequiredProps_(), buildFailMessage_(mode, out.error));
    } catch (ignored) {}
    Logger.log('🚨 runSync error: ' + out.error);
    return out;
  }
}

// ─── 4. ĐỌC + CHUẨN HÓA (port từ node "Normalize Rows" của n8n) ─────────────

/**
 * Khác n8n: Apps Script getValues() trả Date object cho ô ngày
 * và number thật cho ô số đã định dạng — nên phải xử lý cả 3 kiểu:
 * Date object | number | string ("15/07/2026", "14.990.000").
 */
function readAndNormalizeRows_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEET_NAME
  );
  if (!sheet) {
    throw new Error('Không tìm thấy tab "' + CONFIG.SHEET_NAME + '"');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) {
    return { rows: [], errors: [{ row: '-', problems: ['Sheet trống'] }] };
  }

  var numRows = Math.min(lastRow - CONFIG.HEADER_ROW, CONFIG.MAX_ROWS);
  var values = sheet
    .getRange(CONFIG.HEADER_ROW + 1, 1, numRows, CONFIG.COLUMNS.length)
    .getValues();

  var rows = [];
  var errors = [];

  for (var i = 0; i < values.length; i++) {
    var raw = {};
    for (var c = 0; c < CONFIG.COLUMNS.length; c++) {
      raw[CONFIG.COLUMNS[c]] = values[i][c];
    }

    var code = String(raw.code || '').trim();
    if (!code) continue; // dòng trống — bỏ qua im lặng

    var rowNum = CONFIG.HEADER_ROW + 1 + i; // số dòng thật trên Sheets
    var problems = [];

    var departureDate = toIsoDate_(raw.departure_date);
    var returnDate = toIsoDate_(raw.return_date);
    var priceAdult = toNumber_(raw.price_adult);
    var priceChild = toNumber_(raw.price_child);
    var slotsTotal = toNumber_(raw.slots_total);
    var slotsBooked = toNumber_(raw.slots_booked);
    var status = String(raw.status || '').trim().toLowerCase();

    if (!departureDate) problems.push('departure_date sai định dạng');
    if (!returnDate) problems.push('return_date sai định dạng');
    if (priceAdult === null) problems.push('price_adult không phải số');
    if (priceChild === null) problems.push('price_child không phải số');
    if (slotsTotal === null) problems.push('slots_total không phải số');
    if (slotsBooked === null) problems.push('slots_booked không phải số');
    if (CONFIG.VALID_STATUS.indexOf(status) === -1) {
      problems.push('status "' + status + '" không hợp lệ');
    }
    // Business rules — khớp Zod refinements phía API
    if (slotsTotal !== null && slotsBooked !== null && slotsBooked > slotsTotal) {
      problems.push('slots_booked > slots_total');
    }
    if (departureDate && returnDate && returnDate < departureDate) {
      problems.push('return_date < departure_date');
    }

    if (problems.length > 0) {
      errors.push({ row: rowNum, code: code, problems: problems });
      continue; // 1 dòng hỏng không chặn cả batch
    }

    var row = {
      code: code,
      departure_date: departureDate,
      return_date: returnDate,
      price_adult: Math.round(priceAdult),
      price_child: Math.round(priceChild),
      slots_total: Math.round(slotsTotal),
      slots_booked: Math.round(slotsBooked),
      status: status,
    };
    var fcd = String(raw.flight_code_departure || '').trim();
    var fcr = String(raw.flight_code_return || '').trim();
    if (fcd) row.flight_code_departure = fcd;
    if (fcr) row.flight_code_return = fcr;

    rows.push(row);
  }

  return { rows: rows, errors: errors };
}

/** "14.990.000" / "14,990,000" / 14990000 → 14990000 | null nếu hỏng */
function toNumber_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (v === null || v === undefined || v === '') return null;
  var cleaned = String(v).replace(/[.,\s]/g, '');
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;
  var n = Number(cleaned);
  return isFinite(n) ? n : null;
}

/** Date object | "15/07/2026" | "2026-07-15" → "2026-07-15" | null nếu hỏng */
function toIsoDate_(v) {
  if (v === null || v === undefined || v === '') return null;

  // Ô ngày trong Sheets → Apps Script trả Date object
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return null;
    return Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }

  var s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    var d = ('0' + m[1]).slice(-2);
    var mo = ('0' + m[2]).slice(-2);
    return m[3] + '-' + mo + '-' + d;
  }
  return null;
}

// ─── 5. GỌI API SYNC (kèm x-webhook-secret) ─────────────────────────────────

function postToApi_(props, rows) {
  var payload = JSON.stringify({ tour_schedules: rows });
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': props.WEBHOOK_SECRET },
    payload: payload,
    muteHttpExceptions: true,
  };

  var attempts = 1 + CONFIG.HTTP_TIMEOUT_RETRIES;
  var lastError = '';

  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      var res = UrlFetchApp.fetch(props.SYNC_API_URL, options);
      var status = res.getResponseCode();
      var bodyText = res.getContentText();
      var body = {};
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        body = {};
      }

      if (status === 200 && body.success === true) {
        return { ok: true, body: body };
      }

      // Lỗi nghiệp vụ (401/422/500) — không retry, báo luôn
      var detail =
        body.error ||
        (body.issues ? JSON.stringify(body.issues).slice(0, 800) : bodyText.slice(0, 800));
      return {
        ok: false,
        error: 'API trả HTTP ' + status + ': ' + detail,
      };
    } catch (netErr) {
      lastError = netErr && netErr.message ? netErr.message : String(netErr);
      if (attempt < attempts) Utilities.sleep(3000);
    }
  }

  return { ok: false, error: 'Lỗi mạng sau ' + attempts + ' lần thử: ' + lastError };
}

// ─── 6. TELEGRAM ─────────────────────────────────────────────────────────────

function notifyTelegram_(props, text) {
  try {
    UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + props.TELEGRAM_BOT_TOKEN + '/sendMessage',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: props.TELEGRAM_CHAT_ID,
          text: text.slice(0, 4000),
        }),
        muteHttpExceptions: true,
      }
    );
  } catch (err) {
    Logger.log('⚠️ Không gửi được Telegram: ' + err);
  }
}

// ─── 7. HELPERS ──────────────────────────────────────────────────────────────

function getRequiredProps_() {
  var p = PropertiesService.getScriptProperties();
  var props = {
    SYNC_API_URL: p.getProperty('SYNC_API_URL'),
    WEBHOOK_SECRET: p.getProperty('WEBHOOK_SECRET'),
    TELEGRAM_BOT_TOKEN: p.getProperty('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: p.getProperty('TELEGRAM_CHAT_ID'),
  };
  var missing = Object.keys(props).filter(function (k) {
    return !props[k];
  });
  if (missing.length > 0) {
    throw new Error(
      'Thiếu Script Properties: ' + missing.join(', ') +
        ' — vào Project Settings → Script Properties để thêm.'
    );
  }
  return props;
}

function checkConfig() {
  var ui = SpreadsheetApp.getUi();
  try {
    getRequiredProps_();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      CONFIG.SHEET_NAME
    );
    if (!sheet) {
      ui.alert('⚠️ Thiếu tab "' + CONFIG.SHEET_NAME + '" trong file này.');
      return;
    }
    var triggers = ScriptApp.getProjectTriggers().filter(function (t) {
      return t.getHandlerFunction() === 'scheduledSync';
    });
    ui.alert(
      '✅ Cấu hình OK',
      '— 4 Script Properties: đầy đủ\n' +
        '— Tab "' + CONFIG.SHEET_NAME + '": tồn tại (' +
        Math.max(sheet.getLastRow() - CONFIG.HEADER_ROW, 0) + ' dòng dữ liệu)\n' +
        '— Trigger 2h sáng: ' +
        (triggers.length > 0 ? 'đã cài' : 'CHƯA CÀI — chạy setupDailyTrigger'),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('🚨 Lỗi cấu hình', String(err.message || err), ui.ButtonSet.OK);
  }
}

function buildFailMessage_(mode, error) {
  return (
    '🚨 ĐỒNG BỘ LỊCH KHỞI HÀNH THẤT BẠI (' + modeLabel_(mode) + ')\n' +
    '— Lỗi: ' + error + '\n\n' +
    '👉 Kiểm tra Google Sheets hoặc Vercel logs /api/departures/sync'
  );
}

function modeLabel_(mode) {
  return mode === 'scheduled' ? 'Tự động 2h sáng' : 'Thủ công';
}

function firstErrorsText_(errors) {
  if (!errors || errors.length === 0) return '';
  return errors
    .slice(0, 5)
    .map(function (e) {
      return '• Dòng ' + e.row + (e.code ? ' [' + e.code + ']' : '') + ': ' +
        e.problems.join(', ');
    })
    .join('\n') + (errors.length > 5 ? '\n…và ' + (errors.length - 5) + ' lỗi khác' : '');
}

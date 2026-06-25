/**
 * TriStar Baseball — Google Sheets backend.
 * Paste this into Extensions > Apps Script of your Google Sheet, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Copy the deployment URL into NEXT_PUBLIC_SHEETS_WEBAPP_URL in the app's env.
 */

var PLAYERS_SHEET = "Players";
var ENTRIES_SHEET = "Entries";
var METRICS_SHEET = "Metrics";
var DRILLS_SHEET = "Drills";
var DRILL_CATEGORIES_SHEET = "DrillCategories";

// Posts a message to the team GroupMe via a Bot (https://dev.groupme.com/bots).
// Set the bot id once via Project Settings > Script Properties > GROUPME_BOT_ID.
// No-op (silently) if the property isn't set, so this never blocks saves.
function notifyGroupMe_(text) {
  var botId = PropertiesService.getScriptProperties().getProperty("GROUPME_BOT_ID");
  if (!botId) {
    Logger.log("notifyGroupMe_: no GROUPME_BOT_ID script property set, skipping");
    return;
  }
  botId = botId.replace(/[^a-zA-Z0-9]/g, "");
  var payload = JSON.stringify({ bot_id: botId, text: text });
  Logger.log("notifyGroupMe_: botId=[" + botId + "] len=" + botId.length + " payload=" + payload);
  try {
    var resp = UrlFetchApp.fetch("https://api.groupme.com/v3/bots/post", {
      method: "post",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true,
    });
    Logger.log("notifyGroupMe_: status=" + resp.getResponseCode() + " body=" + resp.getContentText());
  } catch (err) {
    Logger.log("notifyGroupMe_: error " + err);
  }
}

// Run this manually from the Apps Script editor (select function, click Run)
// to test the GroupMe bot in isolation and trigger any auth prompts.
function testGroupMeNotify() {
  notifyGroupMe_("Test message from Apps Script 🧪");
}

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

// Columns are looked up by header name rather than fixed position, and
// missing columns are created on the fly — sheets that predate a given
// column (e.g. an older Players sheet without "Number") self-heal the
// first time they're read or written, no manual migration required.
function ensureColumn_(sheet, header) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = headers.indexOf(header);
  if (idx !== -1) return idx + 1;
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(header);
  return col;
}

function backfillIds_(sheet) {
  var idCol = ensureColumn_(sheet, "Id");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (!data[i][idCol - 1]) {
      sheet.getRange(i + 1, idCol).setValue(newId_());
    }
  }
}

// "Date" is kept as plain text so Sheets doesn't auto-convert it to a Date
// cell, which would otherwise shift the day when read back across timezones.
function setCell_(sheet, row, col, header, value) {
  var cell = sheet.getRange(row, col);
  if (header === "Date") cell.setNumberFormat("@");
  cell.setValue(value);
}

function appendRowByHeaders_(sheet, valuesByHeader) {
  var row = sheet.getLastRow() + 1;
  Object.keys(valuesByHeader).forEach(function (header) {
    var col = ensureColumn_(sheet, header);
    setCell_(sheet, row, col, header, valuesByHeader[header]);
  });
}

function setRowByHeaders_(sheet, row, valuesByHeader) {
  Object.keys(valuesByHeader).forEach(function (header) {
    var col = ensureColumn_(sheet, header);
    setCell_(sheet, row, col, header, valuesByHeader[header]);
  });
}

function playersSheet_() {
  var sheet = getSheet_(PLAYERS_SHEET, ["Id", "Name", "Number", "Position", "CreatedAt"]);
  ensureColumn_(sheet, "Id");
  ensureColumn_(sheet, "Name");
  ensureColumn_(sheet, "Number");
  ensureColumn_(sheet, "Position");
  ensureColumn_(sheet, "CreatedAt");
  backfillIds_(sheet);
  return sheet;
}

function entriesSheet_() {
  var sheet = getSheet_(ENTRIES_SHEET, [
    "Id",
    "Timestamp",
    "Date",
    "Player",
    "SprintTimes",
    "ThrowVelos",
    "Notes",
  ]);
  backfillIds_(sheet);
  return sheet;
}

function metricsSheet_() {
  var sheet = getSheet_(METRICS_SHEET, ["Id", "Timestamp", "Date", "Player", "Metric", "Value"]);
  backfillIds_(sheet);
  return sheet;
}

function drillsSheet_() {
  var sheet = getSheet_(DRILLS_SHEET, [
    "Id",
    "Name",
    "Description",
    "VideoUrl",
    "Category",
    "Order",
    "CreatedAt",
  ]);
  ensureColumn_(sheet, "Category");
  ensureColumn_(sheet, "Order");
  backfillIds_(sheet);
  return sheet;
}

function drillCategoriesSheet_() {
  var sheet = getSheet_(DRILL_CATEGORIES_SHEET, ["Id", "Name", "Order", "CreatedAt"]);
  backfillIds_(sheet);
  return sheet;
}

// Returns the next Order value to append an item at the end of a list,
// where existingOrders is the set of Order values already in use.
function nextOrder_(existingOrders) {
  var max = -1;
  existingOrders.forEach(function (o) {
    var n = Number(o);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function newId_() {
  return Utilities.getUuid();
}

function ensurePlayer_(name, position, number) {
  var sheet = playersSheet_();
  var nameCol = ensureColumn_(sheet, "Name");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][nameCol - 1]).trim().toLowerCase() === name.trim().toLowerCase()) {
      return;
    }
  }
  appendRowByHeaders_(sheet, {
    Id: newId_(),
    Name: name,
    Number: number || "",
    Position: position || "",
    CreatedAt: new Date().toISOString(),
  });
}

function rowsToObjects_(data) {
  var headers = data[0];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j];
    out.push(obj);
  }
  return out;
}

function findRowById_(sheet, id) {
  var idCol = ensureColumn_(sheet, "Id");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol - 1]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function doGet(e) {
  var action = e.parameter.action;
  var result;
  if (action === "players") {
    result = rowsToObjects_(playersSheet_().getDataRange().getValues());
  } else if (action === "entries") {
    var all = rowsToObjects_(entriesSheet_().getDataRange().getValues());
    if (e.parameter.player) {
      var p = e.parameter.player.trim().toLowerCase();
      all = all.filter(function (row) {
        return String(row.Player).trim().toLowerCase() === p;
      });
    }
    result = all;
  } else if (action === "metrics") {
    var allMetrics = rowsToObjects_(metricsSheet_().getDataRange().getValues());
    if (e.parameter.player) {
      var mp = e.parameter.player.trim().toLowerCase();
      allMetrics = allMetrics.filter(function (row) {
        return String(row.Player).trim().toLowerCase() === mp;
      });
    }
    result = allMetrics;
  } else if (action === "drills") {
    result = rowsToObjects_(drillsSheet_().getDataRange().getValues());
  } else if (action === "drillCategories") {
    result = rowsToObjects_(drillCategoriesSheet_().getDataRange().getValues());
  } else {
    result = { error: "unknown action" };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function appendEntry_(sheet, entry) {
  var id = newId_();
  appendRowByHeaders_(sheet, {
    Id: id,
    Timestamp: new Date().toISOString(),
    Date: entry.date,
    Player: entry.player,
    SprintTimes: (entry.sprintTimes || []).join(","),
    ThrowVelos: (entry.throwVelos || []).join(","),
    Notes: entry.notes || "",
  });
  return id;
}

function appendMetric_(sheet, m) {
  var id = newId_();
  appendRowByHeaders_(sheet, {
    Id: id,
    Timestamp: new Date().toISOString(),
    Date: m.date,
    Player: m.player,
    Metric: m.metric,
    Value: m.value,
  });
  return id;
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result;

  if (body.action === "addPlayer") {
    ensurePlayer_(body.name, body.position, body.number);
    result = { ok: true };
  } else if (body.action === "updatePlayer") {
    var pSheet = playersSheet_();
    var pRow = findRowById_(pSheet, body.id);
    if (pRow === -1) {
      result = { error: "player not found" };
    } else {
      var pUpdates = {};
      if (body.name !== undefined) pUpdates.Name = body.name;
      if (body.number !== undefined) pUpdates.Number = body.number;
      if (body.position !== undefined) pUpdates.Position = body.position;
      setRowByHeaders_(pSheet, pRow, pUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deletePlayer") {
    var pSheet2 = playersSheet_();
    var pRow2 = findRowById_(pSheet2, body.id);
    if (pRow2 === -1) {
      result = { error: "player not found" };
    } else {
      pSheet2.deleteRow(pRow2);
      result = { ok: true };
    }
  } else if (body.action === "addEntry") {
    ensurePlayer_(body.player);
    var id1 = appendEntry_(entriesSheet_(), body);
    result = { ok: true, id: id1 };
  } else if (body.action === "bulkEntries") {
    var sheet = entriesSheet_();
    body.entries.forEach(function (entry) {
      ensurePlayer_(entry.player);
      appendEntry_(sheet, entry);
    });
    result = { ok: true, count: body.entries.length };
  } else if (body.action === "updateEntry") {
    var eSheet = entriesSheet_();
    var eRow = findRowById_(eSheet, body.id);
    if (eRow === -1) {
      result = { error: "entry not found" };
    } else {
      var eUpdates = {};
      if (body.date !== undefined) eUpdates.Date = body.date;
      if (body.player !== undefined) eUpdates.Player = body.player;
      if (body.sprintTimes !== undefined) eUpdates.SprintTimes = body.sprintTimes.join(",");
      if (body.throwVelos !== undefined) eUpdates.ThrowVelos = body.throwVelos.join(",");
      if (body.notes !== undefined) eUpdates.Notes = body.notes;
      setRowByHeaders_(eSheet, eRow, eUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deleteEntry") {
    var eSheet2 = entriesSheet_();
    var eRow2 = findRowById_(eSheet2, body.id);
    if (eRow2 === -1) {
      result = { error: "entry not found" };
    } else {
      eSheet2.deleteRow(eRow2);
      result = { ok: true };
    }
  } else if (body.action === "addMetric") {
    ensurePlayer_(body.player);
    var id2 = appendMetric_(metricsSheet_(), body);
    result = { ok: true, id: id2 };
  } else if (body.action === "bulkMetrics") {
    var mSheet = metricsSheet_();
    body.entries.forEach(function (m) {
      ensurePlayer_(m.player);
      appendMetric_(mSheet, m);
    });
    if (body.entries.length) {
      notifyGroupMe_(
        body.entries[0].player +
          " just logged their Daily Work 💪\nLog yours too here: http://bit.ly/3SK1EK6"
      );
    }
    result = { ok: true, count: body.entries.length };
  } else if (body.action === "updateMetric") {
    var mRow = findRowById_(metricsSheet_(), body.id);
    if (mRow === -1) {
      result = { error: "metric not found" };
    } else {
      var mS = metricsSheet_();
      var mUpdates = {};
      if (body.date !== undefined) mUpdates.Date = body.date;
      if (body.metric !== undefined) mUpdates.Metric = body.metric;
      if (body.value !== undefined) mUpdates.Value = body.value;
      setRowByHeaders_(mS, mRow, mUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deleteMetric") {
    var mSheet2 = metricsSheet_();
    var mRow2 = findRowById_(mSheet2, body.id);
    if (mRow2 === -1) {
      result = { error: "metric not found" };
    } else {
      mSheet2.deleteRow(mRow2);
      result = { ok: true };
    }
  } else if (body.action === "addDrill") {
    var newDrillCategory = body.category || "";
    var dCol = ensureColumn_(drillsSheet_(), "Category");
    var oCol = ensureColumn_(drillsSheet_(), "Order");
    var existingDrillData = drillsSheet_().getDataRange().getValues();
    var sameCategoryOrders = [];
    for (var di = 1; di < existingDrillData.length; di++) {
      if (String(existingDrillData[di][dCol - 1]) === String(newDrillCategory)) {
        sameCategoryOrders.push(existingDrillData[di][oCol - 1]);
      }
    }
    appendRowByHeaders_(drillsSheet_(), {
      Id: newId_(),
      Name: body.name,
      Description: body.description || "",
      VideoUrl: body.videoUrl,
      Category: newDrillCategory,
      Order: nextOrder_(sameCategoryOrders),
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "updateDrill") {
    var dSheet = drillsSheet_();
    var dRow = findRowById_(dSheet, body.id);
    if (dRow === -1) {
      result = { error: "drill not found" };
    } else {
      var dUpdates = {};
      if (body.name !== undefined) dUpdates.Name = body.name;
      if (body.description !== undefined) dUpdates.Description = body.description;
      if (body.videoUrl !== undefined) dUpdates.VideoUrl = body.videoUrl;
      if (body.category !== undefined) dUpdates.Category = body.category;
      if (body.order !== undefined) dUpdates.Order = body.order;
      setRowByHeaders_(dSheet, dRow, dUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deleteDrill") {
    var dSheet2 = drillsSheet_();
    var dRow2 = findRowById_(dSheet2, body.id);
    if (dRow2 === -1) {
      result = { error: "drill not found" };
    } else {
      dSheet2.deleteRow(dRow2);
      result = { ok: true };
    }
  } else if (body.action === "reorderDrills") {
    var rSheet = drillsSheet_();
    (body.order || []).forEach(function (item) {
      var rRow = findRowById_(rSheet, item.id);
      if (rRow !== -1) {
        setRowByHeaders_(rSheet, rRow, { Category: item.category || "", Order: item.order });
      }
    });
    result = { ok: true };
  } else if (body.action === "addCategory") {
    var cSheet = drillCategoriesSheet_();
    var cData = cSheet.getDataRange().getValues();
    var cOrderCol = ensureColumn_(cSheet, "Order");
    var cOrders = [];
    for (var ci = 1; ci < cData.length; ci++) cOrders.push(cData[ci][cOrderCol - 1]);
    appendRowByHeaders_(cSheet, {
      Id: newId_(),
      Name: body.name,
      Order: nextOrder_(cOrders),
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "updateCategory") {
    var ucSheet = drillCategoriesSheet_();
    var ucRow = findRowById_(ucSheet, body.id);
    if (ucRow === -1) {
      result = { error: "category not found" };
    } else {
      var ucUpdates = {};
      if (body.name !== undefined) ucUpdates.Name = body.name;
      setRowByHeaders_(ucSheet, ucRow, ucUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deleteCategory") {
    var dcSheet = drillCategoriesSheet_();
    var dcRow = findRowById_(dcSheet, body.id);
    if (dcRow === -1) {
      result = { error: "category not found" };
    } else {
      dcSheet.deleteRow(dcRow);
      var ddSheet = drillsSheet_();
      var ddData = ddSheet.getDataRange().getValues();
      var ddCatCol = ensureColumn_(ddSheet, "Category");
      for (var ddi = 1; ddi < ddData.length; ddi++) {
        if (String(ddData[ddi][ddCatCol - 1]) === String(body.id)) {
          setCell_(ddSheet, ddi + 1, ddCatCol, "Category", "");
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "reorderCategories") {
    var rcSheet = drillCategoriesSheet_();
    (body.order || []).forEach(function (catId, idx) {
      var rcRow = findRowById_(rcSheet, catId);
      if (rcRow !== -1) {
        setRowByHeaders_(rcSheet, rcRow, { Order: idx });
      }
    });
    result = { ok: true };
  } else {
    result = { error: "unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

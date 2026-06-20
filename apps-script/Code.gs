/**
 * TriStar Baseball — Google Sheets backend.
 * Paste this into Extensions > Apps Script of your Google Sheet, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Copy the deployment URL into NEXT_PUBLIC_SHEETS_WEBAPP_URL in the app's env.
 */

var PLAYERS_SHEET = "Players";
var ENTRIES_SHEET = "Entries";
var METRICS_SHEET = "Metrics";

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function playersSheet_() {
  return getSheet_(PLAYERS_SHEET, ["Id", "Name", "Position", "Photo", "CreatedAt"]);
}

function entriesSheet_() {
  return getSheet_(ENTRIES_SHEET, [
    "Id",
    "Timestamp",
    "Date",
    "Player",
    "SprintTimes",
    "ThrowVelos",
    "Notes",
  ]);
}

function metricsSheet_() {
  return getSheet_(METRICS_SHEET, ["Id", "Timestamp", "Date", "Player", "Metric", "Value"]);
}

function newId_() {
  return Utilities.getUuid();
}

/**
 * One-time migration: run this manually from the Apps Script editor
 * (select migrate_ in the function dropdown, click Run) after pasting
 * this updated code, if your Players/Entries/Metrics sheets predate the
 * Id/Photo columns. Safe to run more than once.
 */
function migrate_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var players = ss.getSheetByName(PLAYERS_SHEET);
  if (players) {
    var pHeaders = players.getRange(1, 1, 1, players.getLastColumn()).getValues()[0];
    if (pHeaders[0] !== "Id") {
      players.insertColumnBefore(1);
      players.getRange(1, 1).setValue("Id");
      var pRows = players.getLastRow();
      for (var i = 2; i <= pRows; i++) {
        players.getRange(i, 1).setValue(newId_());
      }
    }
    var pHeaders2 = players.getRange(1, 1, 1, players.getLastColumn()).getValues()[0];
    if (pHeaders2.indexOf("Photo") === -1) {
      var createdAtCol = pHeaders2.indexOf("CreatedAt") + 1;
      var insertAt = createdAtCol > 0 ? createdAtCol : players.getLastColumn() + 1;
      players.insertColumnBefore(insertAt);
      players.getRange(1, insertAt).setValue("Photo");
    }
  }

  var entries = ss.getSheetByName(ENTRIES_SHEET);
  if (entries) {
    var eHeaders = entries.getRange(1, 1, 1, entries.getLastColumn()).getValues()[0];
    if (eHeaders[0] !== "Id") {
      entries.insertColumnBefore(1);
      entries.getRange(1, 1).setValue("Id");
      var eRows = entries.getLastRow();
      for (var j = 2; j <= eRows; j++) {
        entries.getRange(j, 1).setValue(newId_());
      }
    }
  }

  metricsSheet_(); // creates Metrics sheet with headers if missing
}

function ensurePlayer_(name, position, photo) {
  var sheet = playersSheet_();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === name.trim().toLowerCase()) {
      return;
    }
  }
  sheet.appendRow([newId_(), name, position || "", photo || "", new Date().toISOString()]);
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
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
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
  } else {
    result = { error: "unknown action" };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function appendEntry_(sheet, entry) {
  var id = newId_();
  sheet.appendRow([
    id,
    new Date().toISOString(),
    entry.date,
    entry.player,
    (entry.sprintTimes || []).join(","),
    (entry.throwVelos || []).join(","),
    entry.notes || "",
  ]);
  return id;
}

function appendMetric_(sheet, m) {
  var id = newId_();
  sheet.appendRow([id, new Date().toISOString(), m.date, m.player, m.metric, m.value]);
  return id;
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result;

  if (body.action === "addPlayer") {
    ensurePlayer_(body.name, body.position, body.photo);
    result = { ok: true };
  } else if (body.action === "updatePlayer") {
    var pSheet = playersSheet_();
    var pRow = findRowById_(pSheet, body.id);
    if (pRow === -1) {
      result = { error: "player not found" };
    } else {
      if (body.name !== undefined) pSheet.getRange(pRow, 2).setValue(body.name);
      if (body.position !== undefined) pSheet.getRange(pRow, 3).setValue(body.position);
      if (body.photo !== undefined) pSheet.getRange(pRow, 4).setValue(body.photo);
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
      if (body.date !== undefined) eSheet.getRange(eRow, 3).setValue(body.date);
      if (body.player !== undefined) eSheet.getRange(eRow, 4).setValue(body.player);
      if (body.sprintTimes !== undefined)
        eSheet.getRange(eRow, 5).setValue(body.sprintTimes.join(","));
      if (body.throwVelos !== undefined)
        eSheet.getRange(eRow, 6).setValue(body.throwVelos.join(","));
      if (body.notes !== undefined) eSheet.getRange(eRow, 7).setValue(body.notes);
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
    result = { ok: true, count: body.entries.length };
  } else if (body.action === "updateMetric") {
    var mRow = findRowById_(metricsSheet_(), body.id);
    if (mRow === -1) {
      result = { error: "metric not found" };
    } else {
      var mS = metricsSheet_();
      if (body.date !== undefined) mS.getRange(mRow, 3).setValue(body.date);
      if (body.metric !== undefined) mS.getRange(mRow, 5).setValue(body.metric);
      if (body.value !== undefined) mS.getRange(mRow, 6).setValue(body.value);
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
  } else {
    result = { error: "unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

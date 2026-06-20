/**
 * TriStar Baseball — Google Sheets backend.
 * Paste this into Extensions > Apps Script of your Google Sheet, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Copy the deployment URL into NEXT_PUBLIC_SHEETS_WEBAPP_URL in the app's env.
 */

var PLAYERS_SHEET = "Players";
var ENTRIES_SHEET = "Entries";

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
  return getSheet_(PLAYERS_SHEET, ["Name", "Position", "CreatedAt"]);
}

function entriesSheet_() {
  return getSheet_(ENTRIES_SHEET, [
    "Timestamp",
    "Date",
    "Player",
    "SprintTimes",
    "ThrowVelos",
    "Notes",
  ]);
}

function ensurePlayer_(name, position) {
  var sheet = playersSheet_();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === name.trim().toLowerCase()) {
      return;
    }
  }
  sheet.appendRow([name, position || "", new Date().toISOString()]);
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
  } else {
    result = { error: "unknown action" };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function appendEntry_(sheet, entry) {
  sheet.appendRow([
    new Date().toISOString(),
    entry.date,
    entry.player,
    (entry.sprintTimes || []).join(","),
    (entry.throwVelos || []).join(","),
    entry.notes || "",
  ]);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result;

  if (body.action === "addPlayer") {
    ensurePlayer_(body.name, body.position);
    result = { ok: true };
  } else if (body.action === "addEntry") {
    ensurePlayer_(body.player);
    appendEntry_(entriesSheet_(), body);
    result = { ok: true };
  } else if (body.action === "bulkEntries") {
    var sheet = entriesSheet_();
    body.entries.forEach(function (entry) {
      ensurePlayer_(entry.player);
      appendEntry_(sheet, entry);
    });
    result = { ok: true, count: body.entries.length };
  } else {
    result = { error: "unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

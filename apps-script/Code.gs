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
var FOOTAGE_SHEET = "Footage";
var FOOTAGE_NOTES_SHEET = "FootageNotes";
var PRACTICE_PLAN_DRILLS_SHEET = "PracticePlanDrills";
var PRACTICE_PLANS_SHEET = "PracticePlans";
var PRACTICE_PLAN_ITEMS_SHEET = "PracticePlanItems";
var PRACTICE_PLAN_CATEGORIES_SHEET = "PracticePlanCategories";
var TRIVIA_RESPONSES_SHEET = "TriviaResponses";
var FUNDRAISER_SALES_SHEET = "FundraiserSales";
var PLAYER_PROFILES_SHEET = "PlayerProfiles";
var MUMS_COLORS_SHEET = "MumsColors";
var PITCH_LOG_SHEET = "PitchLog";
var MERCH_ORDERS_SHEET = "MerchOrders";
var HOMEWORK_SHEET = "Homework";
var HOMEWORK_COMPLETIONS_SHEET = "HomeworkCompletions";
var ASSIGNMENT_TEMPLATES_SHEET = "AssignmentTemplates";
var ASSIGNMENTS_SHEET = "Assignments";
var PRACTICE_SESSIONS_SHEET = "PracticeSessions";
var PRACTICE_ATTENDANCE_SHEET = "PracticeAttendance";
var TRYOUTS_SHEET = "Tryouts";
var TRYOUT_ENTRIES_SHEET = "TryoutEntries";
var DRILL_VIDEOS_FOLDER = "TriStar Drill Videos";

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

// Run this manually from the Apps Script editor to authorize the Drive scope
// required by initDriveUpload. Select this function in the dropdown, click Run,
// and approve the permissions dialog.
function authorizeOAuth() {
  DriveApp.getRootFolder(); // triggers Drive scope authorization
  var token = ScriptApp.getOAuthToken();
  Logger.log("OAuth OK: " + token.slice(0, 20) + "...");
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
  ensureColumn_(sheet, "Status");
  backfillIds_(sheet);
  // Backfill Status = "active" for any row that has no value
  var statusCol = ensureColumn_(sheet, "Status");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (!data[i][statusCol - 1]) {
      sheet.getRange(i + 1, statusCol).setValue("active");
    }
  }
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

function footageSheet_() {
  var sheet = getSheet_(FOOTAGE_SHEET, ["Id", "Title", "VideoUrl", "Date", "CreatedAt"]);
  backfillIds_(sheet);
  return sheet;
}

function footageNotesSheet_() {
  var sheet = getSheet_(FOOTAGE_NOTES_SHEET, [
    "Id",
    "FootageId",
    "Player",
    "Note",
    "GroupId",
    "CreatedAt",
  ]);
  ensureColumn_(sheet, "GroupId");
  backfillIds_(sheet);
  return sheet;
}

function practicePlanDrillsSheet_() {
  var sheet = getSheet_(PRACTICE_PLAN_DRILLS_SHEET, ["Id", "Name", "CreatedAt"]);
  backfillIds_(sheet);
  return sheet;
}

function practicePlansSheet_() {
  var sheet = getSheet_(PRACTICE_PLANS_SHEET, ["Id", "Date", "CreatedAt", "DurationMinutes"]);
  ensureColumn_(sheet, "DurationMinutes");
  backfillIds_(sheet);
  return sheet;
}

function practicePlanItemsSheet_() {
  var sheet = getSheet_(PRACTICE_PLAN_ITEMS_SHEET, [
    "Id",
    "PlanId",
    "Name",
    "Minutes",
    "Order",
    "CreatedAt",
    "CategoryId",
    "VideoUrl",
  ]);
  ensureColumn_(sheet, "CategoryId");
  ensureColumn_(sheet, "VideoUrl");
  backfillIds_(sheet);
  return sheet;
}

function practicePlanCategoriesSheet_() {
  var sheet = getSheet_(PRACTICE_PLAN_CATEGORIES_SHEET, ["Id", "Name", "Order", "CreatedAt"]);
  backfillIds_(sheet);
  return sheet;
}

// Adds a name to the practice plan drill library the first time a coach
// types it into a plan, so it shows up as a suggestion next time around.
function ensurePlanDrill_(name) {
  var sheet = practicePlanDrillsSheet_();
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
    CreatedAt: new Date().toISOString(),
  });
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
    var allPlayers = rowsToObjects_(playersSheet_().getDataRange().getValues());
    if (e.parameter.includeInactive !== "1") {
      allPlayers = allPlayers.filter(function(row) {
        return String(row.Status || "active").trim().toLowerCase() !== "inactive";
      });
    }
    result = allPlayers;
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
  } else if (action === "footage") {
    result = rowsToObjects_(footageSheet_().getDataRange().getValues());
  } else if (action === "footageNotes") {
    var allNotes = rowsToObjects_(footageNotesSheet_().getDataRange().getValues());
    if (e.parameter.player) {
      var np = e.parameter.player.trim().toLowerCase();
      allNotes = allNotes.filter(function (row) {
        return String(row.Player).trim().toLowerCase() === np;
      });
    }
    result = allNotes;
  } else if (action === "practicePlanDrills") {
    result = rowsToObjects_(practicePlanDrillsSheet_().getDataRange().getValues());
  } else if (action === "practicePlans") {
    result = rowsToObjects_(practicePlansSheet_().getDataRange().getValues());
  } else if (action === "practicePlanCategories") {
    result = rowsToObjects_(practicePlanCategoriesSheet_().getDataRange().getValues());
  } else if (action === "triviaResponses") {
    result = rowsToObjects_(getSheet_(TRIVIA_RESPONSES_SHEET, ["Id", "Player", "QuestionId", "Answer", "Correct", "Date", "CreatedAt"]).getDataRange().getValues());
  } else if (action === "practicePlanItems") {
    var allPlanItems = rowsToObjects_(practicePlanItemsSheet_().getDataRange().getValues());
    if (e.parameter.planId) {
      allPlanItems = allPlanItems.filter(function (row) {
        return String(row.PlanId) === String(e.parameter.planId);
      });
    }
    result = allPlanItems;
  } else if (action === "fundraiserSales") {
    result = rowsToObjects_(getSheet_(FUNDRAISER_SALES_SHEET, ["Id","FundraiserId","Player","Units","Date","CreatedAt"]).getDataRange().getValues());
  } else if (action === "playerProfiles") {
    result = rowsToObjects_(getSheet_(PLAYER_PROFILES_SHEET, ["Id","Player","DOB","HeightFt","HeightIn","Weight","Throws","Bats","OverhandSpeed","Number","Parent1Name","Parent1Email","Parent1Phone","Parent2Name","Parent2Email","Parent2Phone","Address","City","State","Zip","CreatedAt"]).getDataRange().getValues());
  } else if (action === "pitchLog") {
    result = rowsToObjects_(getSheet_(PITCH_LOG_SHEET, ["Id","Pitcher","Date","Context","Pitches","Innings","Notes","CreatedAt"]).getDataRange().getValues());
  } else if (action === "mumsColors") {
    result = rowsToObjects_(getSheet_(MUMS_COLORS_SHEET, ["Id","FundraiserId","Player","Red","White","Yellow","Bronze","Purple","TriColor","TotalMums","AmountDue","SubmittedBy","CreatedAt"]).getDataRange().getValues());
  } else if (action === "homeworkCompletions") {
    result = rowsToObjects_(getSheet_(HOMEWORK_COMPLETIONS_SHEET, ["Id","Player","WeekOf","CompletedAt"]).getDataRange().getValues());
  } else if (action === "assignmentTemplates") {
    var atGetSheet = getSheet_(ASSIGNMENT_TEMPLATES_SHEET, ["Id", "Name", "Tasks", "CreatedAt"]);
    backfillIds_(atGetSheet);
    var atRaw = rowsToObjects_(atGetSheet.getDataRange().getValues());
    result = atRaw.map(function(r) {
      var rawTasks = JSON.parse(r.Tasks || "[]");
      var tasks = rawTasks.map(function(t) {
        return (typeof t === "string") ? { text: t } : t;
      });
      return { Id: r.Id, Name: r.Name, Tasks: tasks, CreatedAt: r.CreatedAt };
    });
  } else if (action === "assignments") {
    var aGetSheet = getSheet_(ASSIGNMENTS_SHEET, ["Id", "TemplateId", "PlayerName", "StartDate", "EndDate", "Notes", "CreatedAt"]);
    backfillIds_(aGetSheet);
    var allAssignments = rowsToObjects_(aGetSheet.getDataRange().getValues());
    if (e.parameter.player) {
      var apFilter = e.parameter.player.trim().toLowerCase();
      allAssignments = allAssignments.filter(function(r) {
        return String(r.PlayerName).trim().toLowerCase() === apFilter;
      });
    }
    result = allAssignments;
  } else if (action === "games") {
    result = rowsToObjects_(getSheet_("Games", ["Id","Date","Opponent","HomeAway","TeamScore","OppScore","Notes","Highlights","Recap"]).getDataRange().getValues());
  } else if (action === "gameBatting") {
    var gb = getSheet_("GameBatting", ["Id","GameId","Player","AB","R","H","RBI","BB","SO","doubles","triples","HR","SB","HBP","SAC"]);
    result = rowsToObjects_(gb.getDataRange().getValues());
  } else if (action === "gamePitching") {
    var gp = getSheet_("GamePitching", ["Id","GameId","Player","IP","H","R","ER","BB","SO","HR","BF","PC","Strikes","W","L","SV"]);
    result = rowsToObjects_(gp.getDataRange().getValues());
  } else if (action === "gameAtBats") {
    var ga = getSheet_("GameAtBats", ["Id","GameId","Team","Player","Jersey","Inning","Result","Balls","Strikes","FieldedTo"]);
    result = rowsToObjects_(ga.getDataRange().getValues());
  } else if (action === "practiceSessions") {
    var psSheet = getSheet_(PRACTICE_SESSIONS_SHEET, ["Id", "Date", "Label", "CreatedAt"]);
    backfillIds_(psSheet);
    result = rowsToObjects_(psSheet.getDataRange().getValues());
  } else if (action === "practiceAttendance") {
    var paSheet = getSheet_(PRACTICE_ATTENDANCE_SHEET, ["Id", "SessionId", "PlayerName", "Present", "Reason", "CreatedAt"]);
    backfillIds_(paSheet);
    result = rowsToObjects_(paSheet.getDataRange().getValues());
  } else if (action === "tryoutPlayers") {
    var tpSheet = getSheet_(TRYOUTS_SHEET, [
      "Id","SheetId","SavedAt","TryoutDate","PlayerName","Age","Bats","Throws","PrevTeam","City","Positions"
    ]);
    var tpDate = e.parameter.date || "";
    var tpAll = rowsToObjects_(tpSheet.getDataRange().getValues());
    if (tpDate) {
      tpAll = tpAll.filter(function(r) { return String(r.TryoutDate) === tpDate; });
    }
    result = tpAll;
  } else if (action === "tryoutEntries") {
    var teSheet = getSheet_(TRYOUT_ENTRIES_SHEET, [
      "Id","TryoutSheetId","TryoutDate","Coach","SavedAt",
      "Effort","Attitude","Recovery","ParentConvo","TakingCorrection",
      "Swing","FieldingMechanics","PersonalAppearance","ArrivalTime",
      "ExitVelo","ThrowVelo","Notes"
    ]);
    var teDate = e.parameter.date || "";
    var teAll = rowsToObjects_(teSheet.getDataRange().getValues());
    if (teDate) {
      teAll = teAll.filter(function(r) { return String(r.TryoutDate) === teDate; });
    }
    result = teAll;
  } else if (action === "homework") {
    var hwSheet = getSheet_(HOMEWORK_SHEET, ["Id","WeekOf","Tasks","UpdatedBy","UpdatedAt"]);
    var hwData = hwSheet.getDataRange().getValues();
    if (hwData.length < 2) {
      result = { tasks: [], weekOf: "", updatedAt: "" };
    } else {
      var hwHeaders = hwData[0];
      var hwLast = hwData[hwData.length - 1];
      var hwRow = {};
      hwHeaders.forEach(function(h, i) { hwRow[h] = hwLast[i]; });
      result = {
        tasks: JSON.parse(hwRow["Tasks"] || "[]"),
        weekOf: hwRow["WeekOf"] || "",
        updatedBy: hwRow["UpdatedBy"] || "",
        updatedAt: hwRow["UpdatedAt"] || "",
      };
    }
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
  } else if (body.action === "updatePlayerStatus") {
    var upsStatusSheet = playersSheet_();
    var upsStatusRow = findRowById_(upsStatusSheet, body.id);
    if (upsStatusRow === -1) {
      result = { error: "player not found" };
    } else {
      var upsStatusCol = ensureColumn_(upsStatusSheet, "Status");
      upsStatusSheet.getRange(upsStatusRow, upsStatusCol).setValue(body.status || "active");
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
    var notifyEntries = body.entries.filter(function(m) { return m.metric !== "AssignedTask"; });
    if (notifyEntries.length) {
      notifyGroupMe_(
        notifyEntries[0].player +
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
    notifyGroupMe_("📋 New drill added: " + body.name + (body.description ? "\n" + body.description : "") + "\nhttps://nvastano.github.io/exposure-tristar");
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
  } else if (body.action === "addFootage") {
    appendRowByHeaders_(footageSheet_(), {
      Id: newId_(),
      Title: body.title,
      VideoUrl: body.videoUrl,
      Date: body.date || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "deleteFootage") {
    var fSheet = footageSheet_();
    var fRow = findRowById_(fSheet, body.id);
    if (fRow === -1) {
      result = { error: "footage not found" };
    } else {
      fSheet.deleteRow(fRow);
      var fnSheet = footageNotesSheet_();
      var fnData = fnSheet.getDataRange().getValues();
      var fnFootageCol = ensureColumn_(fnSheet, "FootageId");
      for (var fni = fnData.length - 1; fni >= 1; fni--) {
        if (String(fnData[fni][fnFootageCol - 1]) === String(body.id)) {
          fnSheet.deleteRow(fni + 1);
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "addFootageNote") {
    var notePlayers = body.players || (body.player ? [body.player] : []);
    var noteSheet = footageNotesSheet_();
    var noteGroupId = newId_();
    notePlayers.forEach(function (p) {
      ensurePlayer_(p);
      appendRowByHeaders_(noteSheet, {
        Id: newId_(),
        FootageId: body.footageId,
        Player: p,
        Note: body.note,
        GroupId: noteGroupId,
        CreatedAt: new Date().toISOString(),
      });
    });
    if (notePlayers.length) {
      notifyGroupMe_(
        notePlayers.join(", ") + " got called out on a practice clip 🎥\n" + body.note
      );
    }
    result = { ok: true };
  } else if (body.action === "deleteFootageNote") {
    var fnSheet2 = footageNotesSheet_();
    var fnRow2 = findRowById_(fnSheet2, body.id);
    if (fnRow2 === -1) {
      result = { error: "footage note not found" };
    } else {
      var fnGroupCol = ensureColumn_(fnSheet2, "GroupId");
      var fnGroupId = fnSheet2.getRange(fnRow2, fnGroupCol).getValue();
      var fnData2 = fnSheet2.getDataRange().getValues();
      for (var fni2 = fnData2.length - 1; fni2 >= 1; fni2--) {
        if (fnGroupId && String(fnData2[fni2][fnGroupCol - 1]) === String(fnGroupId)) {
          fnSheet2.deleteRow(fni2 + 1);
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "createPracticePlan") {
    var newPlanId = newId_();
    appendRowByHeaders_(practicePlansSheet_(), {
      Id: newPlanId,
      Date: body.date,
      DurationMinutes: body.durationMinutes || 240,
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: newPlanId };
  } else if (body.action === "updatePracticePlan") {
    var upSheet = practicePlansSheet_();
    var upRow = findRowById_(upSheet, body.id);
    if (upRow === -1) {
      result = { error: "practice plan not found" };
    } else {
      var upUpdates = {};
      if (body.durationMinutes !== undefined) upUpdates.DurationMinutes = body.durationMinutes;
      setRowByHeaders_(upSheet, upRow, upUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deletePracticePlan") {
    var ppSheet = practicePlansSheet_();
    var ppRow = findRowById_(ppSheet, body.id);
    if (ppRow === -1) {
      result = { error: "practice plan not found" };
    } else {
      ppSheet.deleteRow(ppRow);
      var piSheet = practicePlanItemsSheet_();
      var piData = piSheet.getDataRange().getValues();
      var piPlanCol = ensureColumn_(piSheet, "PlanId");
      for (var pii = piData.length - 1; pii >= 1; pii--) {
        if (String(piData[pii][piPlanCol - 1]) === String(body.id)) {
          piSheet.deleteRow(pii + 1);
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "addPlanItem") {
    ensurePlanDrill_(body.name);
    var itemSheet = practicePlanItemsSheet_();
    var itemData = itemSheet.getDataRange().getValues();
    var itemPlanCol = ensureColumn_(itemSheet, "PlanId");
    var itemOrderCol = ensureColumn_(itemSheet, "Order");
    var samePlanOrders = [];
    for (var ii = 1; ii < itemData.length; ii++) {
      if (String(itemData[ii][itemPlanCol - 1]) === String(body.planId)) {
        samePlanOrders.push(itemData[ii][itemOrderCol - 1]);
      }
    }
    appendRowByHeaders_(itemSheet, {
      Id: newId_(),
      PlanId: body.planId,
      Name: body.name,
      Minutes: body.minutes,
      Order: nextOrder_(samePlanOrders),
      CreatedAt: new Date().toISOString(),
      CategoryId: body.categoryId || "",
      VideoUrl: body.videoUrl || "",
    });
    result = { ok: true };
  } else if (body.action === "updatePlanItem") {
    var upiSheet = practicePlanItemsSheet_();
    var upiRow = findRowById_(upiSheet, body.id);
    if (upiRow === -1) {
      result = { error: "plan item not found" };
    } else {
      var upiUpdates = {};
      if (body.videoUrl !== undefined) upiUpdates.VideoUrl = body.videoUrl;
      setRowByHeaders_(upiSheet, upiRow, upiUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deletePlanItem") {
    var diSheet = practicePlanItemsSheet_();
    var diRow = findRowById_(diSheet, body.id);
    if (diRow === -1) {
      result = { error: "plan item not found" };
    } else {
      diSheet.deleteRow(diRow);
      result = { ok: true };
    }
  } else if (body.action === "addPracticePlanCategory") {
    var ppcSheet = practicePlanCategoriesSheet_();
    var ppcData = ppcSheet.getDataRange().getValues();
    var ppcOrderCol = ensureColumn_(ppcSheet, "Order");
    var ppcOrders = [];
    for (var ppci = 1; ppci < ppcData.length; ppci++) ppcOrders.push(ppcData[ppci][ppcOrderCol - 1]);
    var ppcId = newId_();
    appendRowByHeaders_(ppcSheet, {
      Id: ppcId,
      Name: body.name,
      Order: nextOrder_(ppcOrders),
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: ppcId };
  } else if (body.action === "deletePracticePlanCategory") {
    var dpcSheet = practicePlanCategoriesSheet_();
    var dpcRow = findRowById_(dpcSheet, body.id);
    if (dpcRow === -1) {
      result = { error: "category not found" };
    } else {
      dpcSheet.deleteRow(dpcRow);
      var dpiSheet = practicePlanItemsSheet_();
      var dpiData = dpiSheet.getDataRange().getValues();
      var dpiCatCol = ensureColumn_(dpiSheet, "CategoryId");
      for (var dpii = 1; dpii < dpiData.length; dpii++) {
        if (String(dpiData[dpii][dpiCatCol - 1]) === String(body.id)) {
          setCell_(dpiSheet, dpii + 1, dpiCatCol, "CategoryId", "");
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "recordTriviaResponse") {
    var trSheet = getSheet_(TRIVIA_RESPONSES_SHEET, ["Id", "Player", "QuestionId", "Answer", "Correct", "Date", "CreatedAt"]);
    backfillIds_(trSheet);
    appendRowByHeaders_(trSheet, {
      Id: newId_(),
      Player: body.player,
      QuestionId: body.questionId,
      Answer: body.answer,
      Correct: body.correct ? "yes" : "no",
      Date: body.date || new Date().toISOString().slice(0, 10),
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "seedPracticePlanDrills") {
    (body.names || []).forEach(function (n) {
      ensurePlanDrill_(n);
    });
    result = { ok: true, count: (body.names || []).length };
  } else if (body.action === "logPlayerProfile") {
    var ppHeaders = ["Id","Player","DOB","HeightFt","HeightIn","Weight","Throws","Bats","OverhandSpeed","Number","Parent1Name","Parent1Email","Parent1Phone","Parent2Name","Parent2Email","Parent2Phone","Address","City","State","Zip","CreatedAt"];
    var ppSheet = getSheet_(PLAYER_PROFILES_SHEET, ppHeaders);
    backfillIds_(ppSheet);
    appendRowByHeaders_(ppSheet, {
      Id: newId_(),
      Player: body.player,
      DOB: body.dob || "",
      HeightFt: body.heightFt || "",
      HeightIn: body.heightIn || "",
      Weight: body.weight || "",
      Throws: body.throws || "",
      Bats: body.bats || "",
      OverhandSpeed: body.overhandSpeed || "",
      Number: body.number || "",
      Parent1Name: body.parent1Name || "",
      Parent1Email: body.parent1Email || "",
      Parent1Phone: body.parent1Phone || "",
      Parent2Name: body.parent2Name || "",
      Parent2Email: body.parent2Email || "",
      Parent2Phone: body.parent2Phone || "",
      Address: body.address || "",
      City: body.city || "",
      State: body.state || "",
      Zip: body.zip || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "uploadDrillVideo") {
    // Legacy small-file path (kept for compatibility)
    var folders = DriveApp.getFoldersByName(DRILL_VIDEOS_FOLDER);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRILL_VIDEOS_FOLDER);
    var decoded = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(decoded, body.mimeType, body.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    result = { ok: true, fileId: file.getId(), url: "https://drive.google.com/file/d/" + file.getId() + "/preview" };
  } else if (body.action === "initDriveUpload") {
    // Initiates a Drive resumable upload session server-side, stores the upload URL
    // in cache keyed by sessionId, returns sessionId to the browser.
    try {
      var dvFolders = DriveApp.getFoldersByName(DRILL_VIDEOS_FOLDER);
      var dvFolder = dvFolders.hasNext() ? dvFolders.next() : DriveApp.createFolder(DRILL_VIDEOS_FOLDER);
      var token = ScriptApp.getOAuthToken();
      var metadata = JSON.stringify({ name: body.filename, parents: [dvFolder.getId()] });
      var initResp = UrlFetchApp.fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "post",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": body.mimeType,
            "X-Upload-Content-Length": String(body.fileSize),
          },
          payload: metadata,
          muteHttpExceptions: true,
        }
      );
      var respHeaders = initResp.getAllHeaders();
      var uploadUrl = respHeaders["Location"] || respHeaders["location"];
      if (!uploadUrl) {
        result = { error: "could not create upload session (status " + initResp.getResponseCode() + "): " + initResp.getContentText() };
      } else {
        var sessionId = Utilities.getUuid();
        CacheService.getScriptCache().put(sessionId, uploadUrl, 21600);
        result = { ok: true, sessionId: sessionId };
      }
    } catch (err) {
      result = { error: "initDriveUpload threw: " + String(err) };
    }
  } else if (body.action === "uploadChunk") {
    // Receives a base64 chunk from the browser and PUTs it to the Drive resumable upload URL.
    try {
      var uploadUrl = CacheService.getScriptCache().get(body.sessionId);
      if (!uploadUrl) {
        result = { error: "upload session not found or expired" };
      } else {
        var chunkBytes = Utilities.base64Decode(body.data);
        var start = Number(body.start);
        var totalSize = Number(body.totalSize);
        var end = start + chunkBytes.length - 1;
        var contentRange = body.isLast
          ? "bytes " + start + "-" + end + "/" + totalSize
          : "bytes " + start + "-" + end + "/*";
        var putResp = UrlFetchApp.fetch(uploadUrl, {
          method: "put",
          headers: {
            "Content-Range": contentRange,
            "Content-Type": body.mimeType,
          },
          payload: chunkBytes,
          muteHttpExceptions: true,
        });
        var status = putResp.getResponseCode();
        if (status === 308) {
          result = { ok: true, status: "incomplete" };
        } else if (status === 200 || status === 201) {
          var driveFile = JSON.parse(putResp.getContentText());
          var fileId = driveFile.id;
          DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          result = { ok: true, status: "complete", fileId: fileId, url: "https://drive.google.com/file/d/" + fileId + "/preview" };
        } else {
          result = { error: "Drive returned " + status + ": " + putResp.getContentText().slice(0, 300) };
        }
      }
    } catch (err) {
      result = { error: "uploadChunk threw: " + String(err) };
    }
  } else if (body.action === "setDriveSharing") {
    try {
      var sf = DriveApp.getFileById(body.fileId);
      sf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      result = { ok: true };
    } catch (err) {
      result = { error: String(err) };
    }
  } else if (body.action === "logPitch") {
    var plSheet = getSheet_(PITCH_LOG_SHEET, ["Id","Pitcher","Date","Context","Pitches","Innings","Notes","CreatedAt"]);
    backfillIds_(plSheet);
    appendRowByHeaders_(plSheet, {
      Id: newId_(),
      Pitcher: body.pitcher,
      Date: body.date,
      Context: body.context,
      Pitches: body.pitches,
      Innings: body.innings || "",
      Notes: body.notes || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "logMumsColors") {
    var mcSheet = getSheet_(MUMS_COLORS_SHEET, ["Id","FundraiserId","Player","Red","White","Yellow","Bronze","Purple","TriColor","TotalMums","AmountDue","SubmittedBy","CreatedAt"]);
    backfillIds_(mcSheet);
    appendRowByHeaders_(mcSheet, {
      Id: newId_(),
      FundraiserId: body.fundraiserId,
      Player: body.player,
      Red: body.red || 0,
      White: body.white || 0,
      Yellow: body.yellow || 0,
      Bronze: body.bronze || 0,
      Purple: body.purple || 0,
      TriColor: body.triColor || 0,
      TotalMums: body.totalMums || 0,
      AmountDue: body.amountDue || 0,
      SubmittedBy: body.submittedBy || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "logMerchOrder") {
    var moSheet = getSheet_(MERCH_ORDERS_SHEET, ["Id","SubmittedAt","PlayerName","ParentName","Email","Phone","Item","Size","Quantity","Notes","CreatedAt"]);
    backfillIds_(moSheet);
    appendRowByHeaders_(moSheet, {
      Id: newId_(),
      SubmittedAt: body.submittedAt || new Date().toISOString(),
      PlayerName: body.playerName || "",
      ParentName: body.parentName || "",
      Email: body.email || "",
      Phone: body.phone || "",
      Item: body.item || "",
      Size: body.size || "",
      Quantity: body.quantity || "",
      Notes: body.notes || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "setHomework") {
    var hwSheet2 = getSheet_(HOMEWORK_SHEET, ["Id","WeekOf","Tasks","UpdatedBy","UpdatedAt"]);
    appendRowByHeaders_(hwSheet2, {
      Id: newId_(),
      WeekOf: body.weekOf || new Date().toISOString().slice(0, 10),
      Tasks: JSON.stringify(body.tasks || []),
      UpdatedBy: body.updatedBy || "",
      UpdatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "logHomeworkCompletion") {
    var hcSheet = getSheet_(HOMEWORK_COMPLETIONS_SHEET, ["Id","Player","WeekOf","CompletedAt"]);
    backfillIds_(hcSheet);
    // Deduplicate: remove any prior completion for same player + weekOf before appending
    var hcData = hcSheet.getDataRange().getValues();
    var hcPlayerCol = ensureColumn_(hcSheet, "Player");
    var hcWeekCol = ensureColumn_(hcSheet, "WeekOf");
    for (var hci = hcData.length - 1; hci >= 1; hci--) {
      if (
        String(hcData[hci][hcPlayerCol - 1]).trim().toLowerCase() === String(body.player || "").trim().toLowerCase() &&
        String(hcData[hci][hcWeekCol - 1]) === String(body.weekOf || "")
      ) {
        hcSheet.deleteRow(hci + 1);
      }
    }
    appendRowByHeaders_(hcSheet, {
      Id: newId_(),
      Player: body.player || "",
      WeekOf: body.weekOf || "",
      CompletedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else if (body.action === "saveAssignmentTemplate") {
    var atSheet = getSheet_(ASSIGNMENT_TEMPLATES_SHEET, ["Id", "Name", "Tasks", "CreatedAt"]);
    backfillIds_(atSheet);
    if (body.id) {
      var atRow = findRowById_(atSheet, body.id);
      if (atRow === -1) { result = { error: "template not found" }; }
      else {
        var atUp = {};
        if (body.name !== undefined) atUp.Name = body.name;
        if (body.tasks !== undefined) atUp.Tasks = JSON.stringify(body.tasks);
        setRowByHeaders_(atSheet, atRow, atUp);
        result = { ok: true };
      }
    } else {
      var newAtId = newId_();
      appendRowByHeaders_(atSheet, {
        Id: newAtId,
        Name: body.name || "",
        Tasks: JSON.stringify(body.tasks || []),
        CreatedAt: new Date().toISOString(),
      });
      result = { ok: true, id: newAtId };
    }
  } else if (body.action === "deleteAssignmentTemplate") {
    var datSheet = getSheet_(ASSIGNMENT_TEMPLATES_SHEET, ["Id", "Name", "Tasks", "CreatedAt"]);
    var datRow = findRowById_(datSheet, body.id);
    if (datRow === -1) { result = { error: "template not found" }; }
    else { datSheet.deleteRow(datRow); result = { ok: true }; }
  } else if (body.action === "createAssignment") {
    var aSheet = getSheet_(ASSIGNMENTS_SHEET, ["Id", "TemplateId", "PlayerName", "StartDate", "EndDate", "Notes", "CreatedAt"]);
    backfillIds_(aSheet);
    // Force date columns to plain text so Sheets doesn't auto-convert them
    ensureColumn_(aSheet, "StartDate");
    ensureColumn_(aSheet, "EndDate");
    var startDateCol = ensureColumn_(aSheet, "StartDate");
    var endDateCol = ensureColumn_(aSheet, "EndDate");
    aSheet.getRange(1, startDateCol).setNumberFormat("@");
    aSheet.getRange(1, endDateCol).setNumberFormat("@");
    var newAId = newId_();
    appendRowByHeaders_(aSheet, {
      Id: newAId,
      TemplateId: body.templateId || "",
      PlayerName: body.playerName || "",
      StartDate: body.startDate || "",
      EndDate: body.endDate || "",
      Notes: body.notes || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: newAId };
  } else if (body.action === "updateAssignment") {
    var uaSheet = getSheet_(ASSIGNMENTS_SHEET, ["Id", "TemplateId", "PlayerName", "StartDate", "EndDate", "CreatedAt"]);
    var uaRow = findRowById_(uaSheet, body.id);
    if (uaRow === -1) { result = { error: "assignment not found" }; }
    else {
      var uaUp = {};
      if (body.startDate !== undefined) uaUp.StartDate = body.startDate;
      if (body.endDate !== undefined) uaUp.EndDate = body.endDate;
      setRowByHeaders_(uaSheet, uaRow, uaUp);
      result = { ok: true };
    }
  } else if (body.action === "deleteAssignment") {
    var daSheet = getSheet_(ASSIGNMENTS_SHEET, ["Id", "TemplateId", "PlayerName", "StartDate", "EndDate", "CreatedAt"]);
    var daRow = findRowById_(daSheet, body.id);
    if (daRow === -1) { result = { error: "assignment not found" }; }
    else { daSheet.deleteRow(daRow); result = { ok: true }; }
  } else if (body.action === "createPracticeSession") {
    var cpsSheet = getSheet_(PRACTICE_SESSIONS_SHEET, ["Id", "Date", "Label", "CreatedAt"]);
    backfillIds_(cpsSheet);
    var cpsId = newId_();
    appendRowByHeaders_(cpsSheet, {
      Id: cpsId,
      Date: body.date || new Date().toISOString().slice(0, 10),
      Label: body.label || "",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: cpsId };
  } else if (body.action === "updatePracticeSession") {
    var upsSheet = getSheet_(PRACTICE_SESSIONS_SHEET, ["Id", "Date", "Label", "CreatedAt"]);
    backfillIds_(upsSheet);
    var upsRow = findRowById_(upsSheet, body.id);
    if (upsRow === -1) { result = { error: "session not found" }; }
    else {
      var upsDateCol = ensureColumn_(upsSheet, "Date");
      var upsLabelCol = ensureColumn_(upsSheet, "Label");
      upsSheet.getRange(upsRow, upsDateCol).setValue(body.date || "");
      upsSheet.getRange(upsRow, upsLabelCol).setValue(body.label || "");
      result = { ok: true };
    }
  } else if (body.action === "deletePracticeSession") {
    var dpsSheet = getSheet_(PRACTICE_SESSIONS_SHEET, ["Id", "Date", "Label", "CreatedAt"]);
    var dpsRow = findRowById_(dpsSheet, body.id);
    if (dpsRow === -1) { result = { error: "session not found" }; }
    else {
      dpsSheet.deleteRow(dpsRow);
      // Also delete all attendance rows for this session
      var dpaSheet = getSheet_(PRACTICE_ATTENDANCE_SHEET, ["Id", "SessionId", "PlayerName", "Present", "Reason", "CreatedAt"]);
      backfillIds_(dpaSheet);
      var dpaData = dpaSheet.getDataRange().getValues();
      var dpaSessionCol = ensureColumn_(dpaSheet, "SessionId");
      for (var dpai = dpaData.length - 1; dpai >= 1; dpai--) {
        if (String(dpaData[dpai][dpaSessionCol - 1]) === String(body.id)) {
          dpaSheet.deleteRow(dpai + 1);
        }
      }
      result = { ok: true };
    }
  } else if (body.action === "saveAttendance") {
    // body.sessionId, body.records: [{ playerName, present, reason }]
    var saSheet = getSheet_(PRACTICE_ATTENDANCE_SHEET, ["Id", "SessionId", "PlayerName", "Present", "Reason", "CreatedAt"]);
    backfillIds_(saSheet);
    var saSessionCol = ensureColumn_(saSheet, "SessionId");
    var saData = saSheet.getDataRange().getValues();
    // Delete existing rows for this session first
    for (var sai = saData.length - 1; sai >= 1; sai--) {
      if (String(saData[sai][saSessionCol - 1]) === String(body.sessionId)) {
        saSheet.deleteRow(sai + 1);
      }
    }
    // Append new rows
    (body.records || []).forEach(function(rec) {
      appendRowByHeaders_(saSheet, {
        Id: newId_(),
        SessionId: body.sessionId,
        PlayerName: rec.playerName || "",
        Present: rec.present ? "yes" : "no",
        Reason: rec.reason || "",
        CreatedAt: new Date().toISOString(),
      });
    });
    result = { ok: true };
  } else if (body.action === "saveTryoutPlayer") {
    var trySheet = getSheet_(TRYOUTS_SHEET, [
      "Id","SheetId","SavedAt","TryoutDate","PlayerName","Age","Bats","Throws","PrevTeam","City","Positions"
    ]);
    appendRowByHeaders_(trySheet, {
      Id: newId_(),
      SheetId: body.sheetId || "",
      SavedAt: new Date().toISOString(),
      TryoutDate: body.tryoutDate || new Date().toISOString().slice(0, 10),
      PlayerName: body.playerName || "",
      Age: body.age || "",
      Bats: body.bats || "",
      Throws: body.throws || "",
      PrevTeam: body.prevTeam || "",
      City: body.city || "",
      Positions: body.positions || "",
    });
    result = { ok: true };
  } else if (body.action === "saveTryoutEntry") {
    // Upsert: one row per coach per player. Find existing row by TryoutSheetId + Coach and update,
    // or append a new row if none exists.
    var teSheet = getSheet_(TRYOUT_ENTRIES_SHEET, [
      "Id","TryoutSheetId","TryoutDate","Coach","SavedAt",
      "Effort","Attitude","Recovery","ParentConvo","TakingCorrection",
      "Swing","FieldingMechanics","PersonalAppearance","ArrivalTime",
      "ExitVelo","ThrowVelo","Notes"
    ]);
    var teIdCol = ensureColumn_(teSheet, "TryoutSheetId");
    var teCoachCol = ensureColumn_(teSheet, "Coach");
    var teData = teSheet.getDataRange().getValues();
    var teRow = -1;
    for (var tei = 1; tei < teData.length; tei++) {
      if (
        String(teData[tei][teIdCol - 1]) === String(body.tryoutSheetId) &&
        String(teData[tei][teCoachCol - 1]) === String(body.coach || "")
      ) {
        teRow = tei + 1;
        break;
      }
    }
    if (teRow === -1) {
      appendRowByHeaders_(teSheet, {
        Id: newId_(),
        TryoutSheetId: body.tryoutSheetId || "",
        TryoutDate: body.tryoutDate || new Date().toISOString().slice(0, 10),
        Coach: body.coach || "",
        SavedAt: new Date().toISOString(),
        Effort: body.effort !== undefined ? body.effort : "",
        Attitude: body.attitude !== undefined ? body.attitude : "",
        Recovery: body.recovery !== undefined ? body.recovery : "",
        ParentConvo: body.parentConvo !== undefined ? body.parentConvo : "",
        TakingCorrection: body.takingCorrection !== undefined ? body.takingCorrection : "",
        Swing: body.swing !== undefined ? body.swing : "",
        FieldingMechanics: body.fieldingMechanics !== undefined ? body.fieldingMechanics : "",
        PersonalAppearance: body.personalAppearance !== undefined ? body.personalAppearance : "",
        ArrivalTime: body.arrivalTime !== undefined ? body.arrivalTime : "",
        ExitVelo: body.exitVelo || "",
        ThrowVelo: body.throwVelo || "",
        Notes: body.notes || "",
      });
    } else {
      var teUpdates = { SavedAt: new Date().toISOString() };
      if (body.coach !== undefined) teUpdates.Coach = body.coach;
      if (body.effort !== undefined) teUpdates.Effort = body.effort;
      if (body.attitude !== undefined) teUpdates.Attitude = body.attitude;
      if (body.recovery !== undefined) teUpdates.Recovery = body.recovery;
      if (body.parentConvo !== undefined) teUpdates.ParentConvo = body.parentConvo;
      if (body.takingCorrection !== undefined) teUpdates.TakingCorrection = body.takingCorrection;
      if (body.swing !== undefined) teUpdates.Swing = body.swing;
      if (body.fieldingMechanics !== undefined) teUpdates.FieldingMechanics = body.fieldingMechanics;
      if (body.personalAppearance !== undefined) teUpdates.PersonalAppearance = body.personalAppearance;
      if (body.arrivalTime !== undefined) teUpdates.ArrivalTime = body.arrivalTime;
      if (body.exitVelo !== undefined) teUpdates.ExitVelo = body.exitVelo;
      if (body.throwVelo !== undefined) teUpdates.ThrowVelo = body.throwVelo;
      if (body.notes !== undefined) teUpdates.Notes = body.notes;
      setRowByHeaders_(teSheet, teRow, teUpdates);
    }
    result = { ok: true };
  } else if (body.action === "saveGame") {
    var gSheet = getSheet_("Games", ["Id","Date","Opponent","HomeAway","TeamScore","OppScore","Notes","Highlights","Recap"]);
    // If gameId provided, check for duplicate
    var existingGameId = body.gameId || null;
    if (existingGameId) {
      var gRows = rowsToObjects_(gSheet.getDataRange().getValues());
      var existing = gRows.filter(function(r) { return r.Id === existingGameId; });
      if (existing.length > 0) {
        // Delete existing batting/pitching rows for this game, then re-add
        var gbSheet = getSheet_("GameBatting", ["Id","GameId","Player","AB","R","H","RBI","BB","SO","doubles","triples","HR","SB","HBP","SAC"]);
        var gpSheet = getSheet_("GamePitching", ["Id","GameId","Player","IP","H","R","ER","BB","SO","HR","BF","PC","Strikes","W","L","SV"]);
        // Delete batting rows
        var gbData = gbSheet.getDataRange().getValues();
        var gbIdCol = gbData[0].indexOf("GameId");
        for (var i = gbData.length - 1; i >= 1; i--) {
          if (gbData[i][gbIdCol] === existingGameId) gbSheet.deleteRow(i + 1);
        }
        // Delete pitching rows
        var gpData = gpSheet.getDataRange().getValues();
        var gpIdCol = gpData[0].indexOf("GameId");
        for (var i = gpData.length - 1; i >= 1; i--) {
          if (gpData[i][gpIdCol] === existingGameId) gpSheet.deleteRow(i + 1);
        }
        // Update the game row
        var gameRowIdx = -1;
        var gData = gSheet.getDataRange().getValues();
        var gIdCol = gData[0].indexOf("Id");
        for (var i = 1; i < gData.length; i++) {
          if (gData[i][gIdCol] === existingGameId) { gameRowIdx = i + 1; break; }
        }
        if (gameRowIdx > 0) {
          setRowByHeaders_(gSheet, gameRowIdx, { Date: body.date, Opponent: body.opponent, HomeAway: body.homeAway, TeamScore: body.teamScore, OppScore: body.oppScore, Notes: body.notes || "", Highlights: JSON.stringify(body.highlights || []), Recap: body.recap || "" });
        }
        result = { ok: true, gameId: existingGameId, updated: true };
      } else {
        existingGameId = null; // fall through to insert
      }
    }
    if (!existingGameId) {
      var newGameId = newId_();
      appendRowByHeaders_(gSheet, { Id: newGameId, Date: body.date, Opponent: body.opponent, HomeAway: body.homeAway, TeamScore: body.teamScore, OppScore: body.oppScore, Notes: body.notes || "", Highlights: JSON.stringify(body.highlights || []), Recap: body.recap || "" });
      existingGameId = newGameId;
      result = { ok: true, gameId: newGameId, updated: false };
    }
    // Insert batting rows
    var gbSheet2 = getSheet_("GameBatting", ["Id","GameId","Player","AB","R","H","RBI","BB","SO","doubles","triples","HR","SB","HBP","SAC"]);
    (body.batting || []).forEach(function(b) {
      appendRowByHeaders_(gbSheet2, { Id: newId_(), GameId: existingGameId, Player: b.player, AB: b.ab, R: b.r, H: b.h, RBI: b.rbi, BB: b.bb, SO: b.so, doubles: b.doubles || 0, triples: b.triples || 0, HR: b.hr || 0, SB: b.sb || 0, HBP: b.hbp || 0, SAC: b.sac || 0 });
    });
    // Insert pitching rows
    var gpSheet2 = getSheet_("GamePitching", ["Id","GameId","Player","IP","H","R","ER","BB","SO","HR","BF","PC","Strikes","W","L","SV"]);
    (body.pitching || []).forEach(function(p) {
      appendRowByHeaders_(gpSheet2, { Id: newId_(), GameId: existingGameId, Player: p.player, IP: p.ip, H: p.h, R: p.r, ER: p.er, BB: p.bb, SO: p.so, HR: p.hr || 0, BF: p.bf || 0, PC: p.pc || 0, Strikes: p.strikes || 0, W: p.w || 0, L: p.l || 0, SV: p.sv || 0 });
    });
    result = result || { ok: true, gameId: existingGameId };
  } else if (body.action === "saveGameAtBats") {
    var gaSheet = getSheet_("GameAtBats", ["Id","GameId","Team","Player","Jersey","Inning","Result","Balls","Strikes","FieldedTo"]);
    // Delete existing at-bats for this game
    var gaData = gaSheet.getDataRange().getValues();
    var gaIdCol = gaData[0].indexOf("GameId");
    for (var i = gaData.length - 1; i >= 1; i--) {
      if (gaData[i][gaIdCol] === body.gameId) gaSheet.deleteRow(i + 1);
    }
    // Batch-write all at-bats in one setValues call to avoid timeout
    var absToWrite = body.atBats || [];
    if (absToWrite.length > 0) {
      var headers = ["Id","GameId","Team","Player","Jersey","Inning","Result","Balls","Strikes","FieldedTo"];
      headers.forEach(function(h) { ensureColumn_(gaSheet, h); });
      var colMap = {};
      var hRow = gaSheet.getRange(1, 1, 1, gaSheet.getLastColumn()).getValues()[0];
      hRow.forEach(function(h, i) { colMap[h] = i; });
      var numCols = gaSheet.getLastColumn();
      var startRow = gaSheet.getLastRow() + 1;
      var rows = absToWrite.map(function(ab) {
        var row = new Array(numCols).fill("");
        row[colMap["Id"]] = newId_();
        row[colMap["GameId"]] = body.gameId;
        row[colMap["Team"]] = ab.team;
        row[colMap["Player"]] = ab.player;
        row[colMap["Jersey"]] = ab.jersey;
        row[colMap["Inning"]] = ab.inning;
        row[colMap["Result"]] = ab.result;
        row[colMap["Balls"]] = ab.balls;
        row[colMap["Strikes"]] = ab.strikes;
        row[colMap["FieldedTo"]] = ab.fieldedTo || 0;
        return row;
      });
      gaSheet.getRange(startRow, 1, rows.length, numCols).setValues(rows);
    }
    result = { ok: true };
  } else if (body.action === "deleteGame") {
    var gSheet = getSheet_("Games", ["Id","Date","Opponent","HomeAway","TeamScore","OppScore","Notes","Highlights","Recap"]);
    var gData = gSheet.getDataRange().getValues();
    var gIdCol = gData[0].indexOf("Id");
    for (var i = gData.length - 1; i >= 1; i--) {
      if (gData[i][gIdCol] === body.gameId) { gSheet.deleteRow(i + 1); break; }
    }
    var gbSheet = getSheet_("GameBatting", ["Id","GameId","Player","AB","R","H","RBI","BB","SO","doubles","triples","HR","SB","HBP","SAC"]);
    var gbData = gbSheet.getDataRange().getValues();
    var gbIdCol = gbData[0].indexOf("GameId");
    for (var i = gbData.length - 1; i >= 1; i--) {
      if (gbData[i][gbIdCol] === body.gameId) gbSheet.deleteRow(i + 1);
    }
    var gpSheet = getSheet_("GamePitching", ["Id","GameId","Player","IP","H","R","ER","BB","SO","HR","BF","PC","Strikes","W","L","SV"]);
    var gpData = gpSheet.getDataRange().getValues();
    var gpIdCol = gpData[0].indexOf("GameId");
    for (var i = gpData.length - 1; i >= 1; i--) {
      if (gpData[i][gpIdCol] === body.gameId) gpSheet.deleteRow(i + 1);
    }
    var gaSheet2 = getSheet_("GameAtBats", ["Id","GameId","Team","Player","Jersey","Inning","Result","Balls","Strikes","FieldedTo"]);
    var gaData2 = gaSheet2.getDataRange().getValues();
    var gaIdCol2 = gaData2[0].indexOf("GameId");
    for (var i = gaData2.length - 1; i >= 1; i--) {
      if (gaData2[i][gaIdCol2] === body.gameId) gaSheet2.deleteRow(i + 1);
    }
    result = { ok: true };
  } else if (body.action === "logFundraiserSale") {
    var fsSheet = getSheet_(FUNDRAISER_SALES_SHEET, ["Id","FundraiserId","Player","Units","Date","CreatedAt"]);
    backfillIds_(fsSheet);
    appendRowByHeaders_(fsSheet, {
      Id: newId_(),
      FundraiserId: body.fundraiserId,
      Player: body.player,
      Units: body.units,
      Date: new Date().toISOString().slice(0, 10),
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true };
  } else {
    result = { error: "unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

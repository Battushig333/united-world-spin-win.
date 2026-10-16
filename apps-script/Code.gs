/*************************************************
 * UNITED WORLD - SPIN & WIN
 * Google Apps Script Website + Backend
 *************************************************/

const SHEET_NAME = "Spin Records";
const PROMOTION_END = new Date("2027-02-01T00:00:00+08:00");

const PRIZES = [
  { code: "ITP",  name: "ITP - $500",            value: 500 },
  { code: "CI",   name: "CI - $500",             value: 500 },
  { code: "HI",   name: "HI - $500",             value: 500 },
  { code: "AI",   name: "AI - $500",             value: 500 },
  { code: "TA",   name: "TA - $500",             value: 500 },
  { code: "WAT",  name: "WAT - $100",            value: 100 },
  { code: "HSSE", name: "HSSE - SEVIS FEE $220", value: 220 },
  { code: "SUSA", name: "SUSA - $500",           value: 500 },
  { code: "AP",   name: "AP - $500",             value: 500 },
  { code: "CCP",  name: "CCP - $200",            value: 200 }
];

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle("United World | Register. Spin. Win.");
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: "No request data received."
      });
    }
    const data = JSON.parse(e.postData.contents);
    if (data.action === "register") {
      return jsonResponse(registerParticipant(data));
    }
    if (data.action === "spin") {
      return jsonResponse(spinWheel(data));
    }
    return jsonResponse({
      success: false,
      error: "Unknown action."
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

function registerParticipant(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const name = clean(data.name);
    const email = clean(data.email).toLowerCase();
    const phone = clean(data.phone);

    if (!name || !email || !phone) {
      return {
        success: false,
        error: "Please provide your full name, email and phone number."
      };
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const existingEmail = String(rows[i][3]).trim().toLowerCase();
      const existingPhone = String(rows[i][4]).trim();

      if (existingEmail === email && existingPhone === phone) {
        return {
          success: false,
          error: "You have already registered.",
          entryId: rows[i][1]
        };
      }
    }

    const timestamp = new Date();
    const entryId = createEntryId(sheet);

    sheet.appendRow([
      timestamp,
      entryId,
      name,
      email,
      phone,
      "",
      "",
      "",
      0,
      PROMOTION_END,
      "REGISTERED"
    ]);

    return {
      success: true,
      entryId: entryId,
      message: "Registration successful."
    };
  } finally {
    lock.releaseLock();
  }
}

function spinWheel(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const entryId = clean(data.entryId);

    if (!entryId) {
      return {
        success: false,
        error: "Missing Entry ID."
      };
    }

    const now = new Date();

    if (now >= PROMOTION_END) {
      return {
        success: false,
        error: "This promotion has ended."
      };
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();

    let rowNumber = -1;
    let rowData = null;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) === entryId) {
        rowNumber = i + 1;
        rowData = rows[i];
        break;
      }
    }

    if (rowNumber === -1) {
      return {
        success: false,
        error: "Entry not found."
      };
    }

    const spinNumber = Number(rowData[8]) || 0;

    if (spinNumber >= 1) {
      return {
        success: false,
        error: "This entry has already used its spin."
      };
    }

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const prize = PRIZES[prizeIndex];

    sheet.getRange(rowNumber, 6).setValue(prize.code);
    sheet.getRange(rowNumber, 7).setValue(prize.name);
    sheet.getRange(rowNumber, 8).setValue(prize.value);
    sheet.getRange(rowNumber, 9).setValue(1);
    sheet.getRange(rowNumber, 10).setValue(PROMOTION_END);
    sheet.getRange(rowNumber, 11).setValue("VALID");

    return {
      success: true,
      entryId: entryId,
      prizeCode: prize.code,
      prize: prize.name,
      prizeValue: prize.value,
      validUntil: "February 1, 2027",
      spinNumber: 1
    };
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Sheet "' + SHEET_NAME + '" was not found.'
    );
  }

  return sheet;
}

function createEntryId(sheet) {
  const date = Utilities.formatDate(
    new Date(),
    "Asia/Ulaanbaatar",
    "yyyyMMdd"
  );

  const nextNumber = Math.max(sheet.getLastRow(), 1);

  return (
    "UW-" +
    date +
    "-" +
    String(nextNumber).padStart(6, "0")
  );
}

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


//Working Script Don't Delete
function processAttendanceForClass_0_10()  { processAttendanceForAllClassesInBatches(0, 10); }
function processAttendanceForClass_10_20() { processAttendanceForAllClassesInBatches(10, 10); }
function processAttendanceForClass_20_30() { processAttendanceForAllClassesInBatches(20, 10); }
function processAttendanceForClass_30_40() { processAttendanceForAllClassesInBatches(30, 10); }
function processAttendanceForClass_40_50() { processAttendanceForAllClassesInBatches(40, 10); }

function processAttendanceForAllClassesInBatches(startIndex = 0, batchSize = 10) {
  const masterFiles = DriveApp.getFilesByName("MasterData");
  if (!masterFiles.hasNext()) {
    Logger.log("❌ MasterData file not found by name.");
    return;
  }

  const masterFile = masterFiles.next();
  Logger.log("✅ MasterData file found: " + masterFile.getName());

  const masterData = SpreadsheetApp.open(masterFile);
  const classDetailsSheet = masterData.getSheetByName("ClassDetails");

  if (!classDetailsSheet) {
    Logger.log("❌ ClassDetails sheet not found in MasterData.");
    return;
  }

  Logger.log("✅ ClassDetails sheet found. Proceeding with class: " + startIndex);

  const headers = classDetailsSheet.getRange(1, 1, 1, classDetailsSheet.getLastColumn()).getValues()[0];
  const formIdIndex = headers.indexOf("FormID");
  const responseSheetIdIndex = headers.indexOf("ResponseSheetID");
  const classNameIndex = 0;

  const totalRows = classDetailsSheet.getLastRow() - 1;
  const classData = classDetailsSheet.getRange(2 + startIndex, 1, Math.min(batchSize, totalRows - startIndex), headers.length).getValues();

  const attendanceLogFile = DriveApp.getFilesByName("AttendanceLog").next();
  const logBook = SpreadsheetApp.open(attendanceLogFile);

  classData.forEach((row, index) => {
    const className = row[classNameIndex];
    const responseSheetId = row[responseSheetIdIndex];

    if (!className || !responseSheetId) {
      Logger.log(`⚠️ Skipping class (index ${startIndex + index}) due to missing className or responseSheetId`);
      return;
    }

    let responseSheet;
    try {
      responseSheet = SpreadsheetApp.openById(responseSheetId);
    } catch (e) {
      Logger.log(`❌ Could not open response sheet for ${className}: ${e.message}`);
      return;
    }

    const formResponses = responseSheet.getDataRange().getValues();
    if (formResponses.length <= 1) {
      Logger.log(`⚠️ No form responses found for ${className}, skipping processing.`);
      return;
    }

    Logger.log(`🔄 Processing attendance for class: ${className} (responses found: ${formResponses.length - 1})`);

    try {
      processAttendanceForSingleClass(className, masterData, logBook);
      Logger.log(`✅ Finished processing for ${className}`);
    } catch (err) {
      Logger.log(`❌ Error processing class ${className}: ${err.message}`);
    }
  });
}



function processAttendanceForSingleClass(className, masterData, logBook) {
  Logger.log(`@@SDK::Inside function processAttendanceForSingleClass`);

  try {
    const classDetailsSheet = masterData.getSheetByName("ClassDetails");
    const headers = classDetailsSheet.getRange(1, 1, 1, classDetailsSheet.getLastColumn()).getValues()[0];
    const classNames = classDetailsSheet.getRange(2, 1, classDetailsSheet.getLastRow() - 1, 1).getValues().flat();
    const classRowIndex = classNames.findIndex(name => name === className);
    if (classRowIndex === -1) {
      Logger.log(`❌ Class ${className} not found in ClassDetails.`);
      return;
    }

    Logger.log(`@@SDK::processing for className : ${className}`);
    const responseSheetId = classDetailsSheet.getRange(classRowIndex + 2, headers.indexOf("ResponseSheetID") + 1).getValue();

    if (!responseSheetId) {
      Logger.log(`⚠️ Skipping ${className} – No ResponseSheetID found.`);
      return;
    }

    const responseSheet = SpreadsheetApp.openById(responseSheetId);
    const formResponses = responseSheet.getDataRange().getValues();

    if (formResponses.length < 2) {
      Logger.log(`⚠️ Skipping ${className} – No actual responses.`);
      return;
    }

    const formHeader = formResponses[0];
    const dateColIndex = formHeader.findIndex(h => typeof h === "string" && h.toLowerCase().includes("attendance date"));
    const presentColIndex = formHeader.findIndex(h => typeof h === "string" && h.toLowerCase().includes("mark students"));

    if (dateColIndex === -1 || presentColIndex === -1) {
      Logger.log(`⚠️ Required columns not found for ${className}. Header: ${JSON.stringify(formHeader)}`);
      return;
    }

    const studentSheet = masterData.getSheetByName(className);
    if (!studentSheet) {
      Logger.log(`❌ Student sheet for class ${className} not found.`);
      return;
    }

    const studentData = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 2).getValues(); // RegId, Name
    const studentMap = {};
    studentData.forEach(([regId, name]) => {
      studentMap[regId.trim()] = name.trim();
    });

    let classLog = logBook.getSheetByName(className);
    if (!classLog) {
      classLog = logBook.insertSheet(className);
      classLog.appendRow(["RegId", "Student Name"]);
      Logger.log(`📘 Created log sheet for class: ${className}`);
    }

    const logHeader = classLog.getRange(1, 1, 1, classLog.getLastColumn()).getValues()[0];
    const regIdIndex = logHeader.indexOf("Student Name");
    const nameIndex = logHeader.indexOf("RegId");

    if (regIdIndex === -1 || nameIndex === -1) {
      Logger.log(`❌ Missing required headers in log sheet for ${className}`);
      return;
    }

    // ✅ Fix applied here to avoid getRange(0,...) issue
    let existingRegIds = [];
    const lastRow = classLog.getLastRow();
    if (lastRow > 1) {
      existingRegIds = classLog.getRange(2, regIdIndex + 1, lastRow - 1).getValues().flat();
    } else {
      Logger.log(`⚠️ No students yet in log sheet ${className}, will populate from MasterData.`);
    }

    studentData.forEach(([regId, name]) => {
      if (!existingRegIds.includes(regId)) {
        const row = [];
        row[regIdIndex] = regId;
        row[nameIndex] = name;
        classLog.appendRow(row);
      }
    });

    // Prepare for attendance
    const latestPerDate = {};
    
    Logger.log(`@SDKLogs:responses.length: ${formResponses.length} `);
/*
    for (let i = 1; i < formResponses.length; i++) {

      const response = formResponses[i];
      const dateRaw = response[dateColIndex];
      Logger.log(`@SDKLogs:response: ${response}`);
      Logger.log(`@SDKLogs: dateColIndex :${dateColIndex}`);
      Logger.log(`@SDKLogs: ${formResponses.length} for attendance date (dateRaw):${dateRaw}`);
      if (!dateRaw) continue;

      const dateKey = Utilities.formatDate(new Date(dateRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
      Logger.log(`📅 @SDKLog::Creating dateKey:${dateKey}`);
      latestPerDate[dateKey] = response;
    }
*/

    const response = formResponses[formResponses.length-1];
    const dateRaw = response[dateColIndex];
    const dateKey = Utilities.formatDate(new Date(dateRaw), Session.getScriptTimeZone(), "yyyy-MM-dd");
    latestPerDate[dateKey] = response;


    const totalStudents = classLog.getLastRow() - 1;
    const currentLogHeader = classLog.getRange(1, 1, 1, classLog.getLastColumn()).getValues()[0];
    Logger.log(`@SDKLogs::currentLogHeader: ${currentLogHeader}`);

    Object.entries(latestPerDate).forEach(([dateKey, response]) => {
      Logger.log(`📅 Processing date: ${dateKey}`);

      const presentEntries = response[presentColIndex]?.toString().split(",") || [];
      const presentRegIds = presentEntries.map(e => {
        const match = e.match(/\(([^)]+)\)/);
        return match ? match[1].trim() : null;
      }).filter(Boolean);
/*
      let dateColIndex = currentLogHeader.indexOf(dateKey);
      Logger.log(`@SDKLog: dateColIndex:-> ${dateColIndex}`);
      if (dateColIndex === -1) {
        dateColIndex = classLog.getLastColumn();
        classLog.getRange(1, dateColIndex + 1).setValue(dateKey);
        Logger.log(`📌 Added column for ${dateKey}`);
      } 
      else 
      {
        Logger.log(`↻ Updating existing column for ${dateKey}`);
      }
*/

// Normalize current headers to date format only
const normalizedHeaders = currentLogHeader.map(header => {
  if (typeof header === 'string' || header instanceof Date) {
    try {
      const parsedDate = new Date(header);
      return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch (e) {
      return header;
    }
  }
  return header;
});

let dateColIndex = normalizedHeaders.indexOf(dateKey);
Logger.log(`@SDKLog: dateColIndex:-> ${dateColIndex}`);

if (dateColIndex === -1) {
  dateColIndex = classLog.getLastColumn();
  classLog.getRange(1, dateColIndex + 1).setValue(dateKey);
  Logger.log(`📌 Added column for ${dateKey}`);
} else {
  Logger.log(`↻ Updating existing column for ${dateKey}`);
}

      const checkboxRange = classLog.getRange(2, dateColIndex + 1, totalStudents);
      checkboxRange.clearContent().insertCheckboxes();

      for (let r = 2; r <= totalStudents + 1; r++) {
        const rowRegId = classLog.getRange(r, regIdIndex + 1).getValue();
        const cell = classLog.getRange(r, dateColIndex + 1);
        const isPresent = presentRegIds.includes(rowRegId);
        cell.setValue(isPresent);
        cell.setBackground(isPresent ? "#c6efce" : "#ffc7ce");
      }
    });

    Logger.log(`✅ Attendance processed for class: ${className}`);

  } catch (error) {
    Logger.log(`❌ Error in processAttendanceForSingleClass (${className}): ${error.message}`);
  }
}





function functionToTransferStudents() {
  transferStudentToNewClass("DEA/25/0041", "Nursery-A", "Nursery-C");
}

function transferStudentToNewClass(regId, fromClass, toClass) {
  const masterFiles = DriveApp.getFilesByName("MasterData");
  if (!masterFiles.hasNext()) {
    Logger.log("❌ MasterData file not found.");
    return;
  }
  const masterData = SpreadsheetApp.open(masterFiles.next());
  const fromSheet = masterData.getSheetByName(fromClass);
  const toSheet = masterData.getSheetByName(toClass);
  if (!fromSheet || !toSheet) {
    Logger.log("❌ Class sheets not found.");
    return;
  }

  // Locate RegId column
  const fromData = fromSheet.getDataRange().getValues();
  const header = fromData[0];
  const regIdCol = header.indexOf("RegId");
  const studentNameCol = header.indexOf("StudentName");

  if (regIdCol === -1 || studentNameCol === -1) {
    Logger.log("❌ 'RegId' or 'StudentName' column not found in source sheet.");
    return;
  }

  // Find student row in source class
  const studentRow = fromData.findIndex((row, i) => i > 0 && row[regIdCol] === regId);
  if (studentRow === -1) {
    Logger.log(`❌ RegId ${regId} not found in ${fromClass}.`);
    return;
  }

  const studentData = fromData[studentRow];
  const studentName = studentData[studentNameCol];

  // Append to new class sheet if not present
  const toRegIds = toSheet.getRange(2, regIdCol + 1, toSheet.getLastRow() - 1).getValues().flat();
  if (!toRegIds.includes(regId)) {
    toSheet.appendRow(studentData);
    Logger.log(`✅ Student ${regId} moved to ${toClass}`);
  } else {
    Logger.log(`ℹ️ Student ${regId} already exists in ${toClass}`);
  }

  // Remove from old class sheet
  fromSheet.deleteRow(studentRow + 1); // +1 because header

  // Attendance transfer
  const attnFiles = DriveApp.getFilesByName("AttendanceLog");
  if (!attnFiles.hasNext()) {
    Logger.log("❌ AttendanceLog file not found.");
    return;
  }

  const logBook = SpreadsheetApp.open(attnFiles.next());
  const fromLog = logBook.getSheetByName(fromClass);
  const toLog = logBook.getSheetByName(toClass);

  if (!fromLog || !toLog) {
    Logger.log("⚠️ One or both attendance logs not found.");
    return;
  }

  // 🔍 Find RegId column in attendance logs
  const logHeader = fromLog.getRange(1, 1, 1, fromLog.getLastColumn()).getValues()[0];
  const regIdIndex = logHeader.indexOf("RegId");
  const nameIndex = logHeader.indexOf("Student Name");

  if (regIdIndex === -1 || nameIndex === -1) {
    Logger.log("❌ 'RegId' or 'Student Name' column missing in attendance log.");
    return;
  }

  // 🔍 Find student row in fromLog by RegId
  const fromRegIds = fromLog.getRange(2, regIdIndex + 1, fromLog.getLastRow() - 1).getValues().flat();
  const fromLogRowIndex = fromRegIds.findIndex(id => id === regId) + 2;

  if (fromLogRowIndex < 2) {
    Logger.log(`❌ RegId ${regId} not found in ${fromClass} log.`);
    return;
  }

  const fullRow = fromLog.getRange(fromLogRowIndex, 1, 1, fromLog.getLastColumn()).getValues()[0];

  // 🔍 Check if already in toLog
  const toRegIdsLog = toLog.getRange(2, regIdIndex + 1, toLog.getLastRow() - 1).getValues().flat();
  let toRowIndex = toRegIdsLog.findIndex(id => id === regId) + 2;

  if (toRowIndex < 2) {
    // Not found — append with RegId + Name
    const rowToAppend = new Array(toLog.getLastColumn()).fill('');
    rowToAppend[regIdIndex] = regId;
    rowToAppend[nameIndex] = studentName;
    toLog.appendRow(rowToAppend);
    toRowIndex = toLog.getLastRow();
  }

  const colCount = fromLog.getLastColumn();

  // ✅ Copy attendance data and preserve checkboxes
  for (let col = regIdIndex + 2; col <= colCount; col++) {
    const value = fullRow[col - 1];
    const range = toLog.getRange(toRowIndex, col);
    range.setValue(value);
    range.insertCheckboxes();

    // ✅ Add coloring
    if (value === true) {
      cell.setBackground("#d9ead3"); // Green
    } else if (value === false) {
      cell.setBackground("#f4cccc"); // Red
    } else {
      cell.setBackground(null); // Reset if not a boolean
    }
  }

  Logger.log(`✅ Attendance history moved to ${toClass} log with checkboxes.`);
  Logger.log(`🎯 Transfer complete for ${regId} (${studentName}) from ${fromClass} ➡️ ${toClass}`);

  }



function functionToTransferStudents() {
  transferStudentToNewClass("DEA/25/0187", "Nursery-A", "Nursery-C");
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

  // 🔍 Locate RegId column
  const fromData = fromSheet.getDataRange().getValues();
  const header = fromData[0];
  const regIdCol = header.indexOf("RegId");
  if (regIdCol === -1) {
    Logger.log("❌ 'RegId' column not found in source sheet.");
    return;
  }

  // 🔍 Find student row
  let studentRow = -1;
  for (let i = 1; i < fromData.length; i++) {
    if (fromData[i][regIdCol] === regId) {
      studentRow = i;
      break;
    }
  }
  if (studentRow === -1) {
    Logger.log(`❌ RegId ${regId} not found in ${fromClass}.`);
    return;
  }

  const studentData = fromData[studentRow];
  const studentName = studentData[0]; // Assuming StudentName is in col A

  // ✅ Append to new class if not already present
  const toRegIds = toSheet.getRange(2, regIdCol + 1, toSheet.getLastRow() - 1).getValues().flat();
  if (!toRegIds.includes(regId)) {
    toSheet.appendRow(studentData);
    Logger.log(`✅ Student ${regId} moved to ${toClass}`);
  } else {
    Logger.log(`ℹ️ Student ${regId} already exists in ${toClass}`);
  }

  // ❌ Remove from old class
  fromSheet.deleteRow(studentRow + 1); // +1 because of header

  // 🗂️ Transfer attendance
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

  // 🔍 Find row in fromLog
  const fromNames = fromLog.getRange(2, 1, fromLog.getLastRow() - 1).getValues().flat();
  const fromLogRowIndex = fromNames.findIndex(name => name && name.toString().trim() === studentName.toString().trim()) + 2;
  if (fromLogRowIndex < 2) {
    Logger.log(`❌ Student ${studentName} not found in ${fromClass} log.`);
    return;
  }

  // 📋 Get entire attendance row (excluding "Student Name" header)
  const fullRow = fromLog.getRange(fromLogRowIndex, 1, 1, fromLog.getLastColumn()).getValues()[0];

  // 🔍 Check if already in toLog
  const toLogNames = toLog.getRange(2, 1, toLog.getLastRow() - 1).getValues().flat();
  let toRowIndex = toLogNames.findIndex(name => name && name.toString().trim() === studentName.toString().trim()) + 2;

  if (toRowIndex < 2) {
    // Append and capture new row index
    toLog.appendRow([studentName]);
    toRowIndex = toLog.getLastRow();
  }

  const colCount = fromLog.getLastColumn();
  // ✅ Copy data and set checkbox formatting
  for (let col = 2; col <= colCount; col++) {
    const value = fullRow[col - 1];
    const range = toLog.getRange(toRowIndex, col);
    range.setValue(value);
    range.insertCheckboxes();
  }

  Logger.log(`✅ Attendance history moved to ${toClass} log with checkboxes.`);
  Logger.log(`🎯 Transfer complete for ${regId} (${studentName}) from ${fromClass} ➡️ ${toClass}`);
}

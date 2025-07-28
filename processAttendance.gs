
function processAttendanceForAllClasses(e) {
  const form = e.source;
  const className = form.getTitle().replace("Attendance For - ", "").trim();

  const files = DriveApp.getFilesByName("AttendanceLog");
  if (!files.hasNext()) {
    Logger.log("❌ AttendanceLog file not found.");
    return;
  }
  const attendanceLog = SpreadsheetApp.open(files.next());

  const masterFiles = DriveApp.getFilesByName("MasterData");
  if (!masterFiles.hasNext()) {
    Logger.log("❌ MasterData file not found.");
    return;
  }
  const masterData = SpreadsheetApp.open(masterFiles.next());
  const classSheet = masterData.getSheetByName(className);
  if (!classSheet) {
    Logger.log(`❌ Sheet not found in MasterData for class: ${className}`);
    return;
  }

  const studentNames = classSheet.getRange(2, 1, classSheet.getLastRow() - 1).getValues().flat();

  let logSheet = attendanceLog.getSheetByName(className);
  if (!logSheet) {
    logSheet = attendanceLog.insertSheet(className);
    logSheet.appendRow(["Student Name"]);
    studentNames.forEach(name => logSheet.appendRow([name]));
  }

  const itemResponses = e.response.getItemResponses();
  let selectedDate, presentStudents;

  for (const item of itemResponses) {
    const title = item.getItem().getTitle();
    if (title === "Select Attendance Date") {
      selectedDate = Utilities.formatDate(new Date(item.getResponse()), Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (title === "Mark students who are present") {
      presentStudents = item.getResponse();
    }
  }

  if (!selectedDate) {
    Logger.log("❌ No date selected in form.");
    return;
  }

  const headerRow = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
  let dateColIndex = headerRow.findIndex(h => {
    const hDate = Utilities.formatDate(new Date(h), Session.getScriptTimeZone(), "yyyy-MM-dd");
    return hDate === selectedDate;
  });

  if (dateColIndex === -1) {
    dateColIndex = headerRow.length;
    logSheet.getRange(1, dateColIndex + 1).setValue(selectedDate);
  }

  const sheetStudents = logSheet.getRange(2, 1, logSheet.getLastRow() - 1).getValues().flat();
  const studentRowMap = {};
  sheetStudents.forEach((name, i) => {
    studentRowMap[name.trim()] = i + 2;
  });

  const checkboxRange = logSheet.getRange(2, dateColIndex + 1, sheetStudents.length);
  checkboxRange.insertCheckboxes();
  checkboxRange.setValue(false);

  if (presentStudents && presentStudents.length) {
    presentStudents.forEach(name => {
      const row = studentRowMap[name.trim()];
      if (row) {
        logSheet.getRange(row, dateColIndex + 1).setValue(true);
      }
    });
  }

  Logger.log(`✅ Attendance updated for ${className} on ${selectedDate}`);
}


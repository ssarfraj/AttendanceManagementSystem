function processAttendanceForAllClasses() {
  const attendanceLogFile = DriveApp.getFilesByName("AttendanceLog");
  const masterDataFile = DriveApp.getFilesByName("MasterData");

  if (!attendanceLogFile.hasNext() || !masterDataFile.hasNext()) {
    Logger.log("❌ AttendanceLog or MasterData file not found.");
    return;
  }

  const attendanceLog = SpreadsheetApp.open(attendanceLogFile.next());
  const masterData = SpreadsheetApp.open(masterDataFile.next());

  const classDetailsSheet = masterData.getSheetByName("ClassDetails");
  const data = classDetailsSheet.getDataRange().getValues();
  const headers = data[0];

  const classNameIndex = headers.indexOf("Class");
  const responseSheetIdIndex = headers.indexOf("ResponseSheetID");

  if (classNameIndex === -1 || responseSheetIdIndex === -1) {
    Logger.log("❌ Required columns missing in ClassDetails.");
    return;
  }

  data.slice(1).forEach((row) => {
    const className = row[classNameIndex];
    const responseSheetId = row[responseSheetIdIndex];

    if (!className || !responseSheetId) return;

    try {
      const responseSheet = SpreadsheetApp.openById(responseSheetId).getSheets()[0];
      const responses = responseSheet.getDataRange().getValues();
      if (responses.length < 2) return;

      const responseHeaders = responses[0];
      const lastResponse = responses[responses.length - 1];

      const dateIndex = responseHeaders.indexOf("Select Attendance Date");
      const presentIndex = responseHeaders.indexOf("Mark students who are present");

      if (dateIndex === -1 || presentIndex === -1) {
        Logger.log(`❌ Required fields missing in form response for ${className}`);
        return;
      }

      const selectedDate = Utilities.formatDate(new Date(lastResponse[dateIndex]), Session.getScriptTimeZone(), "yyyy-MM-dd");
      const presentRaw = lastResponse[presentIndex];
      const presentEntries = typeof presentRaw === 'string'
        ? presentRaw.split(',').map(s => s.trim())
        : presentRaw;

      const presentRegIds = presentEntries.map(entry => {
        const match = entry.match(/^([^(]+?)\s*\(/);
        return match ? match[1].trim() : null;
      }).filter(Boolean);

      const classSheet = masterData.getSheetByName(className);
      if (!classSheet) return;

      const rawData = classSheet.getRange(2, 1, classSheet.getLastRow() - 1, 2).getValues(); // [RegId, Name]
      const studentData = rawData.map(([regId, name]) => [regId.trim(), name.trim()]);

      let logSheet = attendanceLog.getSheetByName(className);
      if (!logSheet) {
        logSheet = attendanceLog.insertSheet(className);
        logSheet.appendRow(["RegId", "Student Name"]);
        studentData.forEach(([regId, name]) => {
          logSheet.appendRow([regId, name]);
        });
      }

      const headerRow = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
      let dateColIndex = headerRow.findIndex(h => {
        try {
          return Utilities.formatDate(new Date(h), Session.getScriptTimeZone(), "yyyy-MM-dd") === selectedDate;
        } catch (e) {
          return false;
        }
      });

      if (dateColIndex === -1) {
        dateColIndex = headerRow.length;
        logSheet.getRange(1, dateColIndex + 1).setValue(selectedDate);
      }

      const sheetRegIds = logSheet.getRange(2, 1, logSheet.getLastRow() - 1).getValues().flat();
      const regIdRowMap = {};
      sheetRegIds.forEach((regId, i) => {
        regIdRowMap[regId.trim()] = i + 2;
      });

      const checkboxRange = logSheet.getRange(2, dateColIndex + 1, sheetRegIds.length);
      checkboxRange.insertCheckboxes();
      checkboxRange.setValue(false); // Default all to absent
      checkboxRange.setBackground("#f4cccc"); // Red for all initially

      presentRegIds.forEach(regId => {
        const row = regIdRowMap[regId];
        if (row) {
          const cell = logSheet.getRange(row, dateColIndex + 1);
          cell.setValue(true); // Mark present
          cell.setBackground("#d9ead3"); // Green
        }
      });

      Logger.log(`✅ Attendance updated for ${className} on ${selectedDate}`);
    } catch (err) {
      Logger.log(`❌ Error processing ${className}: ${err.message}`);
    }
  });
}

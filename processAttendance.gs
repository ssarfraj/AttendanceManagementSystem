function processAttendanceForAllClasses() {
  const attendanceLogFile = DriveApp.getFilesByName("AttendanceLog");
  const masterDataFile = DriveApp.getFilesByName("MasterData");

  if (!attendanceLogFile.hasNext() || !masterDataFile.hasNext()) {
    Logger.log("❌ AttendanceLog or MasterData file not found.");
    return;
  }
  else
  {
    Logger.log("@SDKLogs::AttendanceLog & MasterData file found.");
  }

  const attendanceLog = SpreadsheetApp.open(attendanceLogFile.next());
  const masterData = SpreadsheetApp.open(masterDataFile.next());

  const classDetailsSheet = masterData.getSheetByName("ClassDetails");
  const data = classDetailsSheet.getDataRange().getValues();
  const headers = data[0];

  const classNameIndex = headers.indexOf("Class");
  const formIdIndex = headers.indexOf("FormID");
  const responseSheetIdIndex = headers.indexOf("ResponseSheetID");

  if (classNameIndex === -1 || formIdIndex === -1 || responseSheetIdIndex === -1) 
  {
    Logger.log("❌ Required columns missing in ClassDetails.");
    return;
  }
  else
  {
    Logger.log("Required columns are found in ClassDetails.");
    Logger.log(`@SDKLogs: responseSheetIdIndex: ${responseSheetIdIndex}`);
  }

  data.slice(1).forEach((row) => {
    const className = row[classNameIndex];
    const responseSheetId = row[responseSheetIdIndex];

    if (!className || !responseSheetId) 
    {
      Logger.log(`className: ${className} or  responseSheetId : ${responseSheetId} is not found `);
      return;
    }
    else
    {
      Logger.log(`className: ${className} and  responseSheetId : ${responseSheetId} is found `);
    }
   

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

      // 🟡 Extract RegIds from "DEA/24/0003 (Name)"
      const presentRegIds = presentEntries.map(entry => {
        const match = entry.match(/^([^(]+?)\s*\(/); // Extracts everything before " ("
        return match ? match[1].trim() : null;
      }).filter(Boolean);

      Logger.log(`Present Ids After Extraction : ${presentRegIds}`);
      const classSheet = masterData.getSheetByName(className);
      if (!classSheet) {
        Logger.log('@SDKLogs :classSheet Not Found ');
        return;
      }


      const rawData = classSheet.getRange(2, 1, classSheet.getLastRow() - 1, 2).getValues(); // [RegId, Name]
      const studentData = rawData.map(([regId, name]) => [regId.trim(), name.trim()]);
 


      let logSheet = attendanceLog.getSheetByName(className);
      if (!logSheet) {
        logSheet = attendanceLog.insertSheet(className);
        logSheet.appendRow(["Student Name", "RegId"]);

        studentData.forEach(([regId, name]) => {          
          logSheet.appendRow([regId, name]);
        });
      }

      const headerRow = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
      let dateColIndex = headerRow.findIndex(h => {
        try {
          return Utilities.formatDate(new Date(h), Session.getScriptTimeZone(), "yyyy-MM-dd") === selectedDate;
        }
        catch (e) {
          return false;
        }
      });

      if (dateColIndex === -1) {
        dateColIndex = headerRow.length;
        logSheet.getRange(1, dateColIndex + 1).setValue(selectedDate);
      }

      const sheetRegIds = logSheet.getRange(2, 1, logSheet.getLastRow() - 1).getValues().flat(); // RegId column
      const regIdRowMap = {};
      sheetRegIds.forEach((regId, i) => {
        regIdRowMap[regId.trim()] = i + 2;
      });

      const checkboxRange = logSheet.getRange(2, dateColIndex + 1, sheetRegIds.length);
      checkboxRange.insertCheckboxes();
      checkboxRange.setValue(false); // Mark all absent by default

      presentRegIds.forEach(regId => {
        const row = regIdRowMap[regId];
        if (row) {
          logSheet.getRange(row, dateColIndex + 1).setValue(true); // Mark present
        }
      });

      Logger.log(`✅ Attendance updated for ${className} on ${selectedDate}`);
    } catch (err) {
      Logger.log(`❌ Error processing ${className}: ${err.message}`);
    }
  });
}

function cleanBatch1() { removeDuplicateDateColumnsBatch(0, 10); }
function cleanBatch2() { removeDuplicateDateColumnsBatch(10, 10); }
function cleanBatch3() { removeDuplicateDateColumnsBatch(20, 10); }
function cleanBatch4() { removeDuplicateDateColumnsBatch(30, 10); }
function cleanBatch5() { removeDuplicateDateColumnsBatch(40, 10); }


function removeDuplicateDateColumnsBatch(startIndex = 0, batchSize = 10) {
  const file = DriveApp.getFilesByName("AttendanceLog").next();
  const ss = SpreadsheetApp.open(file);
  const sheets = ss.getSheets();

  const endIndex = Math.min(startIndex + batchSize, sheets.length);

  for (let s = startIndex; s < endIndex; s++) {
    const sheet = sheets[s];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // Skip sheets without attendance data
    if (lastRow < 2 || lastCol <= 2) {
      Logger.log(`⚠️ Skipping sheet '${sheet.getName()}': No attendance data.`);
      continue;
    }

    Logger.log(`🔍 Checking sheet: ${sheet.getName()}`);

    // Get header row (convert all to trimmed strings)
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().trim());

    // Map to track latest occurrence of each date
    const latestColIndexForDate = {};

    for (let col = 2; col < headers.length; col++) { // start from col=2 (index 2 => 3rd column in sheet)
      const header = headers[col];
      if (!header || header.toLowerCase() === "student name" || header.toLowerCase() === "regid") continue;
      latestColIndexForDate[header] = col; // overwrite => keeps rightmost occurrence
    }

    // Find duplicates (columns that are NOT the latest occurrence)
    const columnsToDelete = [];
    for (let col = 2; col < headers.length; col++) {
      const header = headers[col];
      if (!header) continue;
      if (latestColIndexForDate[header] !== col) {
        columnsToDelete.push(col + 1); // +1 because sheet columns are 1-based
      }
    }

    // Delete duplicates from right to left so indexes don’t shift
    columnsToDelete.sort((a, b) => b - a);
    columnsToDelete.forEach(colNum => {
      sheet.deleteColumn(colNum);
      Logger.log(`🗑️ Deleted duplicate date column ${colNum} in '${sheet.getName()}'`);
    });

    Logger.log(`✅ Finished cleaning sheet: ${sheet.getName()}`);
  }

  Logger.log(`📌 Processed sheets ${startIndex + 1} to ${endIndex} of ${sheets.length}`);
}

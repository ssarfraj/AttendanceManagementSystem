function convertBatch1() {
  convertAttendanceLogToCheckboxesBatch(0, 10); // Sheets 1–10
}

function convertBatch2() {
  convertAttendanceLogToCheckboxesBatch(10, 10); // Sheets 11–20
}

function convertBatch3() {
  convertAttendanceLogToCheckboxesBatch(20, 10); // Sheets 21–30
}

function convertBatch4() {
  convertAttendanceLogToCheckboxesBatch(30, 10); // Sheets 31–40
}

function convertBatch5() {
  convertAttendanceLogToCheckboxesBatch(40, 10); // Sheets 41–50
}

function convertBatch6() {
  convertAttendanceLogToCheckboxesBatch(50, 1); // Sheets 41–50
}





function convertAttendanceLogToCheckboxesBatch(startIndex = 0, batchSize = 10) {
  const file = DriveApp.getFilesByName("AttendanceLog").next();
  const ss = SpreadsheetApp.open(file);
  const sheets = ss.getSheets();

  // Determine the batch
  const endIndex = Math.min(startIndex + batchSize, sheets.length);

  for (let s = startIndex; s < endIndex; s++) {
    const sheet = sheets[s];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // Skip empty sheets or those without attendance data
    if (lastRow < 2 || lastCol <= 2) {
      Logger.log(`⚠️ Skipping sheet '${sheet.getName()}': No attendance data.`);
      continue;
    }

    Logger.log(`Processing sheet: ${sheet.getName()}`);

    // Process columns from 3rd column onwards
    for (let col = 3; col <= lastCol; col++) {
      const range = sheet.getRange(2, col, lastRow - 1, 1);
      const values = range.getValues();

      range.insertCheckboxes();

      values.forEach((row, i) => {
        const val = row[0];
        const cell = sheet.getRange(i + 2, col);

        if (val === true || val === "TRUE") {
          cell.setValue(true).setBackground("#b7e1cd"); // green
        } else {
          cell.setValue(false).setBackground("#f4c7c3"); // red
        }
      });
    }
  }

  Logger.log(`✅ Processed sheets ${startIndex + 1} to ${endIndex} of ${sheets.length}.`);
}


// Wrappers for easy triggering
function swapColumnsAandB_Batch_0_10()  { swapColumnsAandB_Batch(0, 10); }
function swapColumnsAandB_Batch_10_10() { swapColumnsAandB_Batch(10, 10); }
function swapColumnsAandB_Batch_20_10() { swapColumnsAandB_Batch(20, 10); }
function swapColumnsAandB_Batch_30_10() { swapColumnsAandB_Batch(30, 10); }
function swapColumnsAandB_Batch_40_10() { swapColumnsAandB_Batch(40, 10); }
function swapColumnsAandB_Batch_50_1() { swapColumnsAandB_Batch(50, 1); }


function swapColumnsAandB_Batch(startIndex, batchSize) {
  const file = DriveApp.getFilesByName("AttendanceLog").next();
  const ss = SpreadsheetApp.open(file);
  const sheets = ss.getSheets();

  for (let i = startIndex; i < Math.min(startIndex + batchSize, sheets.length); i++) {
    const sheet = sheets[i];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue; // Skip sheets with only headers or empty

    // Get column A and B data (excluding headers)
    const colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const colB = sheet.getRange(2, 2, lastRow - 1, 1).getValues();

    // Swap the values
    sheet.getRange(2, 1, colB.length, 1).setValues(colB);
    sheet.getRange(2, 2, colA.length, 1).setValues(colA);
  }

  Logger.log(`✅ Processed sheets from index ${startIndex} to ${Math.min(startIndex + batchSize - 1, sheets.length - 1)}`);
}

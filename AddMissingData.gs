// === CONFIG ===
const ATT_START_DATE = new Date('2025-08-01'); // first expected attendance date
const SKIP_SUNDAYS = false;                      // set false if you DO want Sundays added

/**
 * Add missing date columns (in chronological order) for sheets in a batch.
 * startIndex: zero-based index of sheet to start from
 * batchSize: number of sheets to process in this run
 */
function addMissingAttendanceDatesBatch(startIndex, batchSize) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const endIndex = Math.min(startIndex + batchSize, sheets.length);
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let s = startIndex; s < endIndex; s++) {
    const sheet = sheets[s];
    const sheetName = sheet.getName();

    // Skip sheet if no student rows (assumes header is row 1)
    if (sheet.getLastRow() <= 1) {
      Logger.log(`Skipped sheet ${sheetName} - no student data`);
      continue;
    }

    // Build list of all expected dates once per sheet
    const allDates = getAllDatesInRange(ATT_START_DATE, today, SKIP_SUNDAYS);

    // For each expected date, check whether header already has it; if not, insert at proper position
    for (let dt of allDates) {
      const targetTime = normalizeDate(dt).getTime();

      // Re-read header and lastColumn every iteration (this avoids stale indexes)
      const lastColumn = sheet.getLastColumn();
      let headerDates = [];
      if (lastColumn >= 3) { // date columns start at column 3 (C)
        const headerRangeWidth = lastColumn - 2; // number of cells from C..lastColumn
        const headerValues = sheet.getRange(1, 3, 1, headerRangeWidth).getValues()[0];
        for (let idx = 0; idx < headerValues.length; idx++) {
          const val = headerValues[idx];
          if (val === '' || val === null || typeof val === 'undefined') continue;
          let dtObj = null;
          if (val instanceof Date) dtObj = normalizeDate(val);
          else {
            const parsed = new Date(val);
            if (!isNaN(parsed)) dtObj = normalizeDate(parsed);
          }
          if (dtObj) headerDates.push({ time: dtObj.getTime(), col: idx + 3 }); // actual sheet col = idx + 3
        }
        // Ensure headerDates sorted by time (columns should usually be sorted but be safe)
        headerDates.sort((a,b) => a.time - b.time);
      }

      // If date already exists, continue
      if (headerDates.some(h => h.time === targetTime)) continue;

      // Find insertion position:
      // - If there is a header date > target date, insert BEFORE that column.
      // - Otherwise append to end (insert after lastColumn).
      let insertBeforeCol = null;
      for (let h of headerDates) {
        if (h.time > targetTime) { insertBeforeCol = h.col; break; }
      }

      let newCol;
      if (insertBeforeCol !== null) {
        sheet.insertColumnBefore(insertBeforeCol);
        newCol = insertBeforeCol;
      } else {
        // append at end
        const curLastCol = sheet.getLastColumn();
        sheet.insertColumnAfter(curLastCol);
        newCol = curLastCol + 1;
      }

      // Write date header (use Date object so Google Sheets treats it as date)
      sheet.getRange(1, newCol).setValue(new Date(targetTime));

      // Recompute lastRow and insert checkboxes only if student rows exist
      const lastRow = sheet.getLastRow();
      const numStudentRows = Math.max(lastRow - 1, 0);
      if (numStudentRows > 0 && newCol <= sheet.getLastColumn()) {
        try {
          sheet.getRange(2, newCol, numStudentRows, 1).insertCheckboxes();
        } catch (e) {
          // Defensive: if insertCheckboxes fails for some reason, clear the cell range instead of crashing
          Logger.log(`Warning: failed to insert checkboxes at sheet ${sheetName} col ${newCol}: ${e}`);
        }
      }

      Logger.log(`Added missing date ${new Date(targetTime).toDateString()} in sheet ${sheetName} at column ${newCol}`);
      // continue to next expected date (we re-read header in next loop iteration)
    } // end per-date loop
  } // end per-sheet loop
}

/* Helpers */

/** return normalized date (midnight) */
function normalizeDate(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

/** returns array of Date objects from start..end (inclusive). If skipSundays true, excludes Sundays. */
function getAllDatesInRange(start, end, skipSundays) {
  const out = [];
  const cur = normalizeDate(start);
  const last = normalizeDate(end);
  while (cur <= last) {
    if (!(skipSundays && cur.getDay() === 0)) {
      out.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/* --- Batch wrappers for ~50 sheets (5 per batch) --- */
function addBatch1()  { addMissingAttendanceDatesBatch(0, 5); }
function addBatch2()  { addMissingAttendanceDatesBatch(5, 5); }
function addBatch3()  { addMissingAttendanceDatesBatch(10, 5); }
function addBatch4()  { addMissingAttendanceDatesBatch(15, 5); }
function addBatch5()  { addMissingAttendanceDatesBatch(20, 5); }
function addBatch6()  { addMissingAttendanceDatesBatch(25, 5); }
function addBatch7()  { addMissingAttendanceDatesBatch(30, 5); }
function addBatch8()  { addMissingAttendanceDatesBatch(35, 5); }
function addBatch9()  { addMissingAttendanceDatesBatch(40, 5); }
function addBatch10()  { addMissingAttendanceDatesBatch(45, 5); }

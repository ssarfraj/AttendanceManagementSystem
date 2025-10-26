function createForms_0_10()  { createOrUpdateFormsInBatches(0, 10);  }
function createForms_10_20() { createOrUpdateFormsInBatches(10, 10); }
function createForms_20_30() { createOrUpdateFormsInBatches(20, 10); }
function createForms_30_40() { createOrUpdateFormsInBatches(30, 10); }
function createForms_40_50() { createOrUpdateFormsInBatches(40, 10); }

function createOrUpdateFormsInBatches(startIndex = 0, batchSize = 10) {
  const masterFile = DriveApp.getFilesByName("Test_MasterData").next();
  const masterData = SpreadsheetApp.open(masterFile);
  const parentFolder = masterFile.getParents().next();

  const formsFolder = getOrCreateSubFolder(parentFolder, "Forms");
  const responsesFolder = getOrCreateSubFolder(parentFolder, "ResponseSheets");

  const classDetailsSheet = masterData.getSheetByName("ClassDetails");
  const headers = classDetailsSheet.getRange(1, 1, 1, classDetailsSheet.getLastColumn()).getValues()[0];
  const classData = classDetailsSheet.getRange(2 + startIndex, 1, Math.min(batchSize, classDetailsSheet.getLastRow() - 1 - startIndex), headers.length).getValues();

  const formLinkIndex = headers.indexOf("FormLinks");
  const formIdIndex = headers.indexOf("FormID");
  const responseIdIndex = headers.indexOf("ResponseSheetID");

  classData.forEach((row, idx) => {
    const classIndex = startIndex + idx;
    const className = row[0];
    const timing = row[1];
    const teacher = row[2];
    const oldFormId = row[formIdIndex];
    const responseSheetId = row[responseIdIndex];

    if (!className) return;
    const studentSheet = masterData.getSheetByName(className);
    if (!studentSheet) return;

    // Delete old form only
    if (oldFormId) {
      try {
        const oldFormFile = DriveApp.getFileById(oldFormId);
        oldFormFile.setTrashed(true);
      } catch (e) {
        Logger.log(`⚠️ Could not delete old form for ${className}: ${e}`);
      }
    }

    const studentData = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 2).getValues();
    const form = FormApp.create(`Attendance For - ${className}`);

    DriveApp.getFileById(form.getId()).moveTo(formsFolder);
    form.setDescription(`Class Timing: ${timing}\nTeacher: ${teacher}`);
    form.addDateItem().setTitle("Select Attendance Date").setRequired(true);

    const choices = studentData.map(([regId, name]) => `${name.trim()} (${regId.trim()})`);
    form.addCheckboxItem().setTitle("Mark students who are present").setChoiceValues(choices);

    if (responseSheetId) {
      try {
        form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheetId);
      } catch (e) {
        Logger.log(`❌ Failed to link existing response sheet for ${className}: ${e}`);
      }
    } else {
      const newSheet = SpreadsheetApp.create(`Responses - ${className}`);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, newSheet.getId());
      DriveApp.getFileById(newSheet.getId()).moveTo(responsesFolder);
      classDetailsSheet.getRange(classIndex + 2, responseIdIndex + 1).setValue(newSheet.getId());
    }

    classDetailsSheet.getRange(classIndex + 2, formLinkIndex + 1).setValue(form.getPublishedUrl());
    classDetailsSheet.getRange(classIndex + 2, formIdIndex + 1).setValue(form.getId());
  });
}

function getOrCreateSubFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}




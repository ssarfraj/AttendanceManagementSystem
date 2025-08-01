function createOrUpdateFormsForAllClasses() {
  const masterFiles = DriveApp.getFilesByName("MasterData");
  if (!masterFiles.hasNext()) {
    Logger.log("❌ MasterData file not found.");
    return;
  }

  const masterFile = masterFiles.next();
  const masterData = SpreadsheetApp.open(masterFile);
  const parentFolder = masterFile.getParents().next();

  const formsFolder = getOrCreateSubFolder(parentFolder, "Forms");
  const responsesFolder = getOrCreateSubFolder(parentFolder, "ResponseSheets");

  const classDetailsSheet = masterData.getSheetByName("ClassDetails");
  const headers = classDetailsSheet.getRange(1, 1, 1, classDetailsSheet.getLastColumn()).getValues()[0];
  const classData = classDetailsSheet.getRange(2, 1, classDetailsSheet.getLastRow() - 1, headers.length).getValues();

  const formLinkIndex = headers.indexOf("FormLinks");
  const formIdIndex = headers.indexOf("FormID");
  const responseIdIndex = headers.indexOf("ResponseSheetID");

  classData.forEach((row, idx) => {
    const className = row[0];
    const timing = row[1];
    const teacher = row[2];
    const email = row[3];
    const mobile = row[4];
    const oldFormId = row[formIdIndex];
    const responseSheetId = row[responseIdIndex];

    if (!className) return;

    const studentSheet = masterData.getSheetByName(className);
    if (!studentSheet) {
      Logger.log(`❌ Student sheet for ${className} not found.`);
      return;
    }

    // ❌ Delete old form if exists
    if (oldFormId) {
      try {
        DriveApp.getFileById(oldFormId).setTrashed(true);
        Logger.log(`🗑️ Deleted old form for ${className}`);
      } catch (e) {
        Logger.log(`⚠️ Could not delete old form for ${className}: ${e}`);
      }
    }

    // ✅ Read student data
    const studentData = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 2).getValues(); // [RegId, Name]

    // ✅ Create new form
    const form = FormApp.create(`Attendance For - ${className}`);
    DriveApp.getFileById(form.getId()).moveTo(formsFolder);
    form.setDescription(`Class Timing: ${timing}\nTeacher: ${teacher}`);

    const today = new Date();
    form.addDateItem()
        .setTitle("Select Attendance Date")
        .setRequired(true)
        .setHelpText("Default is today, change if needed.");

    // ✅ Format: RegId (Name)
    const studentChoices = studentData.map(([regId, name]) => `${regId.trim()} (${name.trim()})`);
    form.addCheckboxItem().setTitle("Mark students who are present").setChoiceValues(studentChoices);

    if (responseSheetId) {
      try {
        const responseSheet = SpreadsheetApp.openById(responseSheetId);
        form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheetId);
        Logger.log(`📄 Reused old response sheet for ${className}`);
      } catch (e) {
        Logger.log(`❌ Failed to reuse response sheet for ${className}: ${e}`);
        return;
      }
    } else {
      const newResponseSheet = SpreadsheetApp.create(`Responses - ${className}`);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, newResponseSheet.getId());
      DriveApp.getFileById(newResponseSheet.getId()).moveTo(responsesFolder);
      classDetailsSheet.getRange(idx + 2, responseIdIndex + 1).setValue(newResponseSheet.getId());
    }

    classDetailsSheet.getRange(idx + 2, formLinkIndex + 1).setValue(form.getPublishedUrl());
    classDetailsSheet.getRange(idx + 2, formIdIndex + 1).setValue(form.getId());

    Logger.log(`✅ Created form for ${className}`);
  });
}

function getOrCreateSubFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

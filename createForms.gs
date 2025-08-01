function createOrUpdateFormsForAllClasses() {
  Logger.clear(); // Clear previous logs

  const masterFiles = DriveApp.getFilesByName("MasterData");
  if (!masterFiles.hasNext()) {
    Logger.log("❌ MasterData file not found.");
    return;
  }

  const masterFile = masterFiles.next();
  const masterData = SpreadsheetApp.open(masterFile);
  Logger.log("📄 Opened MasterData file.");

  const parentFolder = masterFile.getParents().next();
  Logger.log("📁 Located parent folder.");

  const formsFolder = getOrCreateSubFolder(parentFolder, "Forms");
  Logger.log("📁 Ready: Forms folder.");

  const responsesFolder = getOrCreateSubFolder(parentFolder, "ResponseSheets");
  Logger.log("📁 Ready: ResponseSheets folder.");

  const classDetailsSheet = masterData.getSheetByName("ClassDetails");
  if (!classDetailsSheet) {
    Logger.log("❌ 'ClassDetails' sheet not found.");
    return;
  }

  const headers = classDetailsSheet.getRange(1, 1, 1, classDetailsSheet.getLastColumn()).getValues()[0];
  const classData = classDetailsSheet.getRange(2, 1, classDetailsSheet.getLastRow() - 1, headers.length).getValues();

  // Ensure headers
  const ensureHeader = (header) => {
    let index = headers.indexOf(header);
    if (index === -1) {
      headers.push(header);
      classDetailsSheet.getRange(1, headers.length).setValue(header);
      Logger.log(`🔧 Added missing column header: ${header}`);
      index = headers.length - 1;
    }
    return index;
  };

  const formLinkIndex = ensureHeader("FormLinks");
  const formIdIndex = ensureHeader("FormId");
  const responseIdIndex = ensureHeader("ResponseSheetId");

  classData.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const className = row[0];
    const timing = row[1];
    const teacher = row[2];
    const email = row[3];
    const mobile = row[4];

    if (!className) {
      Logger.log(`⚠️ Skipping row ${rowIndex}: ClassName missing.`);
      return;
    }

    const studentSheet = masterData.getSheetByName(className);
    if (!studentSheet) {
      Logger.log(`⚠️ Skipping class '${className}': Sheet not found in MasterData.`);
      return;
    }

    try {
      const studentData = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 2).getValues();
      Logger.log(`👨‍🎓 Fetched ${studentData.length} students for ${className}.`);

      const form = FormApp.create(`Attendance For - ${className}`);
      Logger.log(`📝 Created form: ${form.getId()} for ${className}`);

      DriveApp.getFileById(form.getId()).moveTo(formsFolder);
      form.setDescription(`Class Timing: ${timing}\nTeacher: ${teacher}`);
      form.addDateItem().setTitle("Select Attendance Date").setRequired(true);

      const studentChoices = studentData.map(([regId, name]) => `${regId.trim()} (${name.trim()})`);
      form.addCheckboxItem().setTitle("Mark students who are present").setChoiceValues(studentChoices);
      Logger.log(`✅ Added checkbox list for ${studentChoices.length} students.`);

      const responseSheet = SpreadsheetApp.create(`Responses - ${className}`);
      Logger.log(`📄 Created response sheet: ${responseSheet.getId()} for ${className}`);

      SpreadsheetApp.openById(responseSheet.getId());
      Utilities.sleep(1000); // Allow propagation

      form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheet.getId());
      DriveApp.getFileById(responseSheet.getId()).moveTo(responsesFolder);
      Logger.log(`🔗 Linked response sheet to form for ${className}.`);

      classDetailsSheet.getRange(rowIndex, formLinkIndex + 1).setValue(form.getPublishedUrl());
      classDetailsSheet.getRange(rowIndex, formIdIndex + 1).setValue(form.getId());
      classDetailsSheet.getRange(rowIndex, responseIdIndex + 1).setValue(responseSheet.getId());
      Logger.log(`🟢 Updated ClassDetails row for ${className}.`);
    } catch (err) {
      Logger.log(`❌ Error creating form for ${className}: ${err.message}`);
    }
  });

  Logger.log("✅ All classes processed.");
}

function getOrCreateSubFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : parent.createFolder(name);
  Logger.log(`📁 Checked/Created subfolder: ${name}`);
  return folder;
}

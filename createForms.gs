function createOrUpdateFormsForAllClasses() {
  clearAllFormTriggers(); // ✅ Clear old triggers

  const masterSheet = SpreadsheetApp.getActiveSpreadsheet();
  const classSheet = masterSheet.getSheetByName('ClassDetails');
  const data = classSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const className = data[i][0];
    const timing = data[i][1];
    const teacherName = data[i][2];
    const formId = data[i][4];
    const responseSheetId = data[i][5];

    if (!className || !teacherName) continue;

    const studentSheet = masterSheet.getSheetByName(className);
    if (!studentSheet) {
      Logger.log(`❌ No student sheet found for class: ${className}`);
      continue;
    }

    const studentNames = studentSheet
      .getRange(2, 1, studentSheet.getLastRow() - 1)
      .getValues()
      .flat()
      .filter(name => name && name.trim() !== "");

    let form;
    if (formId) {
      try {
        form = FormApp.openById(formId);
        Logger.log(`✅ Opened existing form for ${className}`);
      } catch (e) {
        Logger.log(`⚠️ Failed to open form for ${className}. Creating new.`);
        form = FormApp.create(`Attendance For - ${className}`);
        classSheet.getRange(i + 1, 5).setValue(form.getId()); // Column E
      }
    } else {
      form = FormApp.create(`Attendance For - ${className}`);
      classSheet.getRange(i + 1, 5).setValue(form.getId()); // Column E
      Logger.log(`🆕 Created new form for ${className}`);
    }

    form.setTitle(`Attendance For - ${className}`);
    form.setDescription(`Timing: ${timing}\nTeacher: ${teacherName}`);

    // ✅ Remove old items
    form.getItems().forEach(item => form.deleteItem(item));

    // ✅ Add date picker
    const dateItem = form.addDateItem();
    dateItem.setTitle("Select Attendance Date").setRequired(true);

    // ✅ Add student checkbox
    const checkbox = form.addCheckboxItem();
    checkbox.setTitle("Mark students who are present");
    checkbox.setChoiceValues(studentNames);

    // ✅ Set response sheet if not set
    let destinationId;
    try {
      destinationId = form.getDestinationId();
    } catch (e) {
      Logger.log(`ℹ️ No destination linked for ${className}`);
    }

    if (!destinationId) {
      const responseSheet = SpreadsheetApp.create(`Responses_${className}`);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheet.getId());
      Utilities.sleep(3000);
      destinationId = responseSheet.getId();
    }

    classSheet.getRange(i + 1, 6).setValue(destinationId); // Column F

    // ✅ Generate prefilled URL with today’s date
    const formResponse = form.createResponse();
    const today = new Date();
    formResponse.withItemResponse(dateItem.createResponse(today));
    const prefilledUrl = formResponse.toPrefilledUrl();
    classSheet.getRange(i + 1, 7).setValue(prefilledUrl); // Column G

    // ✅ Attach trigger
    ScriptApp.newTrigger('processAttendanceForAllClasses')
      .forForm(form)
      .onFormSubmit()
      .create();

    Logger.log(`📌 Trigger attached for ${className}`);
  }

  Logger.log("🎯 All forms updated successfully with triggers and prefilled dates.");
}

function clearAllFormTriggers() {
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processAttendanceForAllClasses') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log("🧹 Cleared all old form submission triggers.");
}

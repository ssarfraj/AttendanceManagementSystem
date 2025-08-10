function processAttendanceForClass_0_10() {
  cleanupCurrentTrigger_(); // remove this trigger after run
  processAttendanceForAllClassesInBatches(0, 10);
  scheduleNextTrigger_("processAttendanceForClass_10_20", 10); // 10 mins later
}

function processAttendanceForClass_10_20() {
  cleanupCurrentTrigger_();
  processAttendanceForAllClassesInBatches(10, 10);
  scheduleNextTrigger_("processAttendanceForClass_20_30", 10);
}

function processAttendanceForClass_20_30() {
  cleanupCurrentTrigger_();
  processAttendanceForAllClassesInBatches(20, 10);
  scheduleNextTrigger_("processAttendanceForClass_30_40", 10);
}

function processAttendanceForClass_30_40() {
  cleanupCurrentTrigger_();
  processAttendanceForAllClassesInBatches(30, 10);
  scheduleNextTrigger_("processAttendanceForClass_40_50", 10);
}

function processAttendanceForClass_40_50() {
  cleanupCurrentTrigger_();
  processAttendanceForAllClassesInBatches(40, 10);
  // last batch — no more triggers
}

/**
 * Creates a one-time trigger for a function X minutes from now
 */
function scheduleNextTrigger_(funcName, minutesLater) {
  const runTime = new Date();
  runTime.setMinutes(runTime.getMinutes() + minutesLater);
  ScriptApp.newTrigger(funcName)
    .timeBased()
    .at(runTime)
    .create();
}

/**
 * Deletes the current trigger after it runs
 */
function cleanupCurrentTrigger_() {
  const thisFuncName = arguments.callee.caller.name;
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === thisFuncName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

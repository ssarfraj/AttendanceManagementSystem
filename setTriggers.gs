function processAttendanceForClass_0_10() {
  processAttendanceForAllClassesInBatches(0, 10);
  scheduleNextTrigger("processAttendanceForClass_10_20", 30); // 30 mins later
}

function processAttendanceForClass_10_20() {
  processAttendanceForAllClassesInBatches(10, 10);
  scheduleNextTrigger("processAttendanceForClass_20_30", 20); // 20 mins later
}

function processAttendanceForClass_20_30() {
  processAttendanceForAllClassesInBatches(20, 10);
  scheduleNextTrigger("processAttendanceForClass_30_40", 15); // 15 mins later
}

function processAttendanceForClass_30_40() {
  processAttendanceForAllClassesInBatches(30, 10);
  scheduleNextTrigger("processAttendanceForClass_40_50", 10); // 10 mins later
}

function processAttendanceForClass_40_50() {
  processAttendanceForAllClassesInBatches(40, 10);
  // Last one — no further scheduling
}

function scheduleNextTrigger(funcName, minutesLater) {
  const runTime = new Date();
  runTime.setMinutes(runTime.getMinutes() + minutesLater);
  ScriptApp.newTrigger(funcName)
    .timeBased()
    .at(runTime)
    .create();
}

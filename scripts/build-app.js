const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const tasks = [
  { name: 'bundleRelease (Production App Bundle - triggers versioning)', cmd: 'bundleRelease', release: true },
  { name: 'assembleRelease (Production APK - triggers versioning)', cmd: 'assembleRelease', release: true },
  { name: 'assembleDebug (Debug APK)', cmd: 'assembleDebug', release: false },
  { name: 'installRelease (Install Production to device)', cmd: 'installRelease', release: true },
  { name: 'installDebug (Install Debug to device)', cmd: 'installDebug', release: false }
];

console.log('\n=== MINTYPOS BUILD RUNNER ===\n');
console.log('Select a Gradle task to run:');
tasks.forEach((t, i) => {
  console.log(`[${i + 1}] ${t.name}`);
});

rl.question('\nEnter option number (1-5): ', (taskOption) => {
  const selectedTaskIndex = parseInt(taskOption, 10) - 1;
  if (isNaN(selectedTaskIndex) || selectedTaskIndex < 0 || selectedTaskIndex >= tasks.length) {
    console.error('Invalid option selected.');
    rl.close();
    process.exit(1);
  }

  const selectedTask = tasks[selectedTaskIndex];

  rl.question('Do you want to run "npx expo prebuild" first? (y/n): ', (prebuildAnswer) => {
    const runPrebuild = prebuildAnswer.toLowerCase() === 'y';

    rl.close();

    try {
      // 1. Run Prebuild if selected
      if (runPrebuild) {
        console.log('\n--- Running Expo Prebuild ---');
        execSync('npx expo prebuild --no-install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      }

      // 2. Run Versioning if it's a release task
      if (selectedTask.release) {
        console.log('\n--- Running Versioning Script ---');
        execSync('node scripts/build-versioning.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      }

      // 3. Run selected Gradle command
      console.log(`\n--- Running Gradle: ${selectedTask.cmd} ---`);
      const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
      const androidDir = path.join(__dirname, '../android');

      execSync(`${gradlewCmd} ${selectedTask.cmd}`, { stdio: 'inherit', cwd: androidDir });

      console.log('\n=== BUILD RUNNER COMPLETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('\nBuild failed with error:', error.message);
      process.exit(1);
    }
  });
});

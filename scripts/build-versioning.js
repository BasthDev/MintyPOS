const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const packageJsonPath = path.join(__dirname, '../package.json');
const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');

console.log('--- STARTING VERSIONING UPDATE ---');

// 1. Read & update app.json
if (!fs.existsSync(appJsonPath)) {
  console.error('Error: app.json not found!');
  process.exit(1);
}
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = appJson.expo.version || '1.0.0';
const currentVersionCode = appJson.expo.android?.versionCode || 1;

// Split and increment patch version
const versionParts = currentVersion.split('.').map(Number);
if (versionParts.length === 3 && !versionParts.some(isNaN)) {
  versionParts[2] += 1;
} else {
  versionParts[0] = 1;
  versionParts[1] = 0;
  versionParts[2] = 1;
}
const newVersion = versionParts.join('.');
const newVersionCode = currentVersionCode + 1;

appJson.expo.version = newVersion;
if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = newVersionCode;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Updated app.json: version -> ${newVersion}, versionCode -> ${newVersionCode}`);

// 2. Read & update package.json
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated package.json: version -> ${newVersion}`);
}

// 3. Read & update android/app/build.gradle
if (fs.existsSync(buildGradlePath)) {
  let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');

  // Replace versionCode
  gradleContent = gradleContent.replace(
    /versionCode\s+\d+/,
    `versionCode ${newVersionCode}`
  );

  // Replace versionName
  gradleContent = gradleContent.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${newVersion}"`
  );

  fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
  console.log(`Updated android/app/build.gradle: versionCode -> ${newVersionCode}, versionName -> "${newVersion}"`);
} else {
  console.warn('Warning: android/app/build.gradle not found, skipping native gradle file update.');
}

console.log('--- VERSIONING UPDATE SUCCESSFUL ---');

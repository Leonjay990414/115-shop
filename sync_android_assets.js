const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'index');
const targets = [
  path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public'),
  'D:\\APP1\\app\\src\\main\\assets\\public'
];

function cleanAndSync(destDir) {
  if (fs.existsSync(destDir)) {
    console.log(`Cleaning existing assets: ${destDir}`);
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  copyRecursive(srcDir, destDir);
  console.log(`Synced index/ to ${destDir} successfully!`);
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    // Skip large downloaded APK files inside assets/downloads to avoid recursive APK bloat
    if (entry.name.endsWith('.apk')) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Also copy src/ (system config & services) into assets as well so relative paths work if needed
function copySrcService(destRoot) {
  const srcServiceDir = path.join(__dirname, 'src');
  const targetSrc = path.join(destRoot, 'src');
  if (fs.existsSync(srcServiceDir)) {
    if (!fs.existsSync(targetSrc)) fs.mkdirSync(targetSrc, { recursive: true });
    copyRecursive(srcServiceDir, targetSrc);
    console.log(`Synced src/ to ${targetSrc}`);
  }
}

for (const dest of targets) {
  cleanAndSync(dest);
  // Also place src next to public if needed:
  const parentAssets = path.dirname(dest);
  copySrcService(parentAssets);
}

console.log('Sync complete.');

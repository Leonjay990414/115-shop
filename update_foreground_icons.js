const fs = require('fs');
const path = require('path');
const { createPng, renderLogo } = require('./generate_icons');

const SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

for (const { dir, size } of SIZES) {
  const fullDir = path.join(resDir, dir);
  // ic_launcher
  fs.writeFileSync(path.join(fullDir, 'ic_launcher.png'), createPng(size, size, (x, y, w, h) => renderLogo(x, y, w, h, false)));
  // ic_launcher_round
  fs.writeFileSync(path.join(fullDir, 'ic_launcher_round.png'), createPng(size, size, (x, y, w, h) => renderLogo(x, y, w, h, true)));
  // ic_launcher_foreground (so adaptive icon also renders 115)
  fs.writeFileSync(path.join(fullDir, 'ic_launcher_foreground.png'), createPng(size, size, (x, y, w, h) => renderLogo(x, y, w, h, false)));
}

console.log('Updated all mipmap icons including ic_launcher_foreground.png!');

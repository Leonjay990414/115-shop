const fs = require('fs');
const path = require('path');
const { createPng, renderLogo } = require('./generate_icons');

// Sizes for Android mipmaps
const SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Target directories
const targetMipmapRoots = [
  path.join(__dirname, 'android', 'app', 'src', 'main', 'res'),
  'D:\\APP1\\app\\src\\main\\res'
];

// 1. Generate index/images/logo115.png (512x512)
const webLogo = createPng(512, 512, (x, y, w, h) => renderLogo(x, y, w, h, false));
const imgDir = path.join(__dirname, 'index', 'images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
fs.writeFileSync(path.join(imgDir, 'logo115.png'), webLogo);
console.log('Created index/images/logo115.png');

// 2. Generate icons for all targets
for (const rootDir of targetMipmapRoots) {
  for (const { dir, size } of SIZES) {
    const fullDir = path.join(rootDir, dir);
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

    // Standard squircle icon
    const iconPng = createPng(size, size, (x, y, w, h) => renderLogo(x, y, w, h, false));
    fs.writeFileSync(path.join(fullDir, 'ic_launcher.png'), iconPng);

    // Round icon
    const roundPng = createPng(size, size, (x, y, w, h) => renderLogo(x, y, w, h, true));
    fs.writeFileSync(path.join(fullDir, 'ic_launcher_round.png'), roundPng);

    // Also remove any leftover webp in APP1 to ensure PNG takes priority or replace them
    try {
      const webpPath = path.join(fullDir, 'ic_launcher.webp');
      const roundWebpPath = path.join(fullDir, 'ic_launcher_round.webp');
      if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
      if (fs.existsSync(roundWebpPath)) fs.unlinkSync(roundWebpPath);
    } catch (e) {}

    console.log(`Generated ${dir} icons (${size}x${size}) in ${rootDir}`);
  }
}

console.log('All icons generated successfully!');

// ============================================================================
// Generates STARTVATE launcher icons + splash screens for Android.
// Run: node scripts/generate-icons.mjs
//
// Produces:
//   - Legacy square + round launcher icons (mipmap-*)
//   - Adaptive icon foreground layers (mipmap-*/ic_launcher_foreground.png)
//   - Splash images (drawable*/splash.png)
// ============================================================================
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android/app/src/main/res');

const ORANGE_A = '#E08A5F';
const ORANGE_B = '#D0602F';
const CREAM = '#F7F5F0';

/** The four-point spark mark, centered in a `size` viewBox at `scale` of it. */
function sparkPath(size, scale) {
  const c = size / 2;
  const r = (size / 2) * scale; // outer radius
  const i = r * 0.34; // inner radius
  const pts = [
    [c, c - r],
    [c + i, c - i],
    [c + r, c],
    [c + i, c + i],
    [c, c + r],
    [c - i, c + i],
    [c - r, c],
    [c - i, c - i],
  ];
  return 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L') + ' Z';
}

/** Full launcher icon: orange gradient tile with a cream spark. */
function iconSvg(size) {
  const radius = size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${ORANGE_A}"/><stop offset="1" stop-color="${ORANGE_B}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <path d="${sparkPath(size, 0.56)}" fill="${CREAM}"/>
</svg>`;
}

/** Round variant for launchers that mask to a circle. */
function roundIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${ORANGE_A}"/><stop offset="1" stop-color="${ORANGE_B}"/>
    </linearGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
  <path d="${sparkPath(size, 0.56)}" fill="${CREAM}"/>
</svg>`;
}

/**
 * Adaptive-icon foreground: transparent, with the mark inside the safe zone.
 * Android crops the outer ~1/3, so the mark is kept small and centered.
 */
function foregroundSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <path d="${sparkPath(size, 0.38)}" fill="${CREAM}"/>
</svg>`;
}

/** Splash: brand mark centered on the app background. */
function splashSvg(w, h, dark) {
  const bg = dark ? '#1B1A18' : CREAM;
  const markSize = Math.min(w, h) * 0.3;
  const x = (w - markSize) / 2;
  const y = (h - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="${x}" y1="${y}" x2="${x + markSize}" y2="${y + markSize}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${ORANGE_A}"/><stop offset="1" stop-color="${ORANGE_B}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <g transform="translate(${x} ${y})">
    <path d="${sparkPath(markSize, 0.92)}" fill="url(#g)"/>
  </g>
</svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

async function write(relPath, buf) {
  const full = join(RES, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, buf);
  console.log('  ✓', relPath);
}

// Launcher icon densities (px) — legacy 48dp base, foreground 108dp base.
const LAUNCHER = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
const FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};
// Splash sizes per density/orientation.
const SPLASH_PORT = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
};
const SPLASH_LAND = {
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
};

console.log('Generating launcher icons…');
for (const [dir, size] of Object.entries(LAUNCHER)) {
  await write(`${dir}/ic_launcher.png`, await png(iconSvg(size)));
  await write(`${dir}/ic_launcher_round.png`, await png(roundIconSvg(size)));
}

console.log('Generating adaptive foregrounds…');
for (const [dir, size] of Object.entries(FOREGROUND)) {
  await write(`${dir}/ic_launcher_foreground.png`, await png(foregroundSvg(size)));
}

/**
 * Android requires resource qualifiers in a fixed order:
 * orientation → night → density. So "drawable-port-hdpi" becomes
 * "drawable-port-night-hdpi", not "drawable-port-hdpi-night".
 */
function nightDir(dir) {
  const parts = dir.split('-');
  const density = parts.pop(); // hdpi / xhdpi / …
  return [...parts, 'night', density].join('-');
}

console.log('Generating splash screens…');
for (const [dir, [w, h]] of Object.entries({ ...SPLASH_PORT, ...SPLASH_LAND })) {
  await write(`${dir}/splash.png`, await png(splashSvg(w, h, false)));
  // -night variants keep the splash consistent with the app's dark theme.
  await write(`${nightDir(dir)}/splash.png`, await png(splashSvg(w, h, true)));
}
// Default (density-less) splash used as a fallback.
await write('drawable/splash.png', await png(splashSvg(720, 1280, false)));
await write('drawable-night/splash.png', await png(splashSvg(720, 1280, true)));

// Play Store listing icon (not bundled, handy to have).
await mkdir(join(ROOT, 'store'), { recursive: true });
await writeFile(join(ROOT, 'store/icon-512.png'), await png(iconSvg(512)));
console.log('  ✓ store/icon-512.png');

console.log('\nDone.');

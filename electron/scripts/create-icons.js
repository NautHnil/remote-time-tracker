#!/usr/bin/env node

/**
 * Remote Time Tracker - Icon Generator
 *
 * Tạo icons cho Mac, Windows, Linux
 * - PNG files (tất cả platforms)
 * - ICO file (Windows) - nếu có png2icons
 * - ICNS file (macOS) - nếu có png2icons
 *
 * Cách dùng:
 *   npm run create-icons
 *
 * Nếu lần đầu chạy:
 *   1. Script sẽ tự động cài sharp và png2icons
 *   2. Chạy lại lần 2 để tạo icons
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const assetsDir = path.join(__dirname, "../assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// SVG Icon Design - Clock/Timer với recording indicator
const createSVGIcon = (size = 512) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>

  <circle cx="256" cy="256" r="240" fill="url(#grad1)"/>
  <circle cx="256" cy="256" r="200" fill="white" opacity="0.9"/>

  <g stroke="#1d4ed8" stroke-width="6" opacity="0.7">
    <line x1="256" y1="76" x2="256" y2="106"/>
    <line x1="436" y1="256" x2="406" y2="256"/>
    <line x1="256" y1="436" x2="256" y2="406"/>
    <line x1="76" y1="256" x2="106" y2="256"/>
  </g>

  <g stroke="#1d4ed8" stroke-width="10" stroke-linecap="round">
    <line x1="256" y1="256" x2="206" y2="156"/>
    <line x1="256" y1="256" x2="356" y2="206"/>
  </g>

  <circle cx="256" cy="256" r="16" fill="#1d4ed8"/>
  <circle cx="256" cy="380" r="24" fill="#ef4444"/>
</svg>`;
};

async function main() {
  console.log("🚀 Remote Time Tracker - Icon Generator\n");

  // Check dependencies
  let hasSharp = false;
  let hasPng2icons = false;

  try {
    require.resolve("sharp");
    hasSharp = true;
    console.log("✅ Sharp found");
  } catch (e) {
    console.log("❌ Sharp not found");
  }

  try {
    require.resolve("png2icons");
    hasPng2icons = true;
    console.log("✅ png2icons found");
  } catch (e) {
    console.log("❌ png2icons not found");
  }

  // Install if needed
  if (!hasSharp || !hasPng2icons) {
    console.log("\n📦 Installing dependencies...\n");

    const packages = [];
    if (!hasSharp) packages.push("sharp@0.33.1");
    if (!hasPng2icons) packages.push("png2icons");

    try {
      execSync(`npm install --no-save ${packages.join(" ")}`, {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
      console.log("\n✅ Dependencies installed!");
      console.log("💡 Please run again: npm run create-icons\n");
      execSync("npm run create-icons", {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Failed to install dependencies");
      console.error(
        "💡 Try: cd electron && npm install --no-save sharp png2icons\n",
      );
      process.exit(1);
    }
  }

  // Load modules
  const sharp = require("sharp");

  console.log("\n🎨 Creating icons...\n");

  // 1. Create PNG files
  console.log("📄 PNG files:");
  const svgBuffer = Buffer.from(createSVGIcon(512));
  const sizes = [
    { name: "icon.png", size: 512 }, // Linux + base
    { name: "icon-256.png", size: 256 }, // Windows
    { name: "icon-128.png", size: 128 },
    { name: "icon-64.png", size: 64 },
    { name: "icon-32.png", size: 32 },
    { name: "icon-16.png", size: 16 },
    { name: "tray-icon.png", size: 32 }, // Tray
    { name: "tray-icon@2x.png", size: 64 },
    { name: "tray-iconTemplate.png", size: 16 }, // macOS template (will be set as template image)
    { name: "tray-iconTemplate@2x.png", size: 32 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(assetsDir, name));
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // 2. Try to create ICO (Windows)
  console.log("\n🪟 Windows ICO:");
  try {
    const png2icons = require("png2icons");
    const pngBuffers = [
      fs.readFileSync(path.join(assetsDir, "icon-256.png")),
      fs.readFileSync(path.join(assetsDir, "icon-128.png")),
      fs.readFileSync(path.join(assetsDir, "icon-64.png")),
      fs.readFileSync(path.join(assetsDir, "icon-32.png")),
      fs.readFileSync(path.join(assetsDir, "icon-16.png")),
    ];

    const output = png2icons.createICO(pngBuffers);
    if (output && output.length > 0) {
      fs.writeFileSync(path.join(assetsDir, "icon.ico"), output);
      console.log("  ✅ icon.ico created");
    } else {
      throw new Error("ICO output is empty");
    }

    // Create tray icon ICO for Windows (smaller sizes only)
    const trayPngBuffers = [
      fs.readFileSync(path.join(assetsDir, "icon-32.png")),
      fs.readFileSync(path.join(assetsDir, "icon-16.png")),
    ];
    const trayOutput = png2icons.createICO(trayPngBuffers);
    if (trayOutput && trayOutput.length > 0) {
      fs.writeFileSync(path.join(assetsDir, "tray-icon.ico"), trayOutput);
      console.log("  ✅ tray-icon.ico created");
    }
  } catch (error) {
    console.log("  ⚠️  Could not create ICO:", error.message);
    console.log("  ℹ️  Electron Builder will auto-convert PNG → ICO");
    console.log("  ℹ️  Or use: https://convertio.co/png-ico/");
  }

  // 3. Try to create ICNS (macOS)
  console.log("\n🍎 macOS ICNS:");
  try {
    const png2icons = require("png2icons");
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
    const pngBuffers = [];
    const svgLarge = Buffer.from(createSVGIcon(1024));

    for (const size of icnsSizes) {
      const buffer = await sharp(svgLarge)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
    }

    const output = png2icons.createICNS(pngBuffers);
    if (output && output.length > 0) {
      fs.writeFileSync(path.join(assetsDir, "icon.icns"), output);
      console.log("  ✅ icon.icns created");
    } else {
      throw new Error("ICNS output is empty");
    }
  } catch (error) {
    console.log("  ⚠️  Could not create ICNS:", error.message);
    console.log("  ℹ️  Electron Builder will auto-convert PNG → ICNS on Mac");
    console.log("  ℹ️  Or use: iconutil (macOS) or online tool");
  }

  // Summary
  console.log("\n✅ Icon generation complete!\n");
  console.log("📂 Created files:");
  const files = fs.readdirSync(assetsDir).sort();
  files.forEach((file) => {
    const stats = fs.statSync(path.join(assetsDir, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   - ${file.padEnd(22)} (${sizeKB} KB)`);
  });

  console.log("\n💡 Tips:");
  console.log("   - PNG files are ready for all platforms");
  console.log("   - Electron Builder will auto-generate ICO/ICNS if missing");
  console.log("   - Run `npm run build` to create installers\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
});

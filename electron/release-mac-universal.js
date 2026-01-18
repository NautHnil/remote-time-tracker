// release-mac-universal.js
// Script build universal DMG cho Electron app (macOS arm64 + x64)
// Yêu cầu: electron-builder, lipo, fs-extra

const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

const distDir = path.resolve(__dirname, "release");
const arm64App = path.join(distDir, "mac-arm64/Remote Time Tracker.app");
x64App = path.join(distDir, "mac/Remote Time Tracker.app");
universalApp = path.join(distDir, "mac-universal/Remote Time Tracker.app");

function mergeUniversalBinary() {
  // Tạo thư mục universal
  fs.removeSync(universalApp);
  fs.copySync(arm64App, universalApp);

  // Merge các binary chính (Electron, native modules)
  const electronBinArm = path.join(arm64App, "Contents/MacOS/Electron");
  const electronBinX64 = path.join(x64App, "Contents/MacOS/Electron");
  const electronBinUniversal = path.join(
    universalApp,
    "Contents/MacOS/Electron"
  );

  execSync(
    `lipo -create -output "${electronBinUniversal}" "${electronBinArm}" "${electronBinX64}"`
  );

  // Merge các native module cần thiết (ví dụ: sharp)
  // Merge sharp.node
  const sharpNodeArm = path.join(
    arm64App,
    "Contents/Resources/app.asar.unpacked/node_modules/sharp/build/Release/sharp.node"
  );
  const sharpNodeX64 = path.join(
    x64App,
    "Contents/Resources/app.asar.unpacked/node_modules/sharp/build/Release/sharp.node"
  );
  const sharpNodeUniversal = path.join(
    universalApp,
    "Contents/Resources/app.asar.unpacked/node_modules/sharp/build/Release/sharp.node"
  );
  if (fs.existsSync(sharpNodeArm) && fs.existsSync(sharpNodeX64)) {
    execSync(
      `lipo -create -output "${sharpNodeUniversal}" "${sharpNodeArm}" "${sharpNodeX64}"`
    );
    console.log("✅ sharp.node universal merged");
  } else {
    console.warn(
      "⚠️ sharp.node not found in one of the arch builds, skipping merge"
    );
  }
}

function buildUniversalDMG() {
  // Build DMG từ app universal
  execSync(
    "npx electron-builder --mac --universal --config electron-builder.universal.json",
    { stdio: "inherit" }
  );
}

function main() {
  mergeUniversalBinary();
  buildUniversalDMG();
  console.log("✅ Universal DMG built!");
}

main();

#!/bin/bash
cp -r ./electron/release/*.dmg ./update-server
cp -r ./electron/release/*.exe ./update-server
cp -r ./electron/release/*.zip ./update-server
cp -r ./electron/release/*.blockmap ./update-server
cp -r ./electron/release/latest.yml ./update-server
cp -r ./electron/release/latest-mac.yml ./update-server
cp -r ./electron/release/latest-linux.yml ./update-server
echo "Release files copied to update-server directory."
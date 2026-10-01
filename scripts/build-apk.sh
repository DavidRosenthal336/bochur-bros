#!/usr/bin/env bash
#
# Builds the flip-phone app: public/downloads/bochur-bros-flip.apk.
#
# The whole game, offline, in an Android app you copy onto the phone from a
# computer — for the CAT S22 Flip and phones like it, which have no browser.
# See android/ for the app itself and src/util/flip.ts for what changes in the
# game on a keypad.
#
# Needs no Android Studio and no Gradle: only the Android tools Ubuntu packages.
#
#   sudo apt-get install aapt zipalign apksigner dalvik-exchange android-sdk-platform-23
#   npm run build:apk
#
# The APK lands in public/, so the website serves it too, at
# /downloads/bochur-bros-flip.apk.
set -euo pipefail
cd "$(dirname "$0")/.."

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
KEYSTORE=android/bochur-bros.keystore
OUT=build/apk
APK=public/downloads/bochur-bros-flip.apk

for tool in aapt zipalign apksigner dalvik-exchange javac keytool; do
  command -v "$tool" >/dev/null || { echo "missing: $tool (see the top of this script)"; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "missing: $ANDROID_JAR (apt-get install android-sdk-platform-23)"; exit 1; }

# The signing key. Every version of the app has to be signed with the same one,
# or the phone refuses to install it over the last and the only way forward is
# to uninstall — which loses the saved game. So it is made once and kept in the
# repository. It proves nothing to anyone else; it is only ever this app's.
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storepass bochurbros -keypass bochurbros \
    -alias bochurbros -keyalg RSA -keysize 2048 -validity 36500 \
    -dname "CN=Bochur Bros, O=Bochur Bros" >/dev/null
fi

rm -rf "$OUT"
mkdir -p "$OUT/assets/www" "$OUT/classes" "$(dirname "$APK")"

# 1. The game, built for an old WebView (see vite.config.ts).
npm run typecheck
npm run build:maps
BOCHUR_FLIP=1 npx vite build --outDir dist-flip --emptyOutDir
cp -r dist-flip/. "$OUT/assets/www/"
# Never an APK inside the APK.
rm -rf "$OUT/assets/www/downloads"

# 2. The app around it. The version code is the commit count, so each build
#    installs over the one before.
VERSION_CODE=$(git rev-list --count HEAD)
VERSION_NAME="1.0.$VERSION_CODE"
aapt package -f \
  -M android/AndroidManifest.xml -S android/res -A "$OUT/assets" -I "$ANDROID_JAR" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 arsc \
  -F "$OUT/unsigned.apk"

javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find android/src -name '*.java')
dalvik-exchange --dex --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && aapt add -f unsigned.apk classes.dex >/dev/null)

# 3. Aligned, then signed (in that order, or the signature breaks).
zipalign -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
apksigner sign --ks "$KEYSTORE" --ks-pass pass:bochurbros --key-pass pass:bochurbros \
  --ks-key-alias bochurbros --v4-signing-enabled false --out "$APK" "$OUT/aligned.apk"
apksigner verify "$APK"

echo
echo "Built $APK ($VERSION_NAME, $(du -h "$APK" | cut -f1))"

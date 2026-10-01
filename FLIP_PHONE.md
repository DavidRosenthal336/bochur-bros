# Bochur Bros on a flip phone

The whole game as an Android app, for flip phones with a keypad and no browser
— built for the **CAT S22 Flip** (Android 11) and phones like it. It needs no
internet: everything is inside the app, and saved progress stays on the phone.

**The file:** `public/downloads/bochur-bros-flip.apk`, also at
<https://bochur-bros.vercel.app/downloads/bochur-bros-flip.apk>.

## Putting it on the phone

1. Download the APK on a computer.
2. Plug the phone into the computer with its USB cable. On the phone, when it
   asks what the USB connection is for, choose **File transfer**.
3. On the computer, open the phone's storage and copy the APK into its
   **Download** folder.
4. On the phone, open **Files** (or **File manager**), go to **Download**, select
   `bochur-bros-flip.apk`, and choose **Install**. If the phone asks whether to
   allow installing apps from this source, allow it.

**On a filtered phone** the last step is the one the filter usually blocks. If it
says installing is not allowed, or there is no file manager to open the APK
with, that is the filter's decision rather than a fault in the file: send the
APK to your filter provider and ask them to approve or install it. It asks for
no permissions at all — not even the internet — which is the easiest kind of
app for a filter to approve.

A newer version installs straight over an older one and keeps the saved game.

## The keys

    1 jump left    2 jump          3 jump right
    4 left         5 jump          6 right
    7 run on/off   8 duck          9 use your form
                   0 swap brothers

The D-pad moves too, and its up and middle buttons jump. **8 in mid-air** is
Berel's ground pound. **Back** goes from a level to the map, and from the map
closes the game. The key guide stays on screen under the game the whole time.

Every move is one key, because a phone keypad often cannot register two at
once: that is why the diagonal jumps have keys of their own and running is a
switch rather than something you hold.

## Building it

    sudo apt-get install aapt zipalign apksigner dalvik-exchange android-sdk-platform-23
    npm run build:apk

No Android Studio, no Gradle. See `scripts/build-apk.sh` and `android/`. The
signing key is `android/bochur-bros.keystore`; keep using the same one, or the
phone will refuse to update the app without uninstalling it (and the save).

To try the phone version on a computer, open the site with `?flip` on the
address and use the number keys.

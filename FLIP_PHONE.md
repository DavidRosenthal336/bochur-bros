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

## The buttons

The phone's own buttons are the controls:

| Button | Does |
| --- | --- |
| D-pad left / right | walk |
| D-pad up, or OK (the middle button) | jump — hold it for a higher jump |
| D-pad down | duck; in mid-air, Berel's ground pound |
| Left soft key | swap brothers |
| Right soft key | use your form (Menorah throws, Lulav swings) |
| Call, or ✱ | run on/off |
| Back | from a level, the map; from the map, close the game |

The labels over the two soft keys are shown along the bottom of the screen, and
a guide to every button stays on screen under the game.

The number pad works as well, for anyone who prefers it:

    1 jump left    2 jump          3 jump right
    4 left         5 jump          6 right
    7 run on/off   8 duck          9 use your form
                   0 swap brothers

Every move is one button, because a phone keypad often cannot register two at
once: that is why the diagonal jumps have keys of their own and running is a
switch rather than something you hold. The clear key does nothing, so it can
never wipe the saved game.

The app catches every button itself and passes it to the game, rather than
leaving it to the phone's web engine — which on a flip phone may send the D-pad
to a focus ring and drop the soft keys, Call and ✱ altogether.

## Building it

    sudo apt-get install aapt zipalign apksigner dalvik-exchange android-sdk-platform-23
    npm run build:apk

No Android Studio, no Gradle. See `scripts/build-apk.sh` and `android/`. The
signing key is `android/bochur-bros.keystore`; keep using the same one, or the
phone will refuse to update the app without uninstalling it (and the save).

To try the phone version on a computer, open the site with `?flip` on the
address and use the number keys.

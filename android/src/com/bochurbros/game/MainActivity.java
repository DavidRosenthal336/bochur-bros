package com.bochurbros.game;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * The game, in a WebView, served out of the app's own files.
 *
 * The game is a web page, and a web page wants to be fetched from a web
 * address: its scripts are modules, and a browser will not run module scripts
 * from a plain file. So the page is loaded from a made-up https address, and
 * every request to that address is answered here, from the copy of the game
 * packed into the app under assets/www. Nothing ever goes to the network —
 * the address does not exist anywhere else — which is why the app needs no
 * internet permission and works on a phone with none.
 *
 * Saved progress lives in the page's local storage, which belongs to that
 * address, so it is kept between plays and across updates of the app.
 */
public class MainActivity extends Activity {
    private static final String ORIGIN = "https://bochurbros.local/";
    private WebView web;
    /** Game keys currently held, so they can all be let go if the app is left. */
    private final Set<Integer> held = new HashSet<Integer>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xff0d0f1a);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // How the page knows it is on the flip phone: see src/util/flip.ts.
        settings.setUserAgentString(settings.getUserAgentString() + " BochurBrosFlip/1");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serve(request.getUrl().toString());
            }

            // The String form, not the request one: it is what Android 5 and 6
            // call, and newer versions still route to it by default.
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Nowhere else to go: the game never links out.
                return !url.startsWith(ORIGIN);
            }
        });

        setContentView(web);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        web.loadUrl(ORIGIN + "index.html");
    }

    /** Answer a request for one of the game's files from the copy inside the app. */
    private WebResourceResponse serve(String url) {
        if (!url.startsWith(ORIGIN)) return notFound();
        String path = url.substring(ORIGIN.length());
        int cut = path.indexOf('?');
        if (cut >= 0) path = path.substring(0, cut);
        cut = path.indexOf('#');
        if (cut >= 0) path = path.substring(0, cut);
        if (path.isEmpty()) path = "index.html";
        try {
            InputStream in = getAssets().open("www/" + path);
            Map<String, String> headers = new HashMap<String, String>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeType(path), null, 200, "OK", headers, in);
        } catch (IOException e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        return "application/octet-stream";
    }

    /**
     * The phone's own buttons, every one of them, straight to the game.
     *
     * Left to the WebView, a phone's buttons reach a web page unreliably: the
     * D-pad may move a focus ring instead, and the soft keys, Call, star and
     * pound may arrive as nothing at all. So the app catches each button itself
     * and hands the game the key it stands for (window.bochurKey in index.html,
     * which turns it into an ordinary key press). The game cannot tell the
     * difference, so the map, the levels and the start card all just work.
     *
     * Volume, Back and power are left alone, to do what they always do.
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int key = gameKey(event.getKeyCode());
        if (key == PASS) return super.dispatchKeyEvent(event);
        if (key == SWALLOW) return true;

        int action = event.getAction();
        if (action == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
            held.add(key);
            send(key, true);
        } else if (action == KeyEvent.ACTION_UP) {
            held.remove(key);
            send(key, false);
        }
        // Held-down repeats are swallowed: a held key is one press, held.
        return true;
    }

    private static final int PASS = 0;
    private static final int SWALLOW = -1;

    /**
     * Which key on a computer keyboard each phone button stands for. These are
     * the codes the game already listens for (src/input/KeyboardInput.ts), so
     * every button does exactly what the guide under the game says.
     */
    private static int gameKey(int code) {
        if (code >= KeyEvent.KEYCODE_0 && code <= KeyEvent.KEYCODE_9) return 48 + code - KeyEvent.KEYCODE_0;
        if (code >= KeyEvent.KEYCODE_NUMPAD_0 && code <= KeyEvent.KEYCODE_NUMPAD_9) {
            return 48 + code - KeyEvent.KEYCODE_NUMPAD_0;
        }
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                return 37; // walk left
            case KeyEvent.KEYCODE_DPAD_UP:
                return 38; // jump
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                return 39; // walk right
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return 40; // duck; in the air, Berel's ground pound
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                return 13; // OK: jump, and play / continue on the map
            case KeyEvent.KEYCODE_SOFT_LEFT:
            case KeyEvent.KEYCODE_MENU: // what some flip phones send for the left soft key
                return 48; // swap brothers, as 0
            case KeyEvent.KEYCODE_SOFT_RIGHT:
            case KeyEvent.KEYCODE_POUND:
                return 57; // use your form, as 9
            case KeyEvent.KEYCODE_CALL:
            case KeyEvent.KEYCODE_STAR:
                return 55; // run on/off, as 7
            case KeyEvent.KEYCODE_DEL:
            case KeyEvent.KEYCODE_CLEAR:
                return SWALLOW; // the clear key: nothing, so it can never wipe a save
            default:
                return PASS;
        }
    }

    private void send(int key, boolean down) {
        web.evaluateJavascript("window.bochurKey && window.bochurKey(" + key + "," + down + ")", null);
    }

    /**
     * Back goes to the map from a level, and leaves the app from anywhere
     * else. The page decides which, through window.bochurBack (src/main.ts).
     */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
                "(window.bochurBack && window.bochurBack()) ? 'stay' : 'leave'",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || !value.contains("stay")) finish();
                    }
                });
    }

    @Override
    protected void onPause() {
        // A key held while the app was left would otherwise stay held for ever.
        for (Integer key : held) send(key, false);
        held.clear();
        super.onPause();
        web.onPause();
        web.pauseTimers();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.resumeTimers();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}

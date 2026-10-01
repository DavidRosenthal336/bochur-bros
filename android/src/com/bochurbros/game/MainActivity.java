package com.bochurbros.game;

import android.app.Activity;
import android.os.Bundle;
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
import java.util.Map;

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

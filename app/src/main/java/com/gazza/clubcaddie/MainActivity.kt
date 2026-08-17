package com.gazza.clubcaddie

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.blockNetworkImage = true
            settings.blockNetworkLoads = true
            settings.cacheMode = WebSettings.LOAD_NORMAL
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.setSupportZoom(false)
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.textZoom = 100
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            addJavascriptInterface(GazzaBridge(this@MainActivity), "GazzaNative")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    url: String?
                ): Boolean {
                    return true
                }
            }
            loadUrl("file:///android_asset/index.html")
        }

        setContentView(webView)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    webView.evaluateJavascript(
                        "window.gazzaOnBack && window.gazzaOnBack()"
                    ) { value ->
                        if (value != "true") {
                            finish()
                        }
                    }
                }
            }
        )
    }
}

# Gazza Club Caddie V1.0 — minify is disabled. Keep JS bridge if enabled later.
-keepclassmembers class com.gazza.clubcaddie.GazzaBridge {
    @android.webkit.JavascriptInterface <methods>;
}

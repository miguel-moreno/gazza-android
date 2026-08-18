package com.gazza.clubcaddie

import android.content.Context
import android.webkit.JavascriptInterface

class GazzaBridge(context: Context) {

    private val prefs = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    @JavascriptInterface
    fun loadClubs(): String {
        return prefs.getString(KEY_CLUBS, "") ?: ""
    }

    @JavascriptInterface
    fun saveClubs(json: String) {
        prefs.edit().putString(KEY_CLUBS, json).apply()
    }

    private companion object {
        const val PREFS_NAME = "gazza_club_caddie"
        const val KEY_CLUBS = "clubs"
    }
}

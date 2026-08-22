# ============================================================================
# STARTVATE ProGuard / R8 rules
#
# Capacitor bridges JS <-> Java reflectively, so plugin classes and their
# @PluginMethod entry points must survive shrinking and obfuscation.
# ============================================================================

# Keep Capacitor core and all plugins.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Cordova plugin compatibility layer used by Capacitor.
-keep class org.apache.cordova.** { *; }

# Anything exposed to the WebView via @JavascriptInterface.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# JSON models are constructed reflectively by the bridge.
-keepclassmembers class * implements org.json.JSONObject { *; }

# Keep annotations, signatures and exceptions the bridge inspects.
-keepattributes *Annotation*, Signature, Exception, InnerClasses

# AndroidX WebKit / splash screen.
-keep class androidx.webkit.** { *; }
-keep class androidx.core.splashscreen.** { *; }

# Preserve line numbers for readable crash reports, but hide source names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

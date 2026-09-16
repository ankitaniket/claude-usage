import Foundation

/// Compile-time fallback config. Fill these in so the WidgetKit extension
/// (which can't easily read the app's UserDefaults) has a URL + token.
/// The menu bar app's Settings UI can override at runtime.
enum BuildConfig {
    // e.g. "https://claude-usage.vercel.app"
    static let dashboardURL = ""
    // Must match the dashboard's SUMMARY_TOKEN env var.
    static let summaryToken = ""
}

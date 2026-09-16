import Foundation

/// Runtime config. The menu bar app can override these via its Settings UI
/// (stored in UserDefaults); the widget extension falls back to the compiled
/// values in `BuildConfig` (fill those in and rebuild, or use an App Group).
enum Config {
    static var dashboardURL: String {
        let v = UserDefaults.standard.string(forKey: "dashboardURL")
        return (v?.isEmpty == false ? v! : BuildConfig.dashboardURL)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/ "))
    }

    static var summaryToken: String {
        let v = UserDefaults.standard.string(forKey: "summaryToken")
        return v?.isEmpty == false ? v! : BuildConfig.summaryToken
    }

    static var summaryURL: URL? {
        guard !dashboardURL.isEmpty else { return nil }
        return URL(string: "\(dashboardURL)/api/summary")
    }

    static func save(dashboardURL: String, summaryToken: String) {
        UserDefaults.standard.set(dashboardURL, forKey: "dashboardURL")
        UserDefaults.standard.set(summaryToken, forKey: "summaryToken")
    }

    /// Offline fallback file the collector writes (menu bar app only; the
    /// sandboxed widget cannot read it).
    static var localSummaryPath: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude-usage/summary.json")
    }
}

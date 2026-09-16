import Foundation

/// Fetches the compact summary from the dashboard, with a local-file fallback
/// (menu bar app only — the sandboxed widget uses the API exclusively).
enum UsageService {
    static func fetch() async -> Summary? {
        if let s = await fetchRemote() { return s }
        return loadLocal()
    }

    static func fetchRemote() async -> Summary? {
        guard let url = Config.summaryURL, !Config.summaryToken.isEmpty else {
            return nil
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 10
        req.setValue("Bearer \(Config.summaryToken)", forHTTPHeaderField: "Authorization")
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
                return nil
            }
            return try JSONDecoder().decode(Summary.self, from: data)
        } catch {
            return nil
        }
    }

    /// Only works when the app is not sandboxed (fine for a local personal build).
    static func loadLocal() -> Summary? {
        guard let data = try? Data(contentsOf: Config.localSummaryPath) else {
            return nil
        }
        return try? JSONDecoder().decode(Summary.self, from: data)
    }
}

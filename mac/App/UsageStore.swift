import SwiftUI
import Combine

@MainActor
final class UsageStore: ObservableObject {
    @Published var summary: Summary?
    @Published var lastRefresh: Date?
    @Published var loading = false

    private var timer: Timer?

    func start() {
        Task { await refresh() }
        // Refresh every 30 minutes.
        timer = Timer.scheduledTimer(withTimeInterval: 1800, repeats: true) { [weak self] _ in
            Task { await self?.refresh() }
        }
    }

    func refresh() async {
        loading = true
        let s = await UsageService.fetch()
        if let s { summary = s }
        lastRefresh = Date()
        loading = false
    }

    /// Menu bar title = 5-hour session %, the limit that actually blocks you.
    var menuBarText: String {
        if let p = summary?.session.usedPct { return "\(Int(p))%" }
        if let p = summary?.week.usedPct { return "\(Int(p))%" }
        return "—"
    }

    var tint: Color { Fmt.color(forPct: summary?.session.usedPct) }
}

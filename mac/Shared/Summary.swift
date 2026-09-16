import Foundation

/// One limit window (5-hour session, weekly, or weekly-Opus).
struct WindowStat: Codable, Equatable {
    var usedPct: Double?
    var remainingPct: Double?
    var resetsAt: String?

    static let empty = WindowStat(usedPct: nil, remainingPct: nil, resetsAt: nil)
}

/// Mirrors the JSON returned by the dashboard `/api/summary` route.
struct Summary: Codable, Equatable {
    var generatedAt: String
    var session: WindowStat   // 5-hour window — the one that blocks you
    var week: WindowStat
    var opus: WindowStat
    var weekTokens: Double
    var todayTokens: Double
    var weekCostUsd: Double
    var dominantModel: String?
    var activeHoursToday: Int
    var source: String

    static let placeholder = Summary(
        generatedAt: "",
        session: WindowStat(usedPct: 85, remainingPct: 15,
                            resetsAt: "2026-09-16T10:30:00Z"),
        week: WindowStat(usedPct: 55, remainingPct: 45, resetsAt: nil),
        opus: .empty,
        weekTokens: 1_200_000,
        todayTokens: 240_000,
        weekCostUsd: 42,
        dominantModel: "claude-opus-4-8",
        activeHoursToday: 3,
        source: "estimated"
    )
}

import Foundation

/// Mirrors the JSON returned by the dashboard `/api/summary` route.
struct Summary: Codable, Equatable {
    var generatedAt: String
    var weekTokens: Double
    var todayTokens: Double
    var weekCostUsd: Double
    var dominantModel: String?
    var activeHoursToday: Int
    var weekUsedPct: Double?
    var weekRemainingPct: Double?
    var resetsAt: String?
    var source: String

    static let placeholder = Summary(
        generatedAt: "",
        weekTokens: 1_200_000,
        todayTokens: 240_000,
        weekCostUsd: 42,
        dominantModel: "claude-opus-4-8",
        activeHoursToday: 3,
        weekUsedPct: 68,
        weekRemainingPct: 32,
        resetsAt: nil,
        source: "estimated"
    )
}

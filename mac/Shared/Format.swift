import SwiftUI

enum Fmt {
    static func tokens(_ n: Double) -> String {
        if n >= 1e9 { return String(format: "%.1fB", n / 1e9) }
        if n >= 1e6 { return String(format: "%.1fM", n / 1e6) }
        if n >= 1e3 { return String(format: "%.1fK", n / 1e3) }
        return "\(Int(n))"
    }

    static func shortModel(_ model: String?) -> String {
        guard let m = model?.lowercased() else { return "—" }
        let fam = m.contains("opus") ? "Opus"
            : m.contains("sonnet") ? "Sonnet"
            : m.contains("haiku") ? "Haiku" : (model ?? "—")
        if let r = model?.range(of: #"(\d+)-(\d+)"#, options: .regularExpression) {
            let parts = model![r].split(separator: "-")
            if parts.count == 2 { return "\(fam) \(parts[0]).\(parts[1])" }
        }
        return fam
    }

    static func color(forPct pct: Double?) -> Color {
        guard let p = pct else { return Color(white: 0.55) }
        if p >= 90 { return Color(red: 0.95, green: 0.33, blue: 0.35) }
        if p >= 70 { return Color(red: 0.96, green: 0.67, blue: 0.20) }
        if p >= 40 { return Color(red: 0.91, green: 0.76, blue: 0.35) }
        return Color(red: 0.24, green: 0.81, blue: 0.56)
    }

    static func resetsIn(_ iso: String?) -> String? {
        guard let iso, let date = ISO8601DateFormatter().date(from: iso) else { return nil }
        let ms = date.timeIntervalSinceNow
        if ms <= 0 { return nil }
        let h = Int(ms / 3600)
        if h >= 24 { return "\(h / 24)d \(h % 24)h" }
        let m = Int((ms.truncatingRemainder(dividingBy: 3600)) / 60)
        return "\(h)h \(m)m"
    }
}

import WidgetKit
import SwiftUI

struct UsageEntry: TimelineEntry {
    let date: Date
    let summary: Summary?
}

struct UsageProvider: TimelineProvider {
    func placeholder(in context: Context) -> UsageEntry {
        UsageEntry(date: Date(), summary: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (UsageEntry) -> Void) {
        Task {
            let s = await UsageService.fetchRemote()
            completion(UsageEntry(date: Date(), summary: s ?? .placeholder))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UsageEntry>) -> Void) {
        Task {
            let s = await UsageService.fetchRemote()
            let entry = UsageEntry(date: Date(), summary: s)
            // Refresh ~every 45 minutes.
            let next = Calendar.current.date(byAdding: .minute, value: 45, to: Date())!
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }
}

struct RingView: View {
    let pct: Double?
    var body: some View {
        ZStack {
            Circle().stroke(Color.white.opacity(0.12), lineWidth: 9)
            Circle()
                .trim(from: 0, to: CGFloat(min(1, (pct ?? 0) / 100)))
                .stroke(Fmt.color(forPct: pct), style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(pct == nil ? "—" : "\(Int(pct!))%")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(Fmt.color(forPct: pct))
        }
    }
}

struct ClaudeUsageWidgetEntryView: View {
    var entry: UsageEntry

    var body: some View {
        let s = entry.summary
        HStack(spacing: 14) {
            RingView(pct: s?.weekUsedPct).frame(width: 72, height: 72)
            VStack(alignment: .leading, spacing: 3) {
                Text("Claude")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                Text(s.map { "\(Fmt.tokens($0.todayTokens)) today" } ?? "not set up")
                    .font(.system(size: 14, weight: .medium))
                if let s {
                    Text(Fmt.shortModel(s.dominantModel))
                        .font(.system(size: 12)).foregroundStyle(.secondary)
                    if let r = Fmt.resetsIn(s.resetsAt) {
                        Text("resets \(r)")
                            .font(.system(size: 11)).foregroundStyle(.tertiary)
                    }
                }
            }
            Spacer()
        }
        .padding(14)
        .containerBackground(.black.gradient, for: .widget)
    }
}

struct ClaudeUsageWidget: Widget {
    let kind = "ClaudeUsageWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UsageProvider()) { entry in
            ClaudeUsageWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Claude Usage")
        .description("How much of your weekly Claude you've used.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct ClaudeUsageWidgetBundle: WidgetBundle {
    var body: some Widget {
        ClaudeUsageWidget()
    }
}

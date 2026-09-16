import SwiftUI

struct MenuContentView: View {
    @ObservedObject var store: UsageStore
    @State private var showSettings = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider().padding(.vertical, 6)

            if let s = store.summary {
                stats(s)
            } else {
                Text("No data yet. Configure the dashboard URL & token in Settings, or run the collector.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(width: 240, alignment: .leading)
            }

            Divider().padding(.vertical, 6)
            footer
        }
        .padding(12)
        .frame(width: 264)
        .sheet(isPresented: $showSettings) { SettingsView() }
    }

    private var header: some View {
        HStack {
            Image(systemName: "bolt.fill").foregroundStyle(store.tint)
            Text("Claude Usage").font(.system(size: 13, weight: .semibold))
            Spacer()
            if store.loading { ProgressView().controlSize(.small) }
        }
    }

    @ViewBuilder
    private func stats(_ s: Summary) -> some View {
        // PRIORITY: 5-hour session window.
        if let pct = s.session.usedPct {
            HStack {
                Text("Current session · 5h")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(pct))%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(store.tint)
            }
            ProgressView(value: min(1, pct / 100))
                .tint(store.tint)
                .padding(.vertical, 2)
            if let r = Fmt.resetsIn(s.session.resetsAt) {
                Text("resets in \(r)")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Divider().padding(.vertical, 6)
        }

        // Secondary limits.
        if let w = s.week.usedPct { limitRow("Weekly · all", w, s.week.resetsAt) }
        if let o = s.opus.usedPct { limitRow("Weekly · Opus", o, s.opus.resetsAt) }

        Divider().padding(.vertical, 6)
        row("Today", "\(Fmt.tokens(s.todayTokens)) tok")
        row("This week", "\(Fmt.tokens(s.weekTokens)) tok")
        row("Top model", Fmt.shortModel(s.dominantModel))
        HStack {
            Circle().fill(s.source == "endpoint" ? Color.green : Color.gray)
                .frame(width: 6, height: 6)
            Text(s.source == "endpoint" ? "live" : "estimated")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .padding(.top, 4)
    }

    private func limitRow(_ label: String, _ pct: Double, _ resetsAt: String?) -> some View {
        let c = Fmt.color(forPct: pct)
        return VStack(spacing: 2) {
            HStack {
                Text(label).font(.caption).foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(pct))%").font(.system(size: 12, weight: .medium)).foregroundStyle(c)
                if let r = Fmt.resetsIn(resetsAt) {
                    Text("· \(r)").font(.caption2).foregroundStyle(.tertiary)
                }
            }
            ProgressView(value: min(1, pct / 100)).tint(c)
        }
        .padding(.vertical, 1)
    }

    private func row(_ label: String, _ value: String, tint: Color = .primary, bold: Bool = false) -> some View {
        HStack {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: bold ? .semibold : .regular))
                .foregroundStyle(tint)
        }
        .padding(.vertical, 1)
    }

    private var footer: some View {
        HStack {
            Button("Refresh") { Task { await store.refresh() } }
            Spacer()
            Button("Settings") { showSettings = true }
            Button("Quit") { NSApplication.shared.terminate(nil) }
        }
        .font(.caption)
        .buttonStyle(.borderless)
    }
}

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var url = Config.dashboardURL
    @State private var token = Config.summaryToken

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Settings").font(.headline)
            VStack(alignment: .leading, spacing: 4) {
                Text("Dashboard URL").font(.caption).foregroundStyle(.secondary)
                TextField("https://claude-usage.vercel.app", text: $url)
                    .textFieldStyle(.roundedBorder)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Summary token").font(.caption).foregroundStyle(.secondary)
                SecureField("SUMMARY_TOKEN", text: $token)
                    .textFieldStyle(.roundedBorder)
            }
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                Button("Save") {
                    Config.save(dashboardURL: url, summaryToken: token)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(16)
        .frame(width: 340)
    }
}

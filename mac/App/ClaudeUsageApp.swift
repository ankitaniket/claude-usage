import SwiftUI

@main
struct ClaudeUsageApp: App {
    @StateObject private var store = UsageStore()
    @State private var started = false

    var body: some Scene {
        MenuBarExtra {
            MenuContentView(store: store)
                .task {
                    guard !started else { return }
                    started = true
                    store.start()
                }
        } label: {
            Image(systemName: "bolt.fill")
            Text(store.menuBarText)
        }
        .menuBarExtraStyle(.window)
    }
}

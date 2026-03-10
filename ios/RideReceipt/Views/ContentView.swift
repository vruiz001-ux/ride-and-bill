import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar")
                }

            ReceiptsListView()
                .tabItem {
                    Label("Receipts", systemImage: "doc.text")
                }

            ExportsView()
                .tabItem {
                    Label("Exports", systemImage: "arrow.down.doc")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.primary)
    }
}

struct DashboardView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Stats Cards
                    HStack(spacing: 12) {
                        StatCard(title: "Receipts", value: "9", icon: "doc.text")
                        StatCard(title: "Total (EUR)", value: "€203.96", icon: "eurosign")
                    }
                    HStack(spacing: 12) {
                        StatCard(title: "Invoiceable", value: "€200.83", icon: "banknote")
                        StatCard(title: "Review", value: "1", icon: "exclamationmark.triangle")
                    }

                    // Provider Split
                    VStack(alignment: .leading, spacing: 12) {
                        Text("By Provider").font(.headline)
                        ProviderRow(name: "Uber", count: 6, color: .black)
                        ProviderRow(name: "Bolt", count: 3, color: .green)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.04), radius: 8)
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .toolbar {
                Button("Sync") {}
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(.secondary)
            Text(value).font(.title2).bold()
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 8)
    }
}

struct ProviderRow: View {
    let name: String
    let count: Int
    let color: Color

    var body: some View {
        HStack {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(name).font(.subheadline)
            Spacer()
            Text("\(count) rides").font(.subheadline).foregroundStyle(.secondary)
        }
    }
}

struct ReceiptsListView: View {
    var body: some View {
        NavigationStack {
            List {
                ReceiptRow(city: "Paris", country: "France", provider: "Uber", amount: "€34.50", date: "Mar 1")
                ReceiptRow(city: "Warsaw", country: "Poland", provider: "Bolt", amount: "89.00 zł", date: "Feb 28")
                ReceiptRow(city: "Warsaw", country: "Poland", provider: "Uber", amount: "32.00 zł", date: "Feb 27")
                ReceiptRow(city: "Paris", country: "France", provider: "Uber", amount: "€18.90", date: "Feb 25")
                ReceiptRow(city: "Berlin", country: "Germany", provider: "Bolt", amount: "€22.40", date: "Feb 20")
                ReceiptRow(city: "London", country: "UK", provider: "Uber", amount: "£68.50", date: "Feb 15")
            }
            .navigationTitle("Receipts")
        }
    }
}

struct ReceiptRow: View {
    let city: String
    let country: String
    let provider: String
    let amount: String
    let date: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(provider)
                        .font(.caption)
                        .bold()
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(provider == "Uber" ? Color.black : Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    Text("\(city), \(country)").font(.subheadline)
                }
                Text(date).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text(amount).font(.subheadline).bold()
        }
        .padding(.vertical, 4)
    }
}

struct ExportsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "arrow.down.doc")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("Export your receipts as PDF bundles or Excel reports.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                Button("Generate PDF Export") {}
                    .buttonStyle(.borderedProminent)
                Button("Generate Excel Export") {}
                    .buttonStyle(.bordered)
            }
            .padding()
            .navigationTitle("Exports")
        }
    }
}

struct SettingsView: View {
    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    HStack {
                        Text("Name")
                        Spacer()
                        Text("Marie Dubois").foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Email")
                        Spacer()
                        Text("marie.dubois@company.com").foregroundStyle(.secondary)
                    }
                }
                Section("Preferences") {
                    HStack {
                        Text("Default Currency")
                        Spacer()
                        Text("EUR").foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Markup")
                        Spacer()
                        Text("5%").foregroundStyle(.secondary)
                    }
                }
                Section("Connected Emails") {
                    HStack {
                        Label("Gmail", systemImage: "envelope")
                        Spacer()
                        Text("Active").foregroundStyle(.green)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview { ContentView() }

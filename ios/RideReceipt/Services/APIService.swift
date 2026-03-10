import Foundation

class APIService: ObservableObject {
    static let shared = APIService()
    private let baseURL = "https://ridereceipt.app/api"

    func fetchReceipts() async throws -> [Receipt] {
        let url = URL(string: "\(baseURL)/receipts")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([Receipt].self, from: data)
    }

    func fetchDashboardStats() async throws -> DashboardStats {
        let url = URL(string: "\(baseURL)/dashboard")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(DashboardStats.self, from: data)
    }

    func syncEmails() async throws {
        var request = URLRequest(url: URL(string: "\(baseURL)/sync")!)
        request.httpMethod = "POST"
        let _ = try await URLSession.shared.data(for: request)
    }
}

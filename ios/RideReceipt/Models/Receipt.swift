import Foundation

enum Provider: String, Codable, CaseIterable {
    case uber, bolt

    var displayName: String {
        switch self {
        case .uber: return "Uber"
        case .bolt: return "Bolt"
        }
    }
}

enum ReceiptStatus: String, Codable {
    case parsed, review, failed, duplicate
}

struct Receipt: Identifiable, Codable {
    let id: String
    let provider: Provider
    let tripDate: Date
    let country: String
    let countryCode: String
    let city: String
    let pickupLocation: String?
    let dropoffLocation: String?
    let amountTotal: Double
    let amountTax: Double?
    let currency: String
    let paymentMethodMasked: String?
    let businessPurpose: String?
    let status: ReceiptStatus
    let parsingConfidence: Double
    // FX
    let originalAmount: Double
    let originalCurrency: String
    let fxRate: Double?
    let convertedAmount: Double?
    let convertedCurrency: String?
    let invoiceAmount: Double?
    let invoiceCurrency: String?
    let markupPercent: Double
    let billingEntityId: String?
}

struct BillingEntity: Identifiable, Codable {
    let id: String
    let legalName: String
    let billingAddress: String
    let vatOrTaxId: String?
    let preferredInvoiceCurrency: String
    let defaultMarkupPercent: Double
}

struct DashboardStats: Codable {
    let totalReceipts: Int
    let totalSpend: Double
    let totalSpendCurrency: String
    let invoiceableTotal: Double
    let reviewCount: Int
}

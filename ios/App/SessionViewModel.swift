import Foundation
import Supabase

@MainActor
final class SessionViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var isLoggedIn = false
    @Published var role: String? = nil
    @Published var userId: String? = nil

    func checkSession() async {
        isLoading = true
        do {
            let session = try await SupabaseClientProvider.shared.auth.session
            userId = session.user.id
            isLoggedIn = true
            role = try await fetchRole(userId: session.user.id)
        } catch {
            isLoggedIn = false
            role = nil
        }
        isLoading = false
    }

    func signIn(email: String, password: String) async throws {
        _ = try await SupabaseClientProvider.shared.auth.signIn(
            email: email,
            password: password
        )
        await checkSession()
    }

    func signOut() async {
        do {
            try await SupabaseClientProvider.shared.auth.signOut()
        } catch {
            // ignore
        }
        isLoggedIn = false
        role = nil
    }

    private func fetchRole(userId: String) async throws -> String {
        struct RoleRow: Decodable {
            let role: String
        }

        let response = try await SupabaseClientProvider.shared
            .database
            .from("app_users")
            .select("role")
            .eq("id", value: userId)
            .limit(1)
            .execute()

        let rows = try JSONDecoder().decode([RoleRow].self, from: response.data)
        return rows.first?.role ?? "courier"
    }
}

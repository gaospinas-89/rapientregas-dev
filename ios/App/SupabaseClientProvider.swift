import Foundation
import Supabase

final class SupabaseClientProvider {
    static let shared = SupabaseClient(
        supabaseURL: URL(string: SupabaseConfig.url)!,
        supabaseKey: SupabaseConfig.anonKey
    )
}

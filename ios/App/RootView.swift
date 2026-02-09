import SwiftUI

struct RootView: View {
    @StateObject private var sessionVM = SessionViewModel()

    var body: some View {
        Group {
            if sessionVM.isLoading {
                ProgressView("Cargando...")
            } else if sessionVM.isLoggedIn {
                NavigationStack {
                    MainTabsView(sessionVM: sessionVM)
                }
            } else {
                LoginView(sessionVM: sessionVM)
            }
        }
        .task {
            await sessionVM.checkSession()
        }
    }
}

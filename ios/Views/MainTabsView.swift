import SwiftUI

struct MainTabsView: View {
    @ObservedObject var sessionVM: SessionViewModel

    var body: some View {
        TabView {
            PackagesView()
                .tabItem { Label("Paquetes", systemImage: "shippingbox") }

            if sessionVM.role == "admin" {
                CouriersView()
                    .tabItem { Label("Mensajeros", systemImage: "person.2") }
            }

            ReturnsView()
                .tabItem { Label("Devoluciones", systemImage: "arrow.uturn.left") }

            if sessionVM.role == "admin" {
                AccountingView()
                    .tabItem { Label("Contabilidad", systemImage: "chart.bar") }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Cerrar sesión") {
                    Task { await sessionVM.signOut() }
                }
            }
        }
    }
}

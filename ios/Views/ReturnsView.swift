import SwiftUI

struct ReturnsView: View {
    var body: some View {
        NavigationView {
            List {
                Text("PKG-010 · Direccion incorrecta")
                Text("PKG-011 · Destinatario ausente")
            }
            .navigationTitle("Devoluciones")
            .toolbar {
                Button("Registrar") {
                    // TODO: crear devolución
                }
            }
        }
    }
}

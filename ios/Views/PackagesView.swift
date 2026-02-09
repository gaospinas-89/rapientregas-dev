import SwiftUI

struct PackagesView: View {
    var body: some View {
        NavigationView {
            List {
                Text("PKG-001 · En ruta")
                Text("PKG-002 · Entregado")
            }
            .navigationTitle("Paquetes")
            .toolbar {
                Button("Agregar") {
                    // TODO: abrir formulario de nuevo paquete
                }
            }
        }
    }
}

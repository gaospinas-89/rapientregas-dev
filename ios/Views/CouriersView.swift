import SwiftUI

struct CouriersView: View {
    var body: some View {
        NavigationView {
            List {
                Text("Juan Perez · 12 paquetes")
                Text("Maria Lopez · 8 paquetes")
            }
            .navigationTitle("Mensajeros")
            .toolbar {
                Button("Agregar") {
                    // TODO: crear mensajero
                }
            }
        }
    }
}

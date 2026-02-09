import SwiftUI

struct AccountingView: View {
    var body: some View {
        NavigationView {
            List {
                Text("Juan Perez: 12 entregados, 2 devueltos")
                Text("Maria Lopez: 8 entregados, 1 devuelto")
            }
            .navigationTitle("Contabilidad")
        }
    }
}

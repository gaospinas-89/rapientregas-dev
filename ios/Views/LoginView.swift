import SwiftUI

struct LoginView: View {
    @ObservedObject var sessionVM: SessionViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Ingreso")
                .font(.largeTitle)
                .bold()

            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
            }

            Button(isLoading ? "Entrando..." : "Entrar") {
                Task { await signIn() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding()
    }

    private func signIn() async {
        errorMessage = nil
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Completa email y contraseña."
            return
        }
        isLoading = true
        do {
            try await sessionVM.signIn(email: email, password: password)
        } catch {
            errorMessage = "Credenciales incorrectas."
        }
        isLoading = false
    }
}

# Guia simple iOS (para novatos)

## Paso 1: Crear proyecto en Xcode
1. Abre Xcode.
2. File > New > Project > iOS App.
3. Name: `PackageDeliveryApp`.
4. Interface: SwiftUI.
5. Language: Swift.
6. Guarda el proyecto.

## Paso 2: Copiar las pantallas base
Copia estos archivos desde este repo a tu proyecto Xcode:
- `ios/App/PackageDeliveryApp.swift`
- `ios/App/RootView.swift`
- `ios/App/SupabaseConfig.swift`
- `ios/Views/LoginView.swift`
- `ios/Views/MainTabsView.swift`
- `ios/Views/PackagesView.swift`
- `ios/Views/CouriersView.swift`
- `ios/Views/ReturnsView.swift`
- `ios/Views/AccountingView.swift`

## Paso 3: Agregar Supabase (SDK)
1. En Xcode: File > Add Packages.
2. Pega: `https://github.com/supabase-community/supabase-swift.git`
3. Agrega el paquete.

## Paso 4: Configura tus claves
Abre `ios/App/SupabaseConfig.swift` y reemplaza:
- `TU_PROYECTO.supabase.co`
- `TU_ANON_KEY`

## Paso 5: Probar
1. Ejecuta la app.
2. Veras la pantalla de login.
3. Por ahora, el login es simulado.

---

Cuando confirmes que ves las pantallas, paso a conectar Supabase real (login y datos).

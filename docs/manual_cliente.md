# Manual de Usuario - Rapi Entregas (Web)

**URL de produccion:** https://admin-web-pi-self.vercel.app  
**Roles disponibles:** Administrador, Operador, Mensajero

Este manual cubre el uso operativo actualizado del sistema.

---

## 1) Acceso

1. Abre la URL de produccion.
2. Inicia sesion con correo y contraseña.
3. Cierra sesion con el boton **Cerrar sesion**.

En movil, usa el boton **Menu** para abrir/cerrar el sidebar.

---

## 2) Roles y permisos

### Administrador
- Acceso completo.
- Crear/editar/eliminar (logico y definitivo) paquetes.
- Crear/editar/inactivar/activar mensajeros.
- Crear admins y operadores.
- Gestion de modulos en Settings.

### Operador
- Acceso operativo casi completo.
- Puede crear/editar/asignar paquetes.
- **No puede** eliminar paquetes ni desactivar registros.

### Mensajero
- Ve sus paquetes y devoluciones.
- Puede marcar entregado y registrar devolucion.
- Ve un bloque separado de **paquetes eliminados por admin** (no pagables).

---

## 3) Modulos

- **Home:** resumen operativo.
- **Paquetes:** creacion, escaneo, asignacion individual/masiva, CSV, filtros, restauracion.
- **Mensajeros:** gestion del personal de entrega.
- **Devoluciones:** registro y consulta de devoluciones.
- **Empresas:** empresas remitentes y sus municipios.
- **Contabilidad:** corte semanal e historico por rango.
- **Settings:** usuarios y configuraciones de modulos.

---

## 4) Paquetes

### 4.1 Reglas clave
- `public_code` es unico por empresa.
- El sistema no permite duplicados al crear o cargar masivo/CSV.
- Un paquete no debe quedar activo en 2 mensajeros al mismo tiempo.

### 4.2 Asignacion masiva (primera seccion)
1. Selecciona: **Empresa, Municipio, Estado, Mensajero**.
2. Escanea o escribe codigos.
3. Cada codigo queda como chip en la lista.
4. Si un codigo entro mal, quitalo con la **x** del chip.
5. Usa **Asignar** para aplicar a todos los seleccionados.
6. Usa **Limpiar** para reiniciar la lista.

### 4.3 Crear paquete (individual)
1. Ingresa o escanea codigo.
2. Selecciona Empresa, Municipio, Estado y opcionalmente Mensajero.
3. Guarda.

### 4.4 Importar CSV
Columnas aceptadas:
- `public_code` (obligatoria)
- `courier_identification` (opcional)
- `status` (opcional)
- `created_at` (opcional)

Si el codigo ya existe, se omite.

### 4.5 Eliminar, restaurar y eliminar definitivo
- **Eliminar** (lista principal): borrado logico -> estado `Eliminado`.
- **Ver eliminados** (toggle): muestra panel de eliminados.
- En **Gestionar** (eliminados):
  - **Restaurar**: vuelve a estado operativo y permite reasignar datos.
  - **Eliminar definitivo** (solo admin): borra de DB; luego ese codigo puede crearse de nuevo.

---

## 5) Mensajeros

Campos:
- Nombre
- Identificacion
- Celular
- Correo
- Contraseña (definida por admin al crear)

Funciones:
- Editar datos (incluido correo/celular).
- Activar/inactivar.
- Separacion visual de activos/inactivos.

---

## 6) Empresas y municipios

- En **Empresas** puedes crear empresas remitentes.
- Puedes asociar municipios desde este modulo.
- Esos municipios quedan disponibles en listas desplegables de Paquetes.

---

## 7) Panel de mensajero

Incluye:
- Mis paquetes (activos y pagables)
- Mis devoluciones
- Contabilidad semanal
- Seccion separada: **Paquetes eliminados por admin**
  - Solo informativa
  - No se incluyen para pago

---

## 8) Contabilidad

### Semanal
- Corte de lunes a domingo.
- Resumen por mensajero: entregados, devueltos y totales.

### Historico
- Consulta por rango de fechas.
- Vista consolidada para pagos y auditoria.

### Soporte operativo
- Indicador de paquetes sin mensajero.
- Acceso rapido para revisar y corregir asignaciones.

---

## 9) Settings

Desde Settings puedes:
- Activar/desactivar modulos.
- Crear y listar usuarios admin.
- Crear y listar usuarios operador.
- Activar/inactivar usuarios administrativos.

---

## 10) Escaneo (navegadores)

- Funciona en navegadores con soporte de camara + `BarcodeDetector`.
- Si no hay soporte, usa ingreso por lector tipo pistola (teclado) o texto manual.
- En iPhone/Safari puede depender de permisos/version; si no abre camara, usar campo de texto.

---

## 11) Buenas practicas

1. Asignar mensajero antes de cerrar lote.
2. Revisar chips en masivo y borrar codigos incorrectos con **x**.
3. Usar restaurar cuando la eliminacion fue por error.
4. Usar eliminacion definitiva solo cuando realmente no deba existir el paquete.
5. Validar contabilidad semanal antes del cierre de pagos.

---

## 12) Soporte

Al reportar un problema, enviar:
- Modulo afectado
- Codigo del paquete (si aplica)
- Captura de pantalla
- Fecha/hora aproximada

---

## 13) Publicacion

- Plataforma: Vercel
- URL activa: https://admin-web-pi-self.vercel.app
- Dominio propio opcional (se configura despues)

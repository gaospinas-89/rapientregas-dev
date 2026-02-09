# Guia Operativa Vercel - RapiEntregas

## Proyecto actual
- App: `admin-web`
- Ruta local: `/Users/gustavoospina/Documents/New project/admin-web`
- URL estable (alias): `https://admin-web-pi-self.vercel.app`

## 1) Flujo recomendado diario

1. Trabajar y validar local:
```bash
cd "/Users/gustavoospina/Documents/New project/admin-web"
npm run dev
```

2. Publicar preview para QA (no afecta prod):
```bash
vercel deploy ./admin-web -y
```

3. Validar preview en navegador:
- Login admin
- Modulos criticos: `Paquetes`, `Mensajeros`, `Contabilidad`, `Settings`
- Flujo mobile web

4. Publicar a produccion cuando QA apruebe:
```bash
vercel deploy ./admin-web --prod -y
```

5. Confirmar alias estable:
- `https://admin-web-pi-self.vercel.app`

## 2) Variables de entorno (si cambian)

Agregar variable en `production`:
```bash
vercel env add NOMBRE_VARIABLE production
```

Agregar variable en `preview`:
```bash
vercel env add NOMBRE_VARIABLE preview
```

Variables usadas normalmente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Check rapido pre-produccion

Antes de `--prod`, validar:
1. No errores en consola web.
2. Crear paquete individual y masivo.
3. No permite duplicados de `public_code`.
4. Restaurar/eliminar definitivo en paquetes eliminados (admin).
5. Panel mensajero sin duplicados y con bloque de eliminados por admin.
6. Contabilidad coherente con asignaciones activas.

## 4) Rollback (volver a version anterior)

### Opcion A (Dashboard Vercel)
1. Ir al proyecto en Vercel.
2. Abrir `Deployments`.
3. Elegir el deployment anterior estable.
4. Click `Promote to Production`.

### Opcion B (CLI, recomendada con cuidado)
1. Obtener URL del deployment anterior desde el dashboard.
2. Re-promocionar ese deployment a prod desde Vercel UI (mas seguro).

> Nota: no uses rollback si hay migraciones SQL incompatibles ya aplicadas sin revisar impacto.

## 5) Incidentes comunes y respuesta

### Error: `Invalid Refresh Token`
- Cerrar sesion y volver a login.
- Limpiar cookies/sesion del dominio.
- Verificar variables de entorno en Vercel.

### Build falla en Vercel
1. Revisar logs del deployment.
2. Corregir local.
3. Deploy preview nuevamente.
4. Luego pasar a prod.

### Cambio urgente en produccion
1. Hotfix minimo.
2. Deploy preview rapido.
3. Smoke test corto.
4. `--prod`.

## 6) Convencion recomendada de releases

- Release menor: cambios de UI o filtros.
- Release media: cambios de flujo (masivo, asignaciones, contabilidad).
- Release mayor: cambios de esquema DB o permisos.

Siempre documentar en `docs/`:
- Fecha
- Que cambio
- Riesgo
- Como probar

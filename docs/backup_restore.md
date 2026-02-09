# Backup y Restore - RapiEntregas

## 1) Preparar variable de conexion

En Supabase:
- `Project Settings` > `Database` > `Connection string` (URI)
- Usa la contraseña real del proyecto

En terminal:

```bash
cd "/Users/gustavoospina/Documents/New project/admin-web"
export SUPABASE_DB_URL='postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require'
```

## 2) Crear backup manual

```bash
npm run backup:db
```

Resultado:
- Carpeta: `./backups`
- Archivo: `supabase_YYYYMMDD_HHMMSS.dump.gz`

## 3) Restaurar backup

```bash
npm run restore:db -- ./backups/supabase_YYYYMMDD_HHMMSS.dump.gz
```

## 4) Retencion de backups

Por defecto elimina backups con mas de 14 dias.
Puedes cambiarlo:

```bash
export BACKUP_RETENTION_DAYS=30
npm run backup:db
```

## 5) Recomendacion operativa

- Frecuencia minima: 1 backup diario.
- Antes de cambios grandes (migraciones): ejecutar backup adicional.
- Guardar una copia externa (Drive/S3) semanal.

## 6) Automatizacion (opcional)

Cron diario a las 2:00 AM:

```bash
0 2 * * * cd "/Users/gustavoospina/Documents/New project/admin-web" && export SUPABASE_DB_URL='postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require' && npm run backup:db >> ./backups/backup.log 2>&1
```

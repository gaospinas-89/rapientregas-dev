"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCompanyId } from "@/lib/company";

type PackageRow = {
  id: string;
  company_id: string;
  public_code: string;
  current_status_id: string | null;
  status_name: string | null;
  sender_company_id: string | null;
  courier_name: string | null;
  courier_id: string | null;
  sender_company_name: string | null;
  zone_id?: string | null;
  zone_name?: string | null;
  created_at: string;
  is_deleted: boolean;
};

type Option = { id: string; name: string };
type CourierOption = { id: string; name: string; identification: string };
type ZoneOption = { id: string; name: string };

type CsvRow = {
  public_code: string;
  courier_identification: string;
  status?: string;
  created_at?: string;
};

export default function PackagesPage() {
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("admin");

  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [deletedPackages, setDeletedPackages] = useState<PackageRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const [statuses, setStatuses] = useState<Option[]>([]);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [senderCompanies, setSenderCompanies] = useState<Option[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);

  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState("");
  const NO_COURIER_FILTER = "__no_courier__";
  const [courierId, setCourierId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [createCode, setCreateCode] = useState("");
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createCourierId, setCreateCourierId] = useState("");
  const [createStatusId, setCreateStatusId] = useState("");
  const [createZoneId, setCreateZoneId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSupported, setScanSupported] = useState(false);
  const [scanTarget, setScanTarget] = useState<"create" | "bulk">("create");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<PackageRow | null>(null);
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editStatusId, setEditStatusId] = useState("");
  const [editCourierId, setEditCourierId] = useState("");
  const [editZoneId, setEditZoneId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCourierId, setBulkCourierId] = useState("");
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkZoneId, setBulkZoneId] = useState("");
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkScanMode, setBulkScanMode] = useState(false);
  const [bulkScanCode, setBulkScanCode] = useState("");
  const [bulkScanError, setBulkScanError] = useState<string | null>(null);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [showBulk, setShowBulk] = useState(true);
  const [showDeletedPanel, setShowDeletedPanel] = useState(false);
  const [queryFiltersApplied, setQueryFiltersApplied] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getCompanyId();
      setCompanyId(id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { data: userRow } = await supabase
        .from("app_users")
        .select("role")
        .eq("id", userId)
        .limit(1)
        .single();
      if (userRow?.role) setUserRole(userRow.role);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const opts = await loadOptions();
      await loadPackages(opts);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    })();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || statuses.length === 0) return;
    loadPackages();
  }, [page]);

  useEffect(() => {
    if (queryFiltersApplied) return;
    const courierParam = searchParams.get("courier");
    if (courierParam === "no_courier") {
      setCourierId(NO_COURIER_FILTER);
    }
    setQueryFiltersApplied(true);
  }, [searchParams, queryFiltersApplied, NO_COURIER_FILTER]);

  useEffect(() => {
    if (!statuses.length || bulkStatusId) return;
    const recibidoId = statuses.find((s) => s.name === "Recibido")?.id ?? statuses[0]?.id ?? "";
    setBulkStatusId(recibidoId);
  }, [statuses, bulkStatusId]);

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "BarcodeDetector" in window &&
      typeof navigator?.mediaDevices?.getUserMedia === "function";
    setScanSupported(Boolean(supported));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) setShowBulk(false);
  }, []);

  async function loadOptions() {
    const [s, c, sc] = await Promise.all([
      supabase.from("package_statuses").select("id,name").eq("company_id", companyId),
      supabase.from("couriers").select("id,full_name,identification,is_active").eq("company_id", companyId),
      supabase.from("sender_companies").select("id,name").eq("company_id", companyId),
    ]);
    const z = await supabase
      .from("zones")
      .select("id,name,is_active")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (s.error) console.error("loadOptions statuses error:", s.error);
    if (c.error) console.error("loadOptions couriers error:", c.error);
    if (sc.error) console.error("loadOptions sender companies error:", sc.error);
    if (z.error) {
      const zFallback = await supabase
        .from("zones")
        .select("id,name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (zFallback.error) console.error("loadOptions zones error:", zFallback.error);
      const zoneRows: ZoneOption[] = (zFallback.data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
      const statusRows = (s.data ?? []).map((r) => ({ id: r.id, name: r.name }));
      const courierRows: CourierOption[] = (c.data ?? [])
        .filter((r) => r.is_active)
        .map((r) => ({
          id: r.id,
          name: `${r.full_name ?? "Sin nombre"} · ${r.identification ?? "-"}`,
          identification: r.identification ?? "",
        }));
      const senderRows = (sc.data ?? []).map((r) => ({ id: r.id, name: r.name }));

      setStatuses(statusRows);
      setCouriers(courierRows);
      setSenderCompanies(senderRows);
      setZones(zoneRows);

      return {
        statuses: statusRows,
        couriers: courierRows,
        senderCompanies: senderRows,
        zones: zoneRows,
      };
    }

    const statusRows = (s.data ?? []).map((r) => ({ id: r.id, name: r.name }));
    const courierRows: CourierOption[] = (c.data ?? [])
      .filter((r) => r.is_active)
      .map((r) => ({
        id: r.id,
        name: `${r.full_name ?? "Sin nombre"} · ${r.identification ?? "-"}`,
        identification: r.identification ?? "",
      }));
    const senderRows = (sc.data ?? []).map((r) => ({ id: r.id, name: r.name }));
    const zoneRows: ZoneOption[] = (z.data ?? []).map((r: any) => ({ id: r.id, name: r.name }));

    setStatuses(statusRows);
    setCouriers(courierRows);
    setSenderCompanies(senderRows);
    setZones(zoneRows);

    return {
      statuses: statusRows,
      couriers: courierRows,
      senderCompanies: senderRows,
      zones: zoneRows,
    };
  }

  async function loadPackages(opts?: {
    statuses: Option[];
    couriers: CourierOption[];
    senderCompanies: Option[];
    zones: ZoneOption[];
  }) {
    setLoading(true);

    const statusSource = opts?.statuses ?? statuses;
    const courierSource = opts?.couriers ?? couriers;
    const senderSource = opts?.senderCompanies ?? senderCompanies;
    const zoneSource = opts?.zones ?? zones;

    const deletedStatusId = statusSource.find((s) => s.name === "Eliminado")?.id ?? null;

    let query = supabase
      .from("package_list_view")
      .select(
        "id, company_id, public_code, created_at, current_status_id, status_name, sender_company_id, sender_company_name, courier_id, courier_name, zone_id, zone_name",
        { count: "exact" }
      )
      .eq("company_id", companyId)
      .ilike("public_code", search ? `%${search}%` : "%")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusId) query = query.eq("current_status_id", statusId);
    if (deletedStatusId) query = query.neq("current_status_id", deletedStatusId);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte("created_at", new Date(dateTo).toISOString());
    if (courierId === NO_COURIER_FILTER) {
      query = query.is("courier_id", null);
    } else if (courierId) {
      query = query.eq("courier_id", courierId);
    }

    const { data: pkgData, error: pkgError, count: pkgCount } = await query;

    if (pkgError) {
      console.error("loadPackages error:", pkgError);
      setPackages([]);
      setDeletedPackages([]);
      setLoading(false);
      return;
    }

    const rows: PackageRow[] = (pkgData ?? []).map((p: any) => ({
      id: p.id,
      company_id: p.company_id,
      public_code: p.public_code,
      current_status_id: p.current_status_id ?? null,
      status_name: p.status_name ?? null,
      sender_company_id: p.sender_company_id ?? null,
      courier_name: p.courier_name ?? null,
      courier_id: p.courier_id ?? null,
      sender_company_name: p.sender_company_name ?? null,
      zone_id: p.zone_id ?? null,
      zone_name: p.zone_name ?? null,
      created_at: p.created_at,
      is_deleted: p.status_name === "Eliminado",
    }));

    setPackages(rows);
    setSelectedIds([]);
    setScannedCodes([]);
    setTotalCount(pkgCount ?? 0);
    await loadDeletedPackages(statusSource);
    setLoading(false);
  }

  async function loadDeletedPackages(statusSource: Option[]) {
    const deletedStatusId = statusSource.find((s) => s.name === "Eliminado")?.id ?? null;
    if (!deletedStatusId) {
      setDeletedPackages([]);
      return;
    }

    let deletedQuery = supabase
      .from("package_list_view")
      .select(
        "id, company_id, public_code, created_at, current_status_id, status_name, sender_company_id, sender_company_name, courier_id, courier_name, zone_id, zone_name"
      )
      .eq("company_id", companyId)
      .eq("current_status_id", deletedStatusId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) deletedQuery = deletedQuery.ilike("public_code", `%${search}%`);
    if (dateFrom) deletedQuery = deletedQuery.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) deletedQuery = deletedQuery.lte("created_at", new Date(dateTo).toISOString());

    const { data: deletedData, error: deletedError } = await deletedQuery;
    if (deletedError) {
      console.error("loadDeletedPackages error:", deletedError);
      setDeletedPackages([]);
      return;
    }

    const rows: PackageRow[] = (deletedData ?? []).map((p: any) => ({
      id: p.id,
      company_id: p.company_id,
      public_code: p.public_code,
      current_status_id: p.current_status_id ?? null,
      status_name: p.status_name ?? null,
      sender_company_id: p.sender_company_id ?? null,
      courier_name: p.courier_name ?? null,
      courier_id: p.courier_id ?? null,
      sender_company_name: p.sender_company_name ?? null,
      zone_id: p.zone_id ?? null,
      zone_name: p.zone_name ?? null,
      created_at: p.created_at,
      is_deleted: true,
    }));

    setDeletedPackages(rows);
  }

  async function createPackage(codeOverride?: string) {
    const finalCode = (codeOverride ?? createCode).trim();
    if (!finalCode) return;
    setSaving(true);

    const status = createStatusId || statuses.find((s) => s.name === "Recibido")?.id;
    if (!status) {
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("company_id", companyId)
      .eq("public_code", finalCode)
      .limit(1);

    if ((existing ?? []).length > 0) {
      alert("Ya existe un paquete con ese código.");
      setSaving(false);
      return;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("packages")
      .insert({
        company_id: companyId,
        public_code: finalCode,
        sender_name: "-",
        recipient_name: "-",
        destination_address: "-",
        sender_company_id: createCompanyId || null,
        zone_id: createZoneId || null,
        current_status_id: status,
      })
      .select("id")
      .single();

    if (insertError || !insertData?.id) {
      console.error("createPackage error:", insertError);
      alert("No se pudo crear el paquete.");
      setSaving(false);
      return;
    }

    if (createCourierId) {
      await supabase.from("package_assignments").insert({
        company_id: companyId,
        package_id: insertData.id,
        courier_id: createCourierId,
      });
    }

    setCreateCode("");
    setCreateCompanyId("");
    setCreateCourierId("");
    setCreateStatusId("");
    setCreateZoneId("");

    await loadPackages();
    setSaving(false);
  }

  async function startScanSession(target: "create" | "bulk") {
    setScanError(null);
    if (!scanSupported) {
      setScanError("Tu navegador no soporta escaneo de códigos. Usa el campo de texto.");
      return;
    }

    setScanTarget(target);
    setScanOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ["code_128", "ean_13", "ean_8", "code_39", "qr_code"],
      });

      const scanLoop = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            if (value) {
              if (target === "bulk") {
                setBulkScanMode(true);
                await addCodeToSelection(value);
                stopScan();
                return;
              }
              setCreateCode(value);
              await createPackage(value);
              stopScan();
              return;
            }
          }
        } catch (error) {
          setScanError("No se pudo leer el código. Intenta de nuevo.");
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      };

      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (error) {
      setScanError("No se pudo abrir la cámara. Verifica permisos.");
    }
  }

  async function startScan() {
    await startScanSession("create");
  }

  async function startBulkScan() {
    await startScanSession("bulk");
  }

  function stopScan() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanOpen(false);
    setTimeout(() => codeInputRef.current?.focus(), 50);
  }

  async function bulkAssign() {
    if (!bulkCourierId || selectedIds.length === 0) return;

    await supabase
      .from("package_assignments")
      .update({ unassigned_at: "now()" })
      .in("package_id", selectedIds)
      .is("unassigned_at", null);

    const payload = selectedIds.map((id) => ({
      company_id: companyId,
      package_id: id,
      courier_id: bulkCourierId,
    }));

    await supabase.from("package_assignments").insert(payload);

    setSelectedIds([]);
    setScannedCodes([]);
    setBulkCourierId("");
    await loadPackages();
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(`¿Eliminar ${selectedIds.length} paquetes? Esta acción es irreversible.`);
    if (!ok) return;

    const deletedStatus = statuses.find((s) => s.name === "Eliminado");
    if (!deletedStatus) {
      alert("No existe el estado Eliminado.");
      return;
    }

    await supabase
      .from("packages")
      .update({ current_status_id: deletedStatus.id })
      .in("id", selectedIds);

    const payload = selectedIds.map((id) => ({
      company_id: companyId,
      package_id: id,
      reason: "Eliminado por admin (masivo)",
    }));
    await supabase.from("package_deletions").insert(payload);

    setSelectedIds([]);
    await loadPackages();
  }

  async function addCodeToSelection(code: string) {
    const normalized = code.trim();
    if (!normalized) return;

    const alreadyInList = scannedCodes.some(
      (c) => c.trim().toLowerCase() === normalized.toLowerCase()
    );
    if (alreadyInList) {
      setBulkScanError(`El código ${normalized} ya está en la lista masiva.`);
      return;
    }

    const { data: existingPkg, error: existsError } = await supabase
      .from("packages")
      .select("id")
      .eq("company_id", companyId)
      .eq("public_code", normalized)
      .limit(1)
      .maybeSingle();

    if (existsError) {
      setBulkScanError("No se pudo validar el código escaneado.");
      return;
    }

    if (existingPkg?.id) {
      setBulkScanError(`El paquete ${normalized} ya existe en el sistema.`);
      return;
    }

    const statusId =
      bulkStatusId ||
      statuses.find((s) => s.name.toLowerCase() === "recibido")?.id ||
      statuses[0]?.id;
    if (!statusId) {
      setBulkScanError("No hay estados disponibles.");
      return;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("packages")
      .insert({
        company_id: companyId,
        public_code: normalized,
        sender_name: "-",
        recipient_name: "-",
        destination_address: "-",
        sender_company_id: bulkCompanyId || null,
        zone_id: bulkZoneId || null,
        current_status_id: statusId,
      })
      .select("id, company_id, public_code, current_status_id, sender_company_id, created_at")
      .single();

    if (insertError || !insertData?.id) {
      setBulkScanError(`No se pudo crear el paquete ${normalized}.`);
      return;
    }

    const pkg = {
      id: insertData.id,
      company_id: insertData.company_id ?? companyId,
      public_code: insertData.public_code,
      current_status_id: insertData.current_status_id ?? statusId,
      status_name: statuses.find((s) => s.id === insertData.current_status_id)?.name ?? null,
      sender_company_id: insertData.sender_company_id ?? bulkCompanyId ?? null,
      courier_name: null,
      courier_id: null,
      sender_company_name:
        senderCompanies.find((s) => s.id === insertData.sender_company_id)?.name ?? null,
      zone_id: bulkZoneId || null,
      zone_name: bulkZoneId ? zones.find((z) => z.id === bulkZoneId)?.name ?? null : null,
      created_at: insertData.created_at,
      is_deleted: false,
    };

    setPackages((prev) => [pkg, ...prev]);
    setSelectedIds((prev) => [...prev, pkg.id]);
    setScannedCodes((prev) => [...prev, pkg.public_code]);
    setBulkScanError(null);

    if (bulkCourierId) {
      await supabase.from("package_assignments").insert({
        company_id: companyId,
        package_id: pkg.id,
        courier_id: bulkCourierId,
      });
    }
  }

  function removeCodeFromSelection(code: string) {
    const normalized = code.trim().toLowerCase();
    const pkg = packages.find((p) => p.public_code.trim().toLowerCase() === normalized);
    if (pkg) {
      setSelectedIds((prev) => prev.filter((id) => id !== pkg.id));
    }
    setScannedCodes((prev) => prev.filter((c) => c.trim().toLowerCase() !== normalized));
  }

  function openEdit(row: PackageRow) {
    setEditRow(row);
    setEditCompanyId(row.sender_company_id ?? "");
    setEditStatusId(row.current_status_id ?? "");
    setEditCourierId(row.courier_id ?? "");
    setEditZoneId(row.zone_id ?? "");
    setEditOpen(true);
  }

  function getDeletedStatusId() {
    return statuses.find((s) => s.name === "Eliminado")?.id ?? "";
  }

  function getDefaultRestoreStatusId() {
    return statuses.find((s) => s.name === "Recibido")?.id ?? statuses[0]?.id ?? "";
  }

  async function saveEdit() {
    if (!editRow) return;

    const updates: any = {};
    if (editCompanyId) updates.sender_company_id = editCompanyId;
    if (editStatusId) updates.current_status_id = editStatusId;
    if (editZoneId) updates.zone_id = editZoneId;

    await supabase.from("packages").update(updates).eq("id", editRow.id);

    if (editCourierId) {
      await supabase
        .from("package_assignments")
        .update({ unassigned_at: "now()" })
        .eq("package_id", editRow.id)
        .is("unassigned_at", null);

      await supabase
        .from("package_assignments")
        .insert({
          company_id: companyId,
          package_id: editRow.id,
          courier_id: editCourierId,
        });
    }

    setEditOpen(false);
    await loadPackages();
  }

  async function restorePackage() {
    if (!editRow) return;

    const deletedStatusId = getDeletedStatusId();
    const targetStatusId =
      editStatusId && editStatusId !== deletedStatusId
        ? editStatusId
        : getDefaultRestoreStatusId();
    if (!targetStatusId) {
      alert("No hay estado disponible para restaurar.");
      return;
    }

    const updates: any = {
      current_status_id: targetStatusId,
      sender_company_id: editCompanyId || null,
      zone_id: editZoneId || null,
    };

    const { error: updateError } = await supabase
      .from("packages")
      .update(updates)
      .eq("id", editRow.id);

    if (updateError) {
      console.error("restorePackage update error:", updateError);
      alert("No se pudo restaurar el paquete.");
      return;
    }

    await supabase
      .from("package_assignments")
      .update({ unassigned_at: "now()" })
      .eq("package_id", editRow.id)
      .is("unassigned_at", null);

    if (editCourierId) {
      const { error: assignError } = await supabase.from("package_assignments").insert({
        company_id: companyId,
        package_id: editRow.id,
        courier_id: editCourierId,
      });
      if (assignError) {
        console.error("restorePackage assign error:", assignError);
        alert("Se restauró el paquete pero falló la asignación de mensajero.");
      }
    }

    setEditOpen(false);
    await loadPackages();
  }

  async function hardDeletePackage() {
    if (!editRow || userRole !== "admin") return;
    const ok = window.confirm(
      `Eliminar definitivamente ${editRow.public_code} de la base de datos. Esta acción NO se puede deshacer.`
    );
    if (!ok) return;

    await supabase.from("package_assignments").delete().eq("package_id", editRow.id);
    await supabase.from("returns").delete().eq("package_id", editRow.id);
    await supabase.from("package_deletions").delete().eq("package_id", editRow.id);

    const { error } = await supabase.from("packages").delete().eq("id", editRow.id);
    if (error) {
      console.error("hardDeletePackage error:", error);
      alert("No se pudo eliminar definitivamente.");
      return;
    }

    setEditOpen(false);
    await loadPackages();
  }

  async function softDelete(row: PackageRow) {
    const deletedStatus = statuses.find((s) => s.name === "Eliminado");
    if (!deletedStatus) return;

    await supabase.from("packages").update({ current_status_id: deletedStatus.id }).eq("id", row.id);
    await supabase.from("package_deletions").insert({
      company_id: companyId,
      package_id: row.id,
      reason: "Eliminado por admin",
    });

    await loadPackages();
  }

  function parseCsv(text: string): CsvRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const separator = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());

    const getIndex = (name: string) => headers.indexOf(name);
    const idxCode = getIndex("public_code");
    const idxCourier = getIndex("courier_identification");
    const idxCourierLegacy = idxCourier >= 0 ? idxCourier : getIndex("courier_code");
    const idxStatus = getIndex("status");
    const idxCreatedAt = getIndex("created_at");

    return lines.slice(1).map((line) => {
      const cols = line.split(separator).map((c) => c.trim());
      return {
        public_code: cols[idxCode] ?? "",
        courier_identification: cols[idxCourierLegacy] ?? "",
        status: idxStatus >= 0 ? cols[idxStatus] : undefined,
        created_at: idxCreatedAt >= 0 ? cols[idxCreatedAt] : undefined,
      };
    }).filter((r) => r.public_code);
  }

  async function importCsv(file: File) {
    setCsvImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        alert("No se encontraron filas válidas.");
        setCsvImporting(false);
        return;
      }

    const { data: existingRows } = await supabase
      .from("packages")
      .select("public_code")
      .eq("company_id", companyId);

      const existingSet = new Set((existingRows ?? []).map((r) => String(r.public_code).toLowerCase()));
      const courierByIdentification = new Map(
        couriers.map((c) => [String(c.identification || "").toLowerCase(), c.id])
      );
      const statusByName = new Map(statuses.map((s) => [s.name.toLowerCase(), s.id]));
      const defaultStatus = statuses.find((s) => s.name === "Recibido")?.id || "";

      let created = 0;
      let skipped = 0;

      for (const row of rows) {
        const code = row.public_code.trim();
        if (!code) continue;
        if (existingSet.has(code.toLowerCase())) {
          skipped += 1;
          continue;
        }

        const statusId = row.status ? statusByName.get(row.status.toLowerCase()) : defaultStatus;
        if (!statusId) {
          skipped += 1;
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("packages")
          .insert({
            company_id: companyId,
            public_code: code,
            sender_name: "-",
            recipient_name: "-",
            destination_address: "-",
            sender_company_id: null,
            current_status_id: statusId,
            ...(row.created_at ? { created_at: row.created_at } : {}),
          })
          .select("id")
          .single();

        if (error || !inserted?.id) {
          skipped += 1;
          continue;
        }

        const courierIdValue = row.courier_identification?.trim().toLowerCase();
        const courierId = courierIdValue ? courierByIdentification.get(courierIdValue) : undefined;
        if (courierId) {
          await supabase.from("package_assignments").insert({
            company_id: companyId,
            package_id: inserted.id,
            courier_id: courierId,
          });
        }

        existingSet.add(code.toLowerCase());
        created += 1;
      }

      alert(`Importación finalizada. Creados: ${created}. Omitidos: ${skipped}.`);
      await loadPackages();
    } catch (error) {
      console.error("importCsv error:", error);
      alert("No se pudo importar el CSV.");
    }

    setCsvImporting(false);
  }

  const packageCount = useMemo(() => totalCount, [totalCount]);
  const totalPages = Math.max(1, Math.ceil(packageCount / pageSize));
  const pagedPackages = packages;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Paquetes</h1>
          <p className="muted">Total encontrados: {packageCount}</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => loadPackages()}>
            Actualizar
          </button>
        </div>
      </div>

      <div className="card compact" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Asignación masiva</h3>
          <button className="btn ghost" type="button" onClick={() => setShowBulk((s) => !s)}>
            {showBulk ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {showBulk && (
          <>
            <div className="form-grid">
              <select value={bulkCompanyId} onChange={(e) => setBulkCompanyId(e.target.value)}>
                <option value="">Empresa</option>
                {senderCompanies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={bulkZoneId} onChange={(e) => setBulkZoneId(e.target.value)}>
                <option value="">Municipio</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
              <select value={bulkStatusId} onChange={(e) => setBulkStatusId(e.target.value)}>
                <option value="">Estado</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={bulkCourierId} onChange={(e) => setBulkCourierId(e.target.value)}>
                <option value="">Selecciona mensajero</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label className="pill">
                <input
                  type="checkbox"
                  checked={bulkScanMode}
                  onChange={(e) => {
                    setBulkScanMode(e.target.checked);
                    setBulkScanError(null);
                    setBulkScanCode("");
                    if (!e.target.checked) setScannedCodes([]);
                  }}
                />
                Modo escaneo masivo
              </label>
            </div>
            {bulkScanMode && (
              <div className="form-grid">
                <input
                  placeholder="Escanea código aquí"
                  value={bulkScanCode}
                  onChange={(e) => setBulkScanCode(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      await addCodeToSelection(bulkScanCode);
                      setBulkScanCode("");
                    }
                  }}
                />
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    addCodeToSelection(bulkScanCode).then(() => {
                      setBulkScanCode("");
                    });
                  }}
                >
                  Agregar
                </button>
                <button className="btn ghost" type="button" onClick={startBulkScan} disabled={!scanSupported}>
                  Escanear
                </button>
              </div>
            )}
            {bulkScanMode && !scanSupported && (
              <p className="muted" style={{ marginTop: 4 }}>
                Escaneo por cámara no disponible en este navegador. Usa el campo de texto.
              </p>
            )}
            {bulkScanError && <p style={{ color: "crimson", marginTop: 8 }}>{bulkScanError}</p>}
            {bulkScanMode && scannedCodes.length > 0 && (
              <div className="pill-list" style={{ marginTop: 8 }}>
                {scannedCodes.map((code) => (
                  <span key={code} className="pill">
                    <span>{code}</span>
                    <button
                      type="button"
                      onClick={() => removeCodeFromSelection(code)}
                      aria-label={`Quitar ${code}`}
                      className="pill-remove"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="row-actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setScannedCodes([]);
                  setBulkScanCode("");
                  setBulkScanError(null);
                }}
              >
                Limpiar
              </button>
              <button className="btn" disabled={!bulkCourierId || selectedIds.length === 0} onClick={bulkAssign}>
                Asignar {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
              </button>
              {userRole === "admin" && (
                <button className="btn danger" disabled={selectedIds.length === 0} onClick={bulkDelete}>
                  Eliminar {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid-compact">
        <details className="card compact" open>
          <summary className="section-header">Crear paquete</summary>
          <div className="form-grid">
            <input
              ref={codeInputRef}
              placeholder="Código público"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
            />
            <button className="btn ghost" type="button" onClick={startScan} disabled={!scanSupported}>
              Escanear
            </button>
            {!scanSupported && (
              <p className="muted" style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                Escaneo por cámara no disponible en este navegador. Usa el campo de texto.
              </p>
            )}
            <select value={createCompanyId} onChange={(e) => setCreateCompanyId(e.target.value)}>
              <option value="">Empresa</option>
              {senderCompanies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={createZoneId} onChange={(e) => setCreateZoneId(e.target.value)}>
              <option value="">Municipio</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <select value={createCourierId} onChange={(e) => setCreateCourierId(e.target.value)}>
              <option value="">Asignar mensajero</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={createStatusId} onChange={(e) => setCreateStatusId(e.target.value)}>
              <option value="">Estado (default Recibido)</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="row-actions">
            <button className="btn" onClick={() => createPackage()} disabled={saving}>
              {saving ? "Creando..." : "Crear"}
            </button>
          </div>
        </details>

        <details className="card compact">
          <summary className="section-header">Importar CSV</summary>
          <p className="muted">
            Columnas obligatorias: public_code, courier_identification. Opcionales: status, created_at.
          </p>
          <div className="row-actions">
            <a className="btn ghost" href="/api/templates/packages.csv" download>Descargar plantilla</a>
            <input
              type="file"
              accept=".csv"
              disabled={csvImporting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                importCsv(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </details>

        <details className="card compact" open>
          <summary className="section-header">Filtros rápidos</summary>
          <div className="form-grid">
            <input placeholder="Buscar código" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
              <option value="">Estado</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              <option value="">Mensajero</option>
              <option value={NO_COURIER_FILTER}>Sin mensajero</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="row-actions">
            <label className="pill">
              <input
                type="checkbox"
                checked={showDeletedPanel}
                onChange={(e) => setShowDeletedPanel(e.target.checked)}
              />
              Ver eliminados
            </label>
            <button className="btn ghost" onClick={() => {
              setSearch("");
              setStatusId("");
              setCourierId("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
              loadPackages();
            }}>
              Limpiar
            </button>
            <button className="btn" onClick={() => {
              setPage(1);
              loadPackages();
            }}>Aplicar</button>
          </div>
        </details>
      </div>

      <div className="card table-card">
        <div className="table-header">
          <h3>Lista de paquetes</h3>
          {loading && <span className="muted">Cargando...</span>}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={
                      pagedPackages.length > 0 && selectedIds.length === pagedPackages.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(pagedPackages.map((p) => p.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                  <span className="muted" style={{ fontWeight: 500 }}>Todos</span>
                </label>
              </th>
              <th>Código</th>
              <th>Empresa</th>
              <th>Mensajero</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pagedPackages.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => Array.from(new Set([...prev, p.id])));
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== p.id));
                      }
                    }}
                  />
                </td>
                <td className="mono">{p.public_code}</td>
                <td>{p.sender_company_name ?? "-"}</td>
                <td>{p.courier_name ?? "-"}</td>
                <td>{p.status_name ?? "-"}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  <button className="btn ghost" onClick={() => openEdit(p)}>Editar</button>
                  {userRole === "admin" && (
                    <button className="btn danger" onClick={() => softDelete(p)}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
          <span className="muted">
            Página {page} de {totalPages} · {packageCount} paquetes
          </span>
          <div className="row-actions">
            <button
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setSelectedIds([]);
              }}
            >
              Anterior
            </button>
            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                setSelectedIds([]);
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {showDeletedPanel && (
        <div className="card table-card" style={{ marginTop: 16 }}>
          <div className="table-header">
            <h3>Paquetes eliminados</h3>
            <span className="muted">{deletedPackages.length} encontrados</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Empresa</th>
                <th>Mensajero</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deletedPackages.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">No hay paquetes eliminados.</td>
                </tr>
              )}
              {deletedPackages.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.public_code}</td>
                  <td>{p.sender_company_name ?? "-"}</td>
                  <td>{p.courier_name ?? "-"}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn ghost" onClick={() => openEdit(p)}>Gestionar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editOpen && editRow && (
        <div className="modal">
          <div className="modal-card">
            <h3>Editar paquete</h3>
            <div className="form-grid">
              <select value={editCompanyId} onChange={(e) => setEditCompanyId(e.target.value)}>
                <option value="">Empresa</option>
                {senderCompanies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={editZoneId} onChange={(e) => setEditZoneId(e.target.value)}>
                <option value="">Municipio</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
              <select value={editStatusId} onChange={(e) => setEditStatusId(e.target.value)}>
                <option value="">Estado</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={editCourierId} onChange={(e) => setEditCourierId(e.target.value)}>
                <option value="">Asignar mensajero</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="row-actions">
              <button className="btn ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
              {!editRow.is_deleted && <button className="btn" onClick={saveEdit}>Guardar</button>}
              {editRow.is_deleted && (
                <button className="btn" onClick={restorePackage}>Restaurar</button>
              )}
              {editRow.is_deleted && userRole === "admin" && (
                <button className="btn danger" onClick={hardDeletePackage}>Eliminar definitivo</button>
              )}
            </div>
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="modal">
          <div className="modal-card">
            <h3>Escanear código</h3>
            <p className="muted">Apunta la cámara al código de barras.</p>
            <div style={{ marginTop: 12 }}>
              <video
                ref={videoRef}
                style={{ width: "100%", borderRadius: 12, background: "#000" }}
                muted
                playsInline
              />
            </div>
            {scanError && <p style={{ color: "crimson", marginTop: 8 }}>{scanError}</p>}
            <div className="row-actions">
              <button className="btn ghost" onClick={stopScan}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

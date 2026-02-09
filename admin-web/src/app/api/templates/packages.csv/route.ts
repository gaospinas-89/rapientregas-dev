export const dynamic = "force-static";

export async function GET() {
  const csv = "public_code,courier_identification,status,created_at\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=packages.csv",
    },
  });
}

import dynamic from "next/dynamic";

const DuckdbTestClient = dynamic(
  () => import("@/components/duckdb-test-client"),
  { ssr: false },
);

export default function DuckdbTestPage() {
  return (
    <>
      <DuckdbTestClient />
    </>
  );
}

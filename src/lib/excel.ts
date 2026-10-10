/** Ekspor/impor Excel di browser (JSA-04, LAP-02). */
export type Sel = string | number | boolean | null;

export async function unduhExcel(baris: Sel[][], namaFile: string) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(baris as never).toFile(namaFile);
}

export async function bacaTabel(file: File): Promise<Sel[][]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const teks = await file.text();
    const pemisah = teks.split("\n")[0].includes(";") ? ";" : ",";
    return teks
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => l.split(pemisah).map((c) => c.trim().replace(/^"|"$/g, "")));
  }
  const { readSheet } = await import("read-excel-file/browser");
  return (await readSheet(file)) as Sel[][];
}

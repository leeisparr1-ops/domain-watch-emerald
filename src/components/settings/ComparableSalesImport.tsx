import { useState, useRef } from "react";
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedSale {
  domain_name: string;
  sale_price: number;
  tld: string;
  venue: string;
  notes: string;
  sale_date?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  if (parts.length >= 3) return parts.slice(-2).join(".");
  return parts.length >= 2 ? parts[parts.length - 1] : "com";
}

export function ComparableSalesImport() {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedSale[] | null>(null);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV must have a header row + data"); return; }

      // Detect header columns
      const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z_]/g, ""));
      const domainIdx = header.findIndex(h => h.includes("domain") || h === "name");
      const priceIdx = header.findIndex(h => h.includes("price") || h.includes("amount") || h.includes("sale"));
      const venueIdx = header.findIndex(h => h.includes("venue") || h.includes("source") || h.includes("platform"));
      const dateIdx = header.findIndex(h => h.includes("date"));
      const notesIdx = header.findIndex(h => h.includes("note") || h.includes("category"));

      if (domainIdx === -1 || priceIdx === -1) {
        toast.error("CSV must have 'domain' and 'price' columns");
        return;
      }

      const parsed: ParsedSale[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const domain = cols[domainIdx]?.toLowerCase().trim();
        const priceStr = cols[priceIdx]?.replace(/[$,\s]/g, "");
        const price = parseFloat(priceStr);
        if (!domain || !price || isNaN(price)) continue;

        parsed.push({
          domain_name: domain,
          sale_price: price,
          tld: extractTld(domain),
          venue: venueIdx >= 0 ? (cols[venueIdx] || "Unknown") : "Unknown",
          notes: notesIdx >= 0 ? (cols[notesIdx] || "") : "",
          sale_date: dateIdx >= 0 ? cols[dateIdx] : undefined,
        });
      }

      if (parsed.length === 0) { toast.error("No valid rows found"); return; }
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    let inserted = 0;
    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < preview.length; i += batchSize) {
      const batch = preview.slice(i, i + batchSize);
      const { error } = await supabase.from("comparable_sales").insert(
        batch.map(s => ({
          domain_name: s.domain_name,
          sale_price: s.sale_price,
          tld: s.tld,
          venue: s.venue,
          notes: s.notes || null,
          sale_date: s.sale_date || null,
        }))
      );
      if (error) { errors += batch.length; console.error("Batch insert error:", error); }
      else inserted += batch.length;
    }

    setResult({ inserted, errors });
    setPreview(null);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`Imported ${inserted} sales${errors > 0 ? ` (${errors} errors)` : ""}`);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Import Comparable Sales
        </CardTitle>
        <CardDescription>
          Upload a CSV with columns: <code className="text-xs bg-muted px-1 rounded">domain, price</code> (required), 
          plus optional <code className="text-xs bg-muted px-1 rounded">venue, date, notes</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          <Upload className="w-4 h-4" /> Select CSV File
        </Button>

        {preview && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Found <span className="text-foreground font-medium">{preview.length}</span> sales to import.
              Price range: ${Math.min(...preview.map(s => s.sale_price)).toLocaleString()} – $
              {Math.max(...preview.map(s => s.sale_price)).toLocaleString()}
            </p>
            <div className="max-h-48 overflow-auto rounded border border-border text-xs">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Domain</th>
                    <th className="px-2 py-1 text-right">Price</th>
                    <th className="px-2 py-1 text-left">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((s, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-2 py-1">{s.domain_name}</td>
                      <td className="px-2 py-1 text-right">${s.sale_price.toLocaleString()}</td>
                      <td className="px-2 py-1">{s.venue}</td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr><td colSpan={3} className="px-2 py-1 text-muted-foreground">...and {preview.length - 20} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button onClick={doImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Import {preview.length} Sales
              </Button>
              <Button variant="ghost" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm">
            {result.errors > 0 ? (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
            <span>
              Imported {result.inserted} sales
              {result.errors > 0 && `, ${result.errors} failed`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

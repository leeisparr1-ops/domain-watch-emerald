import { useState, useRef, useCallback } from "react";
import { Upload, FileText, ClipboardPaste, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBackClose } from "@/hooks/useBackClose";

interface ParsedRow {
  domain_name: string;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
  status?: string;
  renewal_cost_yearly?: number;
  tags?: string[];
}

interface Props {
  onBulkAdd: (rows: ParsedRow[]) => Promise<{ added: number; errors: number }>;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("domain") || firstLine.includes("name") || firstLine.includes("price");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detect column mapping from header
  let colMap = { domain: 0, price: -1, date: -1, source: -1, status: -1, renewal: -1, tags: -1 };
  if (hasHeader) {
    const headers = firstLine.split(/[,\t;|]/).map((h) => h.trim().replace(/"/g, ""));
    headers.forEach((h, i) => {
      if (/domain|name/i.test(h)) colMap.domain = i;
      else if (/price|cost|paid/i.test(h) && !/renewal/i.test(h)) colMap.price = i;
      else if (/date|purchased|acquired/i.test(h)) colMap.date = i;
      else if (/source|registrar|platform/i.test(h)) colMap.source = i;
      else if (/status/i.test(h)) colMap.status = i;
      else if (/renewal/i.test(h)) colMap.renewal = i;
      else if (/tag/i.test(h)) colMap.tags = i;
    });
  }

  return dataLines
    .map((line) => {
      const cols = line.split(/[,\t;|]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const domain = cols[colMap.domain]?.trim().toLowerCase();
      if (!domain || !domain.includes(".")) return null;

      const row: ParsedRow = { domain_name: domain };
      if (colMap.price >= 0 && cols[colMap.price]) row.purchase_price = parseFloat(cols[colMap.price]) || 0;
      if (colMap.date >= 0 && cols[colMap.date]) row.purchase_date = cols[colMap.date];
      if (colMap.source >= 0 && cols[colMap.source]) row.purchase_source = cols[colMap.source];
      if (colMap.status >= 0 && cols[colMap.status]) row.status = cols[colMap.status].toLowerCase();
      if (colMap.renewal >= 0 && cols[colMap.renewal]) row.renewal_cost_yearly = parseFloat(cols[colMap.renewal]) || 0;
      if (colMap.tags >= 0 && cols[colMap.tags]) row.tags = cols[colMap.tags].split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      return row;
    })
    .filter(Boolean) as ParsedRow[];
}

function parsePlainList(text: string): ParsedRow[] {
  return text
    .trim()
    .split(/[\n,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes(".") && s.length > 3)
    .map((domain_name) => ({ domain_name }));
}

export function BulkImportDialog({ onBulkAdd }: Props) {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);
  useBackClose(open, handleClose);
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    // Try CSV first (has commas/tabs and multiple columns), else plain list
    const hasDelimiters = pasteText.includes(",") || pasteText.includes("\t") || pasteText.includes(";");
    const rows = hasDelimiters ? parseCSV(pasteText) : parsePlainList(pasteText);
    setParsed(rows);
    setResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasteText(text);
      const rows = parseCSV(text);
      setParsed(rows);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await onBulkAdd(parsed);
    setResult(res);
    setImporting(false);
    if (res.errors === 0) {
      setTimeout(() => {
        setOpen(false);
        setPasteText("");
        setParsed([]);
        setResult(null);
      }, 1500);
    }
  };

  const reset = () => {
    setPasteText("");
    setParsed([]);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Domains</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="paste">
          <TabsList className="w-full">
            <TabsTrigger value="paste" className="flex-1 gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Upload CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-3 mt-3">
            <Textarea
              placeholder={`Paste domains (one per line) or CSV:\n\ndomain,price,source\nexample.com,50,GoDaddy\ntest.io,120,Namecheap`}
              rows={8}
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setParsed([]); setResult(null); }}
              className="font-mono text-sm"
            />
            <Button onClick={handleParse} variant="secondary" className="w-full" disabled={!pasteText.trim()}>
              Parse Domains
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-3 mt-3">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload CSV or TXT file</p>
              <p className="text-xs text-muted-foreground mt-1">Supports: domain, price, date, source, status, renewal, tags columns</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileUpload} />
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                {parsed.length} domain{parsed.length !== 1 ? "s" : ""} detected
              </Badge>
              {parsed.some((r) => r.purchase_price) && (
                <Badge variant="outline" className="text-xs">With pricing data</Badge>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">Domain</th>
                    <th className="px-3 py-1.5 font-medium text-right">Price</th>
                    <th className="px-3 py-1.5 font-medium">Source</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-3 py-1.5 font-mono">{r.domain_name}</td>
                      <td className="px-3 py-1.5 text-right">{r.purchase_price != null ? `$${r.purchase_price}` : "-"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.purchase_source ?? "-"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.status ?? "holding"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ...and {parsed.length - 50} more
                </p>
              )}
            </div>

            {result ? (
              <div className={`flex items-center gap-2 text-sm ${result.errors > 0 ? "text-destructive" : "text-green-500"}`}>
                {result.errors > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {result.added} imported{result.errors > 0 ? `, ${result.errors} failed` : ""}
              </div>
            ) : (
              <Button onClick={handleImport} className="w-full" disabled={importing}>
                {importing ? `Importing ${parsed.length} domains...` : `Import ${parsed.length} Domain${parsed.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

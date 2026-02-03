import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NamecheapCsvUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    total_parsed?: number;
    inserted?: number;
    errors?: number;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    // Check file size (max 50MB for ~1M rows)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }

    setUploading(true);
    setProgress(10);
    setResult(null);

    try {
      // Read file content
      const csvContent = await file.text();
      setProgress(30);

      // Count lines for user feedback
      const lineCount = csvContent.split("\n").length - 1;
      toast.info(`Processing ${lineCount.toLocaleString()} domains...`);

      setProgress(50);

      // Call edge function
      const { data, error } = await supabase.functions.invoke(
        "namecheap-csv-upload",
        {
          body: { csvContent },
        }
      );

      setProgress(100);

      if (error) {
        console.error("Upload error:", error);
        setResult({ success: false, error: error.message });
        toast.error("Upload failed: " + error.message);
      } else if (data?.error) {
        setResult({ success: false, error: data.error });
        toast.error("Upload failed: " + data.error);
      } else {
        setResult(data);
        toast.success(
          `Successfully imported ${data.inserted?.toLocaleString()} Namecheap auctions!`
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setResult({ success: false, error: errorMsg });
      toast.error("Upload failed: " + errorMsg);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="p-6 rounded-xl glass border border-border">
      <div className="flex items-center gap-3 mb-4">
        <Upload className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Namecheap CSV Import</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
          Admin Only
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Upload the Namecheap auction CSV export to sync domain data. Download
        the CSV from{" "}
        <a
          href="https://www.namecheap.com/market/auctions/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Namecheap Market
        </a>{" "}
        using the "Download as CSV" button.
      </p>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="csv-upload"
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Select CSV File
            </>
          )}
        </Button>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Processing... This may take a few minutes for large files.
            </p>
          </div>
        )}

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-primary/5 border-primary/20"
                : "bg-destructive/5 border-destructive/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div>
                {result.success ? (
                  <>
                    <p className="font-medium text-foreground">
                      Import Successful
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Parsed: {result.total_parsed?.toLocaleString()} domains
                      <br />
                      Imported: {result.inserted?.toLocaleString()} domains
                      {result.errors && result.errors > 0 && (
                        <>
                          <br />
                          Batch errors: {result.errors}
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-destructive">Import Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.error}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHUNK_SIZE = 5000; // rows per chunk

interface UploadResult {
  success: boolean;
  total_parsed?: number;
  inserted?: number;
  errors?: number;
  error?: string;
}

export function NamecheapCsvUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 250MB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatusText("Reading file (streamed)...");
    setResult(null);

    try {
      // Stream the file to avoid memory exhaustion on mobile
      const dataLines = await streamParseCSV(file, (pct) => {
        setProgress(Math.round(pct * 5)); // 0-5% for reading
        setStatusText(`Reading file... ${Math.round(pct)}%`);
      });

      if (dataLines.lines.length < 1) {
        throw new Error("CSV file appears to be empty or invalid");
      }

      const headers = dataLines.headers;
      const totalRows = dataLines.lines.length;

      setStatusText(`Found ${totalRows.toLocaleString()} domains. Creating job...`);
      setProgress(5);

      // Create the processing job
      const { data: jobData, error: jobError } = await supabase.functions.invoke(
        "namecheap-csv-upload",
        {
          body: { action: "create-job", totalRows },
        }
      );

      if (jobError || !jobData?.jobId) {
        throw new Error(jobError?.message || jobData?.error || "Failed to create job");
      }

      const jobId = jobData.jobId;
      console.log(`Created job: ${jobId}`);

      // Split into chunks and process
      const totalChunks = Math.ceil(dataLines.lines.length / CHUNK_SIZE);
      let totalInserted = 0;
      let totalErrors = 0;

      for (let i = 0; i < dataLines.lines.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const chunk = dataLines.lines.slice(i, i + CHUNK_SIZE);
        const csvChunk = chunk.join("\n");

        setStatusText(`Processing chunk ${chunkIndex}/${totalChunks}...`);
        setProgress(5 + Math.round((chunkIndex / totalChunks) * 85));

        const { data: chunkData, error: chunkError } = await supabase.functions.invoke(
          "namecheap-csv-upload",
          {
            body: {
              action: "process-chunk",
              jobId,
              csvChunk,
              headers,
              chunkIndex,
              totalChunks,
            },
          }
        );

        if (chunkError) {
          console.error(`Chunk ${chunkIndex} error:`, chunkError);
          totalErrors++;
        } else if (chunkData) {
          totalInserted += chunkData.inserted || 0;
          totalErrors += chunkData.errors || 0;
        }

        // Small delay between chunks to avoid rate limits
        if (i + CHUNK_SIZE < dataLines.lines.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      setStatusText("Finalizing...");
      setProgress(95);

      // Complete the job
      const { data: completeData } = await supabase.functions.invoke(
        "namecheap-csv-upload",
        {
          body: { action: "complete-job", jobId },
        }
      );

      setProgress(100);
      setResult({
        success: true,
        total_parsed: totalRows,
        inserted: completeData?.job?.inserted_rows || totalInserted,
        errors: completeData?.job?.error_count || totalErrors,
      });

      toast.success(
        `Successfully imported ${(completeData?.job?.inserted_rows || totalInserted).toLocaleString()} Namecheap auctions!`
      );
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setResult({ success: false, error: errorMsg });
      toast.error("Upload failed: " + errorMsg);
    } finally {
      setUploading(false);
      setStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  function parseCSVHeader(headerLine: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Stream-parse the CSV file in 1 MB slices to avoid mobile memory exhaustion.
   * Returns the header array and all data lines as strings.
   */
  async function streamParseCSV(
    file: File,
    onProgress: (pct: number) => void
  ): Promise<{ headers: string[]; lines: string[] }> {
    return new Promise((resolve, reject) => {
      const SLICE_SIZE = 1 * 1024 * 1024; // 1 MB
      const reader = new FileReader();
      const lines: string[] = [];
      let headers: string[] = [];
      let leftover = "";
      let offset = 0;
      let headerParsed = false;

      function readNextSlice() {
        const slice = file.slice(offset, offset + SLICE_SIZE);
        reader.readAsText(slice);
      }

      reader.onload = () => {
        const text = (leftover + (reader.result as string));
        const parts = text.split(/\r?\n/);
        // Last part may be incomplete
        leftover = parts.pop() || "";

        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (!headerParsed) {
            headers = parseCSVHeader(trimmed.toLowerCase());
            headerParsed = true;
          } else {
            lines.push(trimmed);
          }
        }

        offset += SLICE_SIZE;
        onProgress((offset / file.size) * 100);

        if (offset < file.size) {
          // Yield to UI thread before next slice
          setTimeout(readNextSlice, 0);
        } else {
          // Handle any leftover data
          if (leftover.trim()) {
            if (!headerParsed) {
              headers = parseCSVHeader(leftover.trim().toLowerCase());
            } else {
              lines.push(leftover.trim());
            }
          }
          resolve({ headers, lines });
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));

      readNextSlice();
    });
  }

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
        using the "Download as CSV" button. Large files (900k+ rows) are processed in chunks.
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
              Processing...
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
              {statusText || "Processing..."}
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

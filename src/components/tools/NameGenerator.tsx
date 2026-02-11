import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePronounceability } from "@/lib/pronounceability";

interface Suggestion {
  name: string;
  score: number;
  reason: string;
  available_tlds: string[];
  pronounceScore?: number;
}

export function NameGenerator() {
  const [keywords, setKeywords] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("mixed");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!keywords.trim()) return;
    setIsLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-domain-names", {
        body: { keywords: keywords.trim(), industry: industry.trim() || undefined, style },
      });

      if (error) throw error;

      const items: Suggestion[] = (data?.suggestions || []).map((s: Suggestion) => ({
        ...s,
        pronounceScore: scorePronounceability(s.name).score,
      }));

      setSuggestions(items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Generation failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Name Generator
        </CardTitle>
        <CardDescription>
          Enter keywords or describe your business, and AI will generate brandable domain name ideas with pronounceability scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Input
            placeholder="Keywords (e.g. fast delivery food app)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Industry (optional)"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="brandable">Brandable / Invented</SelectItem>
                <SelectItem value="keyword">Keyword-Rich</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!keywords.trim() || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Names
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <h4 className="text-sm font-semibold text-foreground">{suggestions.length} Suggestions</h4>
            {suggestions.map((s, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={scoreColor(s.score)}>
                      Brand: {s.score}
                    </Badge>
                    {s.pronounceScore !== undefined && (
                      <Badge variant="outline" className={scoreColor(s.pronounceScore)}>
                        Say: {s.pronounceScore}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{s.reason}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {s.available_tlds.map((tld) => (
                    <Badge key={tld} variant="secondary" className="text-xs">
                      {tld}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

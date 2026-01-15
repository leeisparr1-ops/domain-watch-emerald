import { useState } from "react";
import { Plus, HelpCircle, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface Pattern {
  id: string;
  pattern: string;
  pattern_type: "regex" | "structure" | "pronounceable";
  description: string | null;
  max_price?: number | null;
  min_price?: number;
  tld_filter?: string | null;
  enabled?: boolean;
}

interface PatternDialogProps {
  patterns: Pattern[];
  onAddPattern: (pattern: {
    pattern: string;
    pattern_type: "regex" | "structure" | "pronounceable";
    description?: string;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
  }) => void;
  onRemovePattern: (id: string) => void;
  onClearPatterns: () => void;
}

const PATTERN_PRESETS = [
  { 
    label: "Short pronounceable (CVCV)", 
    pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$",
    pattern_type: "pronounceable" as const,
    description: "4-letter pronounceable like rare, core, made"
  },
  { 
    label: "CVVC pattern", 
    pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou]{2}[bcdfghjklmnpqrstvwxyz]$",
    pattern_type: "pronounceable" as const,
    description: "4-letter with double vowel like cool, boom"
  },
  { 
    label: "3-letter domains", 
    pattern: "^[a-z]{3}$",
    pattern_type: "structure" as const,
    description: "Any 3-letter domain (LLL format)"
  },
  { 
    label: "4-letter domains", 
    pattern: "^[a-z]{4}$",
    pattern_type: "structure" as const,
    description: "Any 4-letter domain (LLLL format)"
  },
  { 
    label: "Numbers only", 
    pattern: "^[0-9]+$",
    pattern_type: "structure" as const,
    description: "Numeric domains like 123, 8888"
  },
  { 
    label: "Word + Number", 
    pattern: "^[a-z]+[0-9]+$",
    pattern_type: "structure" as const,
    description: "Pattern like app2, cloud9"
  },
  { 
    label: "Starts with 'ai'", 
    pattern: "^ai",
    pattern_type: "regex" as const,
    description: "Domains starting with 'ai'"
  },
  { 
    label: "Ends with 'ly'", 
    pattern: "ly$",
    pattern_type: "regex" as const,
    description: "Domains ending with 'ly'"
  },
  { 
    label: "Contains 'tech'", 
    pattern: "tech",
    pattern_type: "regex" as const,
    description: "Domains containing 'tech'"
  },
  { 
    label: "Repeating letters", 
    pattern: "([a-z])\\1",
    pattern_type: "regex" as const,
    description: "Has consecutive repeated letters"
  },
];

export function PatternDialog({ patterns, onAddPattern, onRemovePattern, onClearPatterns }: PatternDialogProps) {
  const [open, setOpen] = useState(false);
  const [customPattern, setCustomPattern] = useState("");
  const [patternType, setPatternType] = useState<"regex" | "structure" | "pronounceable">("regex");
  const [description, setDescription] = useState("");

  const handleAddPreset = (preset: typeof PATTERN_PRESETS[0]) => {
    if (patterns.some(p => p.pattern === preset.pattern)) {
      toast.error("Pattern already exists");
      return;
    }
    onAddPattern({
      pattern: preset.pattern,
      pattern_type: preset.pattern_type,
      description: preset.description,
    });
    toast.success(`Added pattern: ${preset.label}`);
  };

  const handleAddCustom = () => {
    if (!customPattern.trim()) {
      toast.error("Please enter a pattern");
      return;
    }
    
    // Validate regex
    try {
      new RegExp(customPattern);
    } catch {
      toast.error("Invalid regex pattern");
      return;
    }
    
    if (patterns.some(p => p.pattern === customPattern)) {
      toast.error("Pattern already exists");
      return;
    }
    
    onAddPattern({
      pattern: customPattern,
      pattern_type: patternType,
      description: description || `Custom ${patternType} pattern`,
    });
    
    toast.success("Custom pattern added");
    setCustomPattern("");
    setDescription("");
  };

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="hero" className="relative">
            <Plus className="w-4 h-4 mr-2" />
            Add Pattern
            {patterns.length > 0 && (
              <Badge 
                variant="default" 
                className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-primary-foreground text-primary"
              >
                {patterns.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pattern Matching
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Use patterns to find specific domain structures. Patterns use regex to match domain names (without TLD).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Find pronounceable domains, common structures, or specific character sequences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Active Patterns */}
          {patterns.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Active Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {patterns.map((p) => (
                  <Badge 
                    key={p.id} 
                    variant="secondary" 
                    className="flex items-center gap-2 py-1.5 px-3"
                  >
                    <span className="font-mono text-xs">{p.description}</span>
                    <button
                      onClick={() => onRemovePattern(p.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Presets */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Quick Add Patterns</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PATTERN_PRESETS.map((preset, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => handleAddPreset(preset)}
                  disabled={patterns.some(p => p.pattern === preset.pattern)}
                >
                  <div className="text-left">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Pattern */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-medium text-sm">Custom Pattern</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Select value={patternType} onValueChange={(v: "regex" | "structure" | "pronounceable") => setPatternType(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regex">Regex</SelectItem>
                    <SelectItem value="structure">Structure</SelectItem>
                    <SelectItem value="pronounceable">Pronounceable</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter regex pattern..."
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button onClick={handleAddCustom} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Pattern
              </Button>
            </div>
            
            {/* Pattern Help */}
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p className="font-medium">Pattern Examples:</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li><code className="bg-background px-1 rounded">^ai</code> - Starts with "ai"</li>
                <li><code className="bg-background px-1 rounded">ly$</code> - Ends with "ly"</li>
                <li><code className="bg-background px-1 rounded">^[a-z]{"{4}"}$</code> - Exactly 4 letters</li>
                <li><code className="bg-background px-1 rounded">[aeiou]{"{2}"}</code> - Contains double vowel</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      {patterns.length > 0 && (
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={() => {
            onClearPatterns();
            toast.success("All patterns cleared");
          }}
          title="Clear all patterns"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

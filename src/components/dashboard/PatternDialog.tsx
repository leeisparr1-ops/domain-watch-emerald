import { useState } from "react";
import { Plus, HelpCircle, X, Trash2, DollarSign, Globe, Hash, Type, ArrowRight, ArrowLeft, Search, Code, Ban } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
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
    pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
    description?: string;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
  }) => void;
  onRemovePattern: (id: string) => void;
  onClearPatterns: () => void;
  maxPatterns?: number;
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
    label: "5-letter domains", 
    pattern: "^[a-z]{5}$",
    pattern_type: "structure" as const,
    description: "Any 5-letter domain (LLLLL format)"
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
    label: "Contains 'tech'", 
    pattern: "tech",
    pattern_type: "regex" as const,
    description: "Domains containing 'tech'"
  },
  { 
    label: "Keyword + robotics", 
    pattern: "robotics",
    pattern_type: "regex" as const,
    description: "Domains containing 'robotics'"
  },
  { 
    label: "Keyword + intel", 
    pattern: "intel",
    pattern_type: "regex" as const,
    description: "Domains containing 'intel'"
  },
  { 
    label: "Repeating letters", 
    pattern: "([a-z])\\1",
    pattern_type: "regex" as const,
    description: "Has consecutive repeated letters"
  },
];

const TLD_OPTIONS = [
  { value: "any", label: "Any TLD" },
  { value: ".com", label: ".com" },
  { value: ".net", label: ".net" },
  { value: ".org", label: ".org" },
  { value: ".io", label: ".io" },
  { value: ".co", label: ".co" },
  { value: ".ai", label: ".ai" },
  { value: ".xyz", label: ".xyz" },
  { value: ".info", label: ".info" },
  { value: ".dev", label: ".dev" },
  { value: ".app", label: ".app" },
  { value: ".biz", label: ".biz" },
  { value: ".me", label: ".me" },
  { value: ".tv", label: ".tv" },
  { value: ".us", label: ".us" },
  { value: ".uk", label: ".uk" },
  { value: ".ca", label: ".ca" },
  { value: ".de", label: ".de" },
  { value: ".fr", label: ".fr" },
  { value: ".es", label: ".es" },
  { value: ".it", label: ".it" },
  { value: ".nl", label: ".nl" },
  { value: ".eu", label: ".eu" },
  { value: ".au", label: ".au" },
  { value: ".in", label: ".in" },
  { value: ".jp", label: ".jp" },
  { value: ".cn", label: ".cn" },
  { value: ".tech", label: ".tech" },
  { value: ".online", label: ".online" },
  { value: ".store", label: ".store" },
  { value: ".shop", label: ".shop" },
  { value: ".club", label: ".club" },
  { value: ".site", label: ".site" },
  { value: ".website", label: ".website" },
  { value: ".space", label: ".space" },
  { value: ".gg", label: ".gg" },
  { value: ".cc", label: ".cc" },
  { value: ".fm", label: ".fm" },
  { value: ".vc", label: ".vc" },
  { value: ".so", label: ".so" },
];

export function PatternDialog({ 
  patterns, 
  onAddPattern, 
  onRemovePattern, 
  onClearPatterns,
  maxPatterns = Infinity 
}: PatternDialogProps) {
  const [open, setOpen] = useState(false);
  const [customPattern, setCustomPattern] = useState("");
  const [patternType, setPatternType] = useState<"regex" | "structure" | "pronounceable" | "length" | "words">("regex");
  const [description, setDescription] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [presetMaxPrice, setPresetMaxPrice] = useState<string>("");
  const [presetTld, setPresetTld] = useState<string>("any");
  const [customTld, setCustomTld] = useState<string>("any");
  
  // For character count pattern
  const [minChars, setMinChars] = useState<number[]>([3]);
  const [maxChars, setMaxChars] = useState<number[]>([8]);
  
  // For word count pattern
  const [minWords, setMinWords] = useState<number[]>([1]);
  const [maxWords, setMaxWords] = useState<number[]>([2]);
  
  // For user-friendly pattern modes
  const [patternMode, setPatternMode] = useState<"starts" | "ends" | "contains" | "regex">("contains");
  const [startsWithValue, setStartsWithValue] = useState("");
  const [endsWithValue, setEndsWithValue] = useState("");
  
  // Filter options for excluding numbers and hyphens
  const [presetNoNumbers, setPresetNoNumbers] = useState(false);
  const [presetNoHyphens, setPresetNoHyphens] = useState(false);
  const [customNoNumbers, setCustomNoNumbers] = useState(false);
  const [customNoHyphens, setCustomNoHyphens] = useState(false);
  const [containsValue, setContainsValue] = useState("");

  const isAtLimit = patterns.length >= maxPatterns;

  const handleAddPreset = (preset: typeof PATTERN_PRESETS[0]) => {
    if (isAtLimit) {
      toast.error(`Maximum ${maxPatterns} patterns allowed on your plan`);
      return;
    }
    
    // Build pattern with exclusion filters
    let finalPattern = preset.pattern;
    if (presetNoNumbers || presetNoHyphens) {
      // Wrap the pattern with a negative lookahead for excluded characters
      const excludeChars = [];
      if (presetNoNumbers) excludeChars.push('0-9');
      if (presetNoHyphens) excludeChars.push('-');
      finalPattern = `(?!.*[${excludeChars.join('')}])${preset.pattern}`;
    }
    
    if (patterns.some(p => p.pattern === finalPattern && p.tld_filter === (presetTld === "any" ? null : presetTld))) {
      toast.error("Pattern already exists with this TLD");
      return;
    }
    const parsedMaxPrice = presetMaxPrice ? parseFloat(presetMaxPrice) : null;
    const tldFilter = presetTld === "any" ? null : presetTld;
    
    let desc = preset.description;
    if (presetNoNumbers) desc += ' (no numbers)';
    if (presetNoHyphens) desc += ' (no hyphens)';
    if (parsedMaxPrice) desc += ` (max $${parsedMaxPrice})`;
    if (tldFilter) desc += ` [${tldFilter}]`;
    
    onAddPattern({
      pattern: finalPattern,
      pattern_type: preset.pattern_type,
      description: desc,
      max_price: parsedMaxPrice,
      min_price: 0,
      tld_filter: tldFilter,
    });
    toast.success(`Added pattern: ${preset.label}${tldFilter ? ` for ${tldFilter}` : ""}`);
    setPresetMaxPrice("");
    setPresetTld("any");
    setPresetNoNumbers(false);
    setPresetNoHyphens(false);
  };

  const handleAddCharacterCountPattern = () => {
    if (isAtLimit) {
      toast.error(`Maximum ${maxPatterns} patterns allowed on your plan`);
      return;
    }
    
    const min = minChars[0];
    const max = maxChars[0];
    
    if (min > max) {
      toast.error("Minimum must be less than or equal to maximum");
      return;
    }
    
    // Create regex pattern for character count
    const pattern = min === max 
      ? `^[a-z]{${min}}$`
      : `^[a-z]{${min},${max}}$`;
    
    const tldFilter = customTld === "any" ? null : customTld;
    const desc = min === max 
      ? `${min}-character domains${tldFilter ? ` [${tldFilter}]` : ""}`
      : `${min}-${max} character domains${tldFilter ? ` [${tldFilter}]` : ""}`;
    
    if (patterns.some(p => p.pattern === pattern && p.tld_filter === tldFilter)) {
      toast.error("Pattern already exists");
      return;
    }
    
    onAddPattern({
      pattern,
      pattern_type: "length",
      description: desc,
      tld_filter: tldFilter,
    });
    toast.success(`Added pattern: ${desc}`);
  };

  const handleAddWordCountPattern = () => {
    if (isAtLimit) {
      toast.error(`Maximum ${maxPatterns} patterns allowed on your plan`);
      return;
    }
    
    const min = minWords[0];
    const max = maxWords[0];
    
    if (min > max) {
      toast.error("Minimum must be less than or equal to maximum");
      return;
    }
    
    // Create regex pattern for word count (words separated by hyphens or camelCase)
    // This matches domains with 1-N "words" (sequences of letters followed by optional hyphen or capital)
    const pattern = min === max
      ? `^([a-z]+[-]?){${min}}$|^([A-Z]?[a-z]+){${min}}$`
      : `^([a-z]+[-]?){${min},${max}}$|^([A-Z]?[a-z]+){${min},${max}}$`;
    
    const tldFilter = customTld === "any" ? null : customTld;
    const desc = min === max
      ? `${min}-word domains${tldFilter ? ` [${tldFilter}]` : ""}`
      : `${min}-${max} word domains${tldFilter ? ` [${tldFilter}]` : ""}`;
    
    if (patterns.some(p => p.description === desc)) {
      toast.error("Pattern already exists");
      return;
    }
    
    onAddPattern({
      pattern,
      pattern_type: "words",
      description: desc,
      tld_filter: tldFilter,
    });
    toast.success(`Added pattern: ${desc}`);
  };

  const buildPatternFromMode = (): { pattern: string; desc: string } | null => {
    switch (patternMode) {
      case "starts":
        if (!startsWithValue.trim()) return null;
        return {
          pattern: `^${escapeRegex(startsWithValue.toLowerCase())}`,
          desc: `Starts with "${startsWithValue}"`
        };
      case "ends":
        if (!endsWithValue.trim()) return null;
        return {
          pattern: `${escapeRegex(endsWithValue.toLowerCase())}$`,
          desc: `Ends with "${endsWithValue}"`
        };
      case "contains":
        if (!containsValue.trim()) return null;
        return {
          pattern: escapeRegex(containsValue.toLowerCase()),
          desc: `Contains "${containsValue}"`
        };
      case "regex":
        if (!customPattern.trim()) return null;
        return {
          pattern: customPattern,
          desc: description || `Custom regex: ${customPattern}`
        };
      default:
        return null;
    }
  };
  
  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleAddCustom = () => {
    if (isAtLimit) {
      toast.error(`Maximum ${maxPatterns} patterns allowed on your plan`);
      return;
    }
    
    const result = buildPatternFromMode();
    if (!result) {
      toast.error("Please enter a value");
      return;
    }
    
    // Validate regex
    try {
      new RegExp(result.pattern);
    } catch {
      toast.error("Invalid regex pattern");
      return;
    }
    
    // Build pattern with exclusion filters
    let finalPattern = result.pattern;
    if (customNoNumbers || customNoHyphens) {
      const excludeChars = [];
      if (customNoNumbers) excludeChars.push('0-9');
      if (customNoHyphens) excludeChars.push('-');
      finalPattern = `(?!.*[${excludeChars.join('')}])${result.pattern}`;
    }
    
    const tldFilter = customTld === "any" ? null : customTld;
    if (patterns.some(p => p.pattern === finalPattern && p.tld_filter === tldFilter)) {
      toast.error("Pattern already exists with this TLD");
      return;
    }
    
    const parsedMinPrice = minPrice ? parseFloat(minPrice) : 0;
    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null;
    
    let finalDescription = result.desc;
    if (customNoNumbers) finalDescription += ' (no numbers)';
    if (customNoHyphens) finalDescription += ' (no hyphens)';
    if (parsedMinPrice > 0 || parsedMaxPrice) {
      const priceRange = parsedMinPrice > 0 && parsedMaxPrice 
        ? `$${parsedMinPrice}-$${parsedMaxPrice}`
        : parsedMaxPrice 
          ? `max $${parsedMaxPrice}`
          : `min $${parsedMinPrice}`;
      finalDescription += ` (${priceRange})`;
    }
    if (tldFilter) {
      finalDescription += ` [${tldFilter}]`;
    }
    
    onAddPattern({
      pattern: finalPattern,
      pattern_type: patternMode === "regex" ? patternType : "regex",
      description: finalDescription,
      max_price: parsedMaxPrice,
      min_price: parsedMinPrice,
      tld_filter: tldFilter,
    });
    
    toast.success(`Pattern added${tldFilter ? ` for ${tldFilter}` : ""}`);
    setCustomPattern("");
    setStartsWithValue("");
    setEndsWithValue("");
    setContainsValue("");
    setDescription("");
    setMinPrice("");
    setMaxPrice("");
    setCustomTld("any");
    setCustomNoNumbers(false);
    setCustomNoHyphens(false);
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
                {patterns.length}{maxPatterns < Infinity ? `/${maxPatterns}` : ""}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pattern Matching
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Use patterns to find specific domain structures. Get alerts on your phone when matching domains appear!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Set up patterns and receive instant mobile alerts when matching domains become available.
            {maxPatterns < Infinity && (
              <span className="block mt-1 text-primary">
                {patterns.length}/{maxPatterns} patterns used
              </span>
            )}
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
            
            {/* Filters for presets */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">TLD:</span>
                <Select value={presetTld} onValueChange={setPresetTld}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TLD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Max:</span>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={presetMaxPrice}
                  onChange={(e) => setPresetMaxPrice(e.target.value)}
                  className="w-24 h-8"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="preset-no-numbers" 
                    checked={presetNoNumbers} 
                    onCheckedChange={(checked) => setPresetNoNumbers(checked === true)}
                  />
                  <label htmlFor="preset-no-numbers" className="text-sm text-muted-foreground cursor-pointer">
                    No numbers
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="preset-no-hyphens" 
                    checked={presetNoHyphens} 
                    onCheckedChange={(checked) => setPresetNoHyphens(checked === true)}
                  />
                  <label htmlFor="preset-no-hyphens" className="text-sm text-muted-foreground cursor-pointer">
                    No hyphens
                  </label>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">(applies to preset you click)</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PATTERN_PRESETS.map((preset, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3"
                  onClick={() => handleAddPreset(preset)}
                  disabled={isAtLimit || patterns.some(p => p.pattern === preset.pattern && p.tld_filter === (presetTld === "any" ? null : presetTld))}
                >
                  <div className="text-left">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Character Count Pattern */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Number of Characters
            </h4>
            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Min: {minChars[0]} chars</span>
                  <span>Max: {maxChars[0]} chars</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Slider
                      value={minChars}
                      onValueChange={setMinChars}
                      min={1}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <Slider
                      value={maxChars}
                      onValueChange={setMaxChars}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleAddCharacterCountPattern} 
                variant="secondary" 
                className="w-full"
                disabled={isAtLimit}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {minChars[0]}-{maxChars[0]} Character Pattern
              </Button>
            </div>
          </div>

          {/* Word Count Pattern */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Type className="w-4 h-4" />
              Number of Words
            </h4>
            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Min: {minWords[0]} word{minWords[0] > 1 ? 's' : ''}</span>
                  <span>Max: {maxWords[0]} words</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Slider
                      value={minWords}
                      onValueChange={setMinWords}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <Slider
                      value={maxWords}
                      onValueChange={setMaxWords}
                      min={1}
                      max={6}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleAddWordCountPattern} 
                variant="secondary" 
                className="w-full"
                disabled={isAtLimit}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {minWords[0]}-{maxWords[0]} Word Pattern
              </Button>
            </div>
          </div>

          {/* Custom Pattern */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-medium text-sm">Custom Pattern</h4>
            <div className="space-y-4">
              {/* Pattern Mode Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted/50">
                <button
                  onClick={() => setPatternMode("starts")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    patternMode === "starts" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Starts with</span>
                  <span className="sm:hidden">Start</span>
                </button>
                <button
                  onClick={() => setPatternMode("ends")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    patternMode === "ends" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ends with</span>
                  <span className="sm:hidden">End</span>
                </button>
                <button
                  onClick={() => setPatternMode("contains")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    patternMode === "contains" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Contains</span>
                  <span className="sm:hidden">Has</span>
                </button>
                <button
                  onClick={() => setPatternMode("regex")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    patternMode === "regex" 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regex</span>
                  <span className="sm:hidden">Regex</span>
                </button>
              </div>
              
              {/* Pattern Input based on mode */}
              <div className="space-y-3">
                {patternMode === "starts" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Domain starts with:</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center bg-muted/30 rounded-md border border-input">
                        <span className="px-3 text-muted-foreground text-sm font-mono">^</span>
                        <Input
                          placeholder="e.g., ai, cloud, app"
                          value={startsWithValue}
                          onChange={(e) => setStartsWithValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Matches domains like: <span className="font-mono text-foreground">{startsWithValue || "ai"}domain.com</span>
                    </p>
                  </div>
                )}
                
                {patternMode === "ends" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Domain ends with:</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center bg-muted/30 rounded-md border border-input">
                        <Input
                          placeholder="e.g., app, hub, ai"
                          value={endsWithValue}
                          onChange={(e) => setEndsWithValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <span className="px-3 text-muted-foreground text-sm font-mono">$</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Matches domains like: <span className="font-mono text-foreground">domain{endsWithValue || "app"}.com</span>
                    </p>
                  </div>
                )}
                
                {patternMode === "contains" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Domain contains:</label>
                    <Input
                      placeholder="e.g., tech, data, crypto"
                      value={containsValue}
                      onChange={(e) => setContainsValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Matches domains like: <span className="font-mono text-foreground">my{containsValue || "tech"}site.com</span>
                    </p>
                  </div>
                )}
                
                {patternMode === "regex" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={patternType} onValueChange={(v: "regex" | "structure" | "pronounceable" | "length" | "words") => setPatternType(v)}>
                        <SelectTrigger className="w-[140px]">
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
                    <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                      <p className="font-medium">Regex Examples:</p>
                      <ul className="text-muted-foreground space-y-0.5">
                        <li><code className="bg-background px-1 rounded">^[a-z]{"{5}"}$</code> - Exactly 5 letters</li>
                        <li><code className="bg-background px-1 rounded">[aeiou]{"{2}"}</code> - Contains double vowel</li>
                        <li><code className="bg-background px-1 rounded">([a-z])\1</code> - Has repeated letters</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Filters for Custom Pattern */}
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">TLD:</span>
                    <Select value={customTld} onValueChange={setCustomTld}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TLD_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-20 h-8"
                      min="0"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-20 h-8"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="custom-no-numbers" 
                        checked={customNoNumbers} 
                        onCheckedChange={(checked) => setCustomNoNumbers(checked === true)}
                      />
                      <label htmlFor="custom-no-numbers" className="text-sm text-muted-foreground cursor-pointer">
                        No numbers
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="custom-no-hyphens" 
                        checked={customNoHyphens} 
                        onCheckedChange={(checked) => setCustomNoHyphens(checked === true)}
                      />
                      <label htmlFor="custom-no-hyphens" className="text-sm text-muted-foreground cursor-pointer">
                        No hyphens
                      </label>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleAddCustom} className="w-full" disabled={isAtLimit}>
                  <Plus className="w-4 h-4 mr-2" />
                  {patternMode === "starts" && `Add "Starts with ${startsWithValue || '...'}" Pattern`}
                  {patternMode === "ends" && `Add "Ends with ${endsWithValue || '...'}" Pattern`}
                  {patternMode === "contains" && `Add "Contains ${containsValue || '...'}" Pattern`}
                  {patternMode === "regex" && "Add Custom Regex Pattern"}
                </Button>
              </div>
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              title="Clear all patterns"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                Clear all patterns?
                <Badge variant="destructive" className="text-sm font-bold">
                  {patterns.length}
                </Badge>
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove all {patterns.length} saved pattern{patterns.length !== 1 ? 's' : ''} and stop any associated alerts. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  onClearPatterns();
                  toast.success("All patterns cleared");
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
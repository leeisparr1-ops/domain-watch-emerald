import { useState, useCallback } from "react";
import { Plus, HelpCircle, X, Trash2, DollarSign, Globe, ArrowRight, ArrowLeft, Search, Code, Ruler, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useBackClose } from "@/hooks/useBackClose";

export interface Pattern {
  id: string;
  pattern: string;
  pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
  description: string | null;
  max_price?: number | null;
  min_price?: number;
  tld_filter?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  min_age?: number | null;
  max_age?: number | null;
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
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => Promise<unknown> | void;
  onRemovePattern: (id: string) => void;
  onClearPatterns: () => void;
  maxPatterns?: number;
}

interface PatternPreset {
  label: string;
  pattern: string;
  pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
  description: string;
  category: "structure" | "pronounceable" | "keyword" | "numeric";
}

const PATTERN_PRESETS: PatternPreset[] = [
  // Structure
  { label: "3-Letter (LLL)", pattern: "^[a-z]{3}$", pattern_type: "structure", description: "Any 3-letter domain", category: "structure" },
  { label: "4-Letter (LLLL)", pattern: "^[a-z]{4}$", pattern_type: "structure", description: "Any 4-letter domain", category: "structure" },
  { label: "5-Letter (LLLLL)", pattern: "^[a-z]{5}$", pattern_type: "structure", description: "Any 5-letter domain", category: "structure" },
  { label: "6-Letter", pattern: "^[a-z]{6}$", pattern_type: "structure", description: "Any 6-letter domain", category: "structure" },
  { label: "Word + Number", pattern: "^[a-z]+[0-9]+$", pattern_type: "structure", description: "Pattern like app2, cloud9", category: "structure" },
  { label: "Repeating Letters", pattern: "([a-z])\\1", pattern_type: "regex", description: "Has consecutive repeated letters", category: "structure" },
  // Pronounceable
  { label: "CVCV (4-char)", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$", pattern_type: "pronounceable", description: "4-letter like rare, core", category: "pronounceable" },
  { label: "CVVC (4-char)", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou]{2}[bcdfghjklmnpqrstvwxyz]$", pattern_type: "pronounceable", description: "4-letter like cool, boom", category: "pronounceable" },
  { label: "CVCVC (5-char)", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$", pattern_type: "pronounceable", description: "5-letter like vapor, lemon", category: "pronounceable" },
  { label: "VCV (3-char)", pattern: "^[aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$", pattern_type: "pronounceable", description: "3-letter like ace, ape", category: "pronounceable" },
  // Keyword
  { label: "Starts 'ai'", pattern: "^ai", pattern_type: "regex", description: "Starts with 'ai'", category: "keyword" },
  { label: "Contains 'tech'", pattern: "tech", pattern_type: "regex", description: "Contains 'tech'", category: "keyword" },
  { label: "Contains 'data'", pattern: "data", pattern_type: "regex", description: "Contains 'data'", category: "keyword" },
  { label: "Contains 'cloud'", pattern: "cloud", pattern_type: "regex", description: "Contains 'cloud'", category: "keyword" },
  { label: "Contains 'app'", pattern: "app", pattern_type: "regex", description: "Contains 'app'", category: "keyword" },
  { label: "Contains 'crypto'", pattern: "crypto", pattern_type: "regex", description: "Contains 'crypto'", category: "keyword" },
  { label: "Contains 'health'", pattern: "health", pattern_type: "regex", description: "Contains 'health'", category: "keyword" },
  { label: "Contains 'pay'", pattern: "pay", pattern_type: "regex", description: "Contains 'pay'", category: "keyword" },
  // Numeric
  { label: "Numbers Only", pattern: "^[0-9]+$", pattern_type: "structure", description: "Numeric like 123, 8888", category: "numeric" },
  { label: "3-Digit", pattern: "^[0-9]{3}$", pattern_type: "structure", description: "3-digit numeric domains", category: "numeric" },
  { label: "4-Digit", pattern: "^[0-9]{4}$", pattern_type: "structure", description: "4-digit numeric domains", category: "numeric" },
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
  const handleClose = useCallback(() => setOpen(false), []);
  useBackClose(open, handleClose);
  const [customPattern, setCustomPattern] = useState("");
  const [patternType, setPatternType] = useState<"regex" | "structure" | "pronounceable" | "length" | "words">("regex");
  const [description, setDescription] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [presetMaxPrice, setPresetMaxPrice] = useState<string>("");
  const [presetTld, setPresetTld] = useState<string>("any");
  const [customTld, setCustomTld] = useState<string>("any");
  
  // For min/max length filters (Quick Add)
  const [presetMinLength, setPresetMinLength] = useState<string>("");
  const [presetMaxLength, setPresetMaxLength] = useState<string>("");
  // For min/max age filters (Quick Add)
  const [presetMinAge, setPresetMinAge] = useState<string>("");
  const [presetMaxAge, setPresetMaxAge] = useState<string>("");
  
  // For min/max length filters (Custom Pattern)
  const [customMinLength, setCustomMinLength] = useState<string>("");
  const [customMaxLength, setCustomMaxLength] = useState<string>("");
  // For min/max age filters (Custom Pattern)
  const [customMinAge, setCustomMinAge] = useState<string>("");
  const [customMaxAge, setCustomMaxAge] = useState<string>("");
  
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

  // Build exclusion pattern with proper anchoring to check entire domain
  const buildExclusionPattern = (basePattern: string, noNumbers: boolean, noHyphens: boolean): string => {
    if (!noNumbers && !noHyphens) return basePattern;
    
    const excludeChars = [];
    if (noNumbers) excludeChars.push('0-9');
    if (noHyphens) excludeChars.push('-');
    const lookahead = `(?!.*[${excludeChars.join('')}])`;
    
    // If pattern already starts with ^, insert lookahead after it
    if (basePattern.startsWith('^')) {
      return `^${lookahead}${basePattern.slice(1)}`;
    }
    // Otherwise, anchor to start and add .* to allow matching anywhere
    return `^${lookahead}.*${basePattern}`;
  };

  const handleAddPreset = (preset: typeof PATTERN_PRESETS[0]) => {
    if (isAtLimit) {
      toast.error(`Maximum ${maxPatterns} patterns allowed on your plan`);
      return;
    }
    
    // Build pattern with exclusion filters - properly anchored
    const finalPattern = buildExclusionPattern(preset.pattern, presetNoNumbers, presetNoHyphens);
    
    if (patterns.some(p => p.pattern === finalPattern && p.tld_filter === (presetTld === "any" ? null : presetTld))) {
      toast.error("Pattern already exists with this TLD");
      return;
    }
    const parsedMaxPrice = presetMaxPrice ? parseFloat(presetMaxPrice) : null;
    const tldFilter = presetTld === "any" ? null : presetTld;
    
    // Parse length and age filters
    const parsedMinLength = presetMinLength ? parseInt(presetMinLength) : null;
    const parsedMaxLength = presetMaxLength ? parseInt(presetMaxLength) : null;
    const parsedMinAge = presetMinAge ? parseInt(presetMinAge) : null;
    const parsedMaxAge = presetMaxAge ? parseInt(presetMaxAge) : null;
    
    let desc = preset.description;
    if (presetNoNumbers) desc += ' (no numbers)';
    if (presetNoHyphens) desc += ' (no hyphens)';
    if (parsedMaxPrice) desc += ` (max $${parsedMaxPrice})`;
    if (parsedMinLength || parsedMaxLength) {
      const lengthRange = parsedMinLength && parsedMaxLength 
        ? `${parsedMinLength}-${parsedMaxLength} chars`
        : parsedMaxLength 
          ? `≤${parsedMaxLength} chars`
          : `≥${parsedMinLength} chars`;
      desc += ` [${lengthRange}]`;
    }
    if (parsedMinAge || parsedMaxAge) {
      const ageRange = parsedMinAge && parsedMaxAge 
        ? `${parsedMinAge}-${parsedMaxAge}yr`
        : parsedMaxAge 
          ? `≤${parsedMaxAge}yr`
          : `≥${parsedMinAge}yr`;
      desc += ` [${ageRange}]`;
    }
    if (tldFilter) desc += ` [${tldFilter}]`;
    
    onAddPattern({
      pattern: finalPattern,
      pattern_type: preset.pattern_type,
      description: desc,
      max_price: parsedMaxPrice,
      min_price: 0,
      tld_filter: tldFilter,
      min_length: parsedMinLength,
      max_length: parsedMaxLength,
      min_age: parsedMinAge,
      max_age: parsedMaxAge,
    });
    toast.success(`Added pattern: ${preset.label}${tldFilter ? ` for ${tldFilter}` : ""}`);
    setPresetMaxPrice("");
    setPresetTld("any");
    setPresetNoNumbers(false);
    setPresetNoHyphens(false);
    setPresetMinLength("");
    setPresetMaxLength("");
    setPresetMinAge("");
    setPresetMaxAge("");
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
    
    // Build pattern with exclusion filters - properly anchored to check entire domain
    const finalPattern = buildExclusionPattern(result.pattern, customNoNumbers, customNoHyphens);
    
    const tldFilter = customTld === "any" ? null : customTld;
    if (patterns.some(p => p.pattern === finalPattern && p.tld_filter === tldFilter)) {
      toast.error("Pattern already exists with this TLD");
      return;
    }
    
    const parsedMinPrice = minPrice ? parseFloat(minPrice) : 0;
    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : null;
    
    // Parse length and age filters
    const parsedMinLength = customMinLength ? parseInt(customMinLength) : null;
    const parsedMaxLength = customMaxLength ? parseInt(customMaxLength) : null;
    const parsedMinAge = customMinAge ? parseInt(customMinAge) : null;
    const parsedMaxAge = customMaxAge ? parseInt(customMaxAge) : null;
    
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
    if (parsedMinLength || parsedMaxLength) {
      const lengthRange = parsedMinLength && parsedMaxLength 
        ? `${parsedMinLength}-${parsedMaxLength} chars`
        : parsedMaxLength 
          ? `≤${parsedMaxLength} chars`
          : `≥${parsedMinLength} chars`;
      finalDescription += ` [${lengthRange}]`;
    }
    if (parsedMinAge || parsedMaxAge) {
      const ageRange = parsedMinAge && parsedMaxAge 
        ? `${parsedMinAge}-${parsedMaxAge}yr`
        : parsedMaxAge 
          ? `≤${parsedMaxAge}yr`
          : `≥${parsedMinAge}yr`;
      finalDescription += ` [${ageRange}]`;
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
      min_length: parsedMinLength,
      max_length: parsedMaxLength,
      min_age: parsedMinAge,
      max_age: parsedMaxAge,
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
    setCustomMinLength("");
    setCustomMaxLength("");
    setCustomMinAge("");
    setCustomMaxAge("");
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
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <div className="flex flex-wrap items-center gap-3">
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
              </div>
              
              {/* Character length and domain age filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Chars:</span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={presetMinLength}
                    onChange={(e) => setPresetMinLength(e.target.value)}
                    className="w-16 h-8"
                    min="1"
                    max="50"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={presetMaxLength}
                    onChange={(e) => setPresetMaxLength(e.target.value)}
                    className="w-16 h-8"
                    min="1"
                    max="50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={presetMinAge}
                    onChange={(e) => setPresetMinAge(e.target.value)}
                    className="w-16 h-8"
                    min="0"
                    max="30"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={presetMaxAge}
                    onChange={(e) => setPresetMaxAge(e.target.value)}
                    className="w-16 h-8"
                    min="0"
                    max="30"
                  />
                  <span className="text-xs text-muted-foreground">yrs</span>
                </div>
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
            </div>
            
            {/* Structure */}
            <div>
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Structure</h5>
              <div className="flex flex-wrap gap-1.5">
                {PATTERN_PRESETS.filter(p => p.category === "structure").map((preset, idx) => {
                  const alreadyAdded = patterns.some(p => p.pattern === preset.pattern && p.tld_filter === (presetTld === "any" ? null : presetTld));
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAtLimit || alreadyAdded}
                      title={preset.description}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium
                        border transition-all duration-150 cursor-pointer select-none
                        ${alreadyAdded
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20 opacity-60 cursor-not-allowed"
                          : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pronounceable */}
            <div>
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Pronounceable</h5>
              <div className="flex flex-wrap gap-1.5">
                {PATTERN_PRESETS.filter(p => p.category === "pronounceable").map((preset, idx) => {
                  const alreadyAdded = patterns.some(p => p.pattern === preset.pattern && p.tld_filter === (presetTld === "any" ? null : presetTld));
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAtLimit || alreadyAdded}
                      title={preset.description}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium
                        border transition-all duration-150 cursor-pointer select-none
                        ${alreadyAdded
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 shadow-sm ring-1 ring-purple-500/20 opacity-60 cursor-not-allowed"
                          : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/15"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Keywords</h5>
              <div className="flex flex-wrap gap-1.5">
                {PATTERN_PRESETS.filter(p => p.category === "keyword").map((preset, idx) => {
                  const alreadyAdded = patterns.some(p => p.pattern === preset.pattern && p.tld_filter === (presetTld === "any" ? null : presetTld));
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAtLimit || alreadyAdded}
                      title={preset.description}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium
                        border transition-all duration-150 cursor-pointer select-none
                        ${alreadyAdded
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-sm ring-1 ring-amber-500/20 opacity-60 cursor-not-allowed"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Numeric */}
            <div>
              <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Numeric</h5>
              <div className="flex flex-wrap gap-1.5">
                {PATTERN_PRESETS.filter(p => p.category === "numeric").map((preset, idx) => {
                  const alreadyAdded = patterns.some(p => p.pattern === preset.pattern && p.tld_filter === (presetTld === "any" ? null : presetTld));
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAtLimit || alreadyAdded}
                      title={preset.description}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium
                        border transition-all duration-150 cursor-pointer select-none
                        ${alreadyAdded
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 shadow-sm ring-1 ring-blue-500/20 opacity-60 cursor-not-allowed"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/15"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
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
                <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex flex-wrap items-center gap-3">
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
                  </div>
                  
                  {/* Character length and domain age filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Chars:</span>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={customMinLength}
                        onChange={(e) => setCustomMinLength(e.target.value)}
                        className="w-16 h-8"
                        min="1"
                        max="50"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={customMaxLength}
                        onChange={(e) => setCustomMaxLength(e.target.value)}
                        className="w-16 h-8"
                        min="1"
                        max="50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Age:</span>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={customMinAge}
                        onChange={(e) => setCustomMinAge(e.target.value)}
                        className="w-16 h-8"
                        min="0"
                        max="30"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={customMaxAge}
                        onChange={(e) => setCustomMaxAge(e.target.value)}
                        className="w-16 h-8"
                        min="0"
                        max="30"
                      />
                      <span className="text-xs text-muted-foreground">yrs</span>
                    </div>
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
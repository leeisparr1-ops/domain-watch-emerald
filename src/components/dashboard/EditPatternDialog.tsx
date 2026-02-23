import { useState, useEffect, useCallback } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPattern } from "@/hooks/useUserPatterns";
import { useBackClose } from "@/hooks/useBackClose";

const TLD_OPTIONS = [
  { value: "all", label: "All TLDs" },
  { value: ".com", label: ".com" },
  { value: ".net", label: ".net" },
  { value: ".org", label: ".org" },
  { value: ".io", label: ".io" },
  { value: ".co", label: ".co" },
  { value: ".ai", label: ".ai" },
  { value: ".dev", label: ".dev" },
  { value: ".app", label: ".app" },
  { value: ".me", label: ".me" },
  { value: ".tv", label: ".tv" },
  { value: ".xyz", label: ".xyz" },
];

interface EditPatternDialogProps {
  pattern: UserPattern | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: {
    description?: string | null;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => Promise<boolean>;
}

export function EditPatternDialog({
  pattern,
  open,
  onOpenChange,
  onSave,
}: EditPatternDialogProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useBackClose(open, handleClose);
  const [description, setDescription] = useState("");
  const [tldFilter, setTldFilter] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when pattern changes
  useEffect(() => {
    if (pattern) {
      setDescription(pattern.description || "");
      setTldFilter(pattern.tld_filter || "all");
      setMaxPrice(pattern.max_price?.toString() || "");
      setMinPrice(pattern.min_price?.toString() || "0");
      setMinLength(pattern.min_length?.toString() || "");
      setMaxLength(pattern.max_length?.toString() || "");
      setMinAge(pattern.min_age?.toString() || "");
      setMaxAge(pattern.max_age?.toString() || "");
    }
  }, [pattern]);

  const handleSave = async () => {
    if (!pattern) return;
    
    setSaving(true);
    const success = await onSave(pattern.id, {
      description: description || null,
      tld_filter: tldFilter === "all" ? null : tldFilter,
      max_price: maxPrice ? Number(maxPrice) : null,
      min_price: minPrice ? Number(minPrice) : 0,
      min_length: minLength ? Number(minLength) : null,
      max_length: maxLength ? Number(maxLength) : null,
      min_age: minAge ? Number(minAge) : null,
      max_age: maxAge ? Number(maxAge) : null,
    });
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  if (!pattern) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Pattern
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pattern display (read-only) */}
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Pattern (read-only)</Label>
            <div className="p-2 rounded bg-muted font-mono text-sm truncate">
              {pattern.pattern}
            </div>
            <p className="text-xs text-muted-foreground capitalize">Type: {pattern.pattern_type}</p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Description / Name</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Short .com domains"
            />
          </div>

          {/* TLD Filter */}
          <div className="space-y-1">
            <Label>TLD Filter</Label>
            <Select value={tldFilter} onValueChange={setTldFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {TLD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="minPrice">Min Price ($)</Label>
              <Input
                id="minPrice"
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPrice">Max Price ($)</Label>
              <Input
                id="maxPrice"
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
              />
            </div>
          </div>

          {/* Character Length */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="minLength">Min Chars</Label>
              <Input
                id="minLength"
                type="number"
                min="1"
                max="63"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
                placeholder="Any"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxLength">Max Chars</Label>
              <Input
                id="maxLength"
                type="number"
                min="1"
                max="63"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                placeholder="Any"
              />
            </div>
          </div>

          {/* Domain Age */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="minAge">Min Age (years)</Label>
              <Input
                id="minAge"
                type="number"
                min="0"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="Any"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxAge">Max Age (years)</Label>
              <Input
                id="maxAge"
                type="number"
                min="0"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="Any"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Check className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

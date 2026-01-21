import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPattern } from "@/hooks/useUserPatterns";

interface SavedPatternsPanelProps {
  patterns: UserPattern[];
  onRemovePattern: (id: string) => void;
  onTogglePattern: (id: string, enabled: boolean) => void;
  onRenamePattern: (id: string, newDescription: string) => void;
  maxPatterns: number;
}

export function SavedPatternsPanel({
  patterns,
  onRemovePattern,
  onTogglePattern,
  onRenamePattern,
  maxPatterns,
}: SavedPatternsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (pattern: UserPattern) => {
    setEditingId(pattern.id);
    setEditValue(pattern.description || pattern.pattern);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      onRenamePattern(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  if (patterns.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl glass border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Saved Patterns</h3>
          <Badge variant="secondary" className="text-xs">
            {patterns.length}/{maxPatterns}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className={`flex items-center justify-between p-3 rounded-lg bg-background/50 border ${
              pattern.enabled ? "border-primary/30" : "border-border opacity-60"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={() => onTogglePattern(pattern.id, !pattern.enabled)}
                title={pattern.enabled ? "Disable pattern" : "Enable pattern"}
              >
                {pattern.enabled ? (
                  <ToggleRight className="w-5 h-5 text-primary" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                )}
              </Button>

              {editingId === pattern.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(pattern.id);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-primary"
                    onClick={() => handleSaveEdit(pattern.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto"
                    onClick={handleCancelEdit}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {pattern.description || pattern.pattern}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">
                      {pattern.pattern_type}
                    </span>
                    {pattern.tld_filter && (
                      <Badge variant="outline" className="text-xs py-0">
                        {pattern.tld_filter}
                      </Badge>
                    )}
                    {pattern.max_price && (
                      <span className="text-xs text-muted-foreground">
                        Max: ${pattern.max_price}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {editingId !== pattern.id && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartEdit(pattern)}
                  title="Rename pattern"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-muted-foreground hover:text-destructive"
                  onClick={() => onRemovePattern(pattern.id)}
                  title="Delete pattern"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {patterns.length >= maxPatterns && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          You've reached your pattern limit. Upgrade your plan for more patterns!
        </p>
      )}
    </motion.div>
  );
}

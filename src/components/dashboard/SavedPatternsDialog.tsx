import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPattern } from "@/hooks/useUserPatterns";

interface SavedPatternsDialogProps {
  patterns: UserPattern[];
  onRemovePattern: (id: string) => void;
  onTogglePattern: (id: string, enabled: boolean) => void;
  onRenamePattern: (id: string, newDescription: string) => void;
  maxPatterns: number;
}

export function SavedPatternsDialog({
  patterns,
  onRemovePattern,
  onTogglePattern,
  onRenamePattern,
  maxPatterns,
}: SavedPatternsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [open, setOpen] = useState(false);

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

  const enabledCount = patterns.filter(p => p.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bookmark className="w-4 h-4" />
          <span className="hidden sm:inline">Saved Patterns</span>
          <Badge variant="secondary" className="text-xs">
            {patterns.length}/{maxPatterns}
          </Badge>
          {enabledCount > 0 && (
            <Badge variant="default" className="text-xs">
              {enabledCount} active
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Saved Patterns
            <Badge variant="secondary" className="text-xs">
              {patterns.length}/{maxPatterns}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved patterns yet.</p>
              <p className="text-sm mt-1">Add patterns to filter and get alerts for specific domains.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patterns.map((pattern) => (
                <motion.div
                  key={pattern.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
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
                </motion.div>
              ))}
            </div>
          )}

          {patterns.length >= maxPatterns && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              You've reached your pattern limit. Upgrade your plan for more patterns!
            </p>
          )}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>Toggle patterns on/off to filter auctions. Enabled patterns will also trigger alerts.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

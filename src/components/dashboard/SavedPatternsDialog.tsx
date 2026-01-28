import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Trash2, Pencil, ToggleLeft, ToggleRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPattern } from "@/hooks/useUserPatterns";
import { EditPatternDialog } from "./EditPatternDialog";

interface SavedPatternsDialogProps {
  patterns: UserPattern[];
  onRemovePattern: (id: string) => void;
  onTogglePattern: (id: string, enabled: boolean) => void;
  onRenamePattern: (id: string, newDescription: string) => void;
  onUpdatePattern?: (id: string, updates: {
    description?: string | null;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => Promise<boolean>;
  maxPatterns: number;
}

export function SavedPatternsDialog({
  patterns,
  onRemovePattern,
  onTogglePattern,
  onRenamePattern,
  onUpdatePattern,
  maxPatterns,
}: SavedPatternsDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<UserPattern | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleOpenEdit = (pattern: UserPattern) => {
    setEditingPattern(pattern);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: {
    description?: string | null;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => {
    if (onUpdatePattern) {
      return await onUpdatePattern(id, updates);
    }
    // Fallback to just renaming if onUpdatePattern not provided
    if (updates.description !== undefined) {
      onRenamePattern(id, updates.description || "");
    }
    return true;
  };

  const enabledCount = patterns.filter(p => p.enabled).length;

  return (
    <>
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

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {pattern.description || pattern.pattern}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground capitalize">
                            {pattern.pattern_type}
                          </span>
                          {pattern.tld_filter && (
                            <Badge variant="outline" className="text-xs py-0">
                              {pattern.tld_filter}
                            </Badge>
                          )}
                          {(pattern.min_price > 0 || pattern.max_price) && (
                            <span className="text-xs text-muted-foreground">
                              {pattern.min_price > 0 && pattern.max_price 
                                ? `$${pattern.min_price}-$${pattern.max_price}`
                                : pattern.max_price 
                                  ? `≤$${pattern.max_price}`
                                  : `≥$${pattern.min_price}`}
                            </span>
                          )}
                          {(pattern.min_length || pattern.max_length) && (
                            <span className="text-xs text-muted-foreground">
                              {pattern.min_length && pattern.max_length 
                                ? `${pattern.min_length}-${pattern.max_length} chars`
                                : pattern.max_length 
                                  ? `≤${pattern.max_length} chars`
                                  : `≥${pattern.min_length} chars`}
                            </span>
                          )}
                          {(pattern.min_age || pattern.max_age) && (
                            <span className="text-xs text-muted-foreground">
                              {pattern.min_age && pattern.max_age 
                                ? `${pattern.min_age}-${pattern.max_age}yr`
                                : pattern.max_age 
                                  ? `≤${pattern.max_age}yr`
                                  : `≥${pattern.min_age}yr`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto text-muted-foreground hover:text-primary"
                        onClick={() => handleOpenEdit(pattern)}
                        title="Edit pattern settings"
                      >
                        <Settings2 className="w-4 h-4" />
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
            <p>Toggle patterns on/off to filter auctions. Click <Settings2 className="w-3 h-3 inline" /> to edit settings.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pattern Dialog */}
      <EditPatternDialog
        pattern={editingPattern}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </>
  );
}

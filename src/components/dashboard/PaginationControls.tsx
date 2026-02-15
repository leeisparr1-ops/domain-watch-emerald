import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  jumpToPage: string;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
  onJumpToPageChange: (value: string) => void;
}

export function PaginationControls({
  currentPage, totalPages, itemsPerPage,
  jumpToPage, onPageChange, onItemsPerPageChange, onJumpToPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
          <SelectTrigger className="w-20 h-8 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="250">250</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">per page</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="hidden sm:flex">First</Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => (
            typeof page === 'number' ? (
              <Button key={idx} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-9" onClick={() => onPageChange(page)}>
                {page}
              </Button>
            ) : (
              <span key={idx} className="px-2 text-muted-foreground">...</span>
            )
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="hidden sm:flex">Last</Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Go to:</span>
        <Input
          type="number"
          min={1}
          max={totalPages}
          value={jumpToPage}
          onChange={(e) => onJumpToPageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const page = parseInt(jumpToPage);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
                onJumpToPageChange("");
              }
            }
          }}
          placeholder={currentPage.toString()}
          className="w-20 h-8 bg-background"
        />
        <span className="text-sm text-muted-foreground">of {totalPages.toLocaleString()}</span>
      </div>
    </div>
  );
}

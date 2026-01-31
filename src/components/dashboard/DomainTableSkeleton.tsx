import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DomainTableSkeletonProps {
  rows?: number;
}

export function DomainTableSkeleton({ rows = 10 }: DomainTableSkeletonProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-8" />
            <TableHead className="font-semibold">Domain</TableHead>
            <TableHead className="font-semibold text-right">Price</TableHead>
            <TableHead className="font-semibold text-right">Bids</TableHead>
            <TableHead className="font-semibold text-right hidden md:table-cell">Valuation</TableHead>
            <TableHead className="font-semibold text-right hidden lg:table-cell">Age</TableHead>
            <TableHead className="font-semibold text-right hidden lg:table-cell">Length</TableHead>
            <TableHead className="font-semibold text-right hidden xl:table-cell">Traffic</TableHead>
            <TableHead className="font-semibold text-right">Time</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i} className="group">
              <TableCell className="py-2">
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell className="py-2">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </TableCell>
              <TableCell className="py-2 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right hidden md:table-cell">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right hidden xl:table-cell">
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableCell>
              <TableCell className="py-2 text-right">
                <Skeleton className="h-4 w-14 ml-auto" />
              </TableCell>
              <TableCell className="py-2">
                <Skeleton className="h-4 w-4" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

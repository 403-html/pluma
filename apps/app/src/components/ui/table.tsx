import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Table - outer wrapper + table element
const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="overflow-auto rounded-md border border-border mt-4 flex-1 min-h-0">
      <table ref={ref} className={cn("w-full text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  )
)
Table.displayName = "Table"

// TableHeader - thead element
const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("sticky top-0 z-10 bg-background", className)} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

// TableBody - tbody element
const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn(className)} {...props} />
  )
)
TableBody.displayName = "TableBody"

// TableRow - tr with standard hover styles
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("transition-colors hover:bg-muted/40 border-b border-border/20 last:border-b-0", className)} {...props} />
  )
)
TableRow.displayName = "TableRow"

// TableHead - th with standard header styles (use this inside thead > tr)
const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)} {...props} />
  )
)
TableHead.displayName = "TableHead"

// TableCell - td with standard cell styles
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
  )
)
TableCell.displayName = "TableCell"

// TableHeadRow - special tr for thead (bg-muted/40 + bottom border)
const TableHeadRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-border bg-muted/40", className)} {...props} />
  )
)
TableHeadRow.displayName = "TableHeadRow"

// TablePagination - optional pagination controls
interface TablePaginationProps {
  currentPage: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  pageInfoTemplate: string; // e.g. "Page {page}"
  className?: string;
}

function TablePagination({ currentPage, hasPrev, hasNext, onPrev, onNext, prevLabel, nextLabel, pageInfoTemplate, className }: TablePaginationProps) {
  const pageLabel = pageInfoTemplate.includes('{page}')
    ? pageInfoTemplate.replace('{page}', String(currentPage))
    : String(currentPage);
  return (
    <div className={cn("flex items-center gap-3 mt-4", className)}>
      <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
        {prevLabel}
      </Button>
      <span className="text-sm text-muted-foreground">
        {pageLabel}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
        {nextLabel}
      </Button>
    </div>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination }

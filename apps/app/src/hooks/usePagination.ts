import { useState, useEffect } from 'react';

/**
 * Client-side pagination with smart page clamping.
 *
 * When the total item count changes, the current page is clamped to the new
 * maximum rather than unconditionally reset to 1. This preserves the user's
 * position when the page they are on still exists after the data changes.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const totalPages = Math.ceil(items.length / pageSize);
    setCurrentPage((prevPage) => {
      const maxPage = Math.max(1, totalPages);
      if (prevPage > maxPage) {
        return maxPage;
      }
      return prevPage;
    });
  }, [items.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return {
    currentPage,
    paginatedItems,
    hasPrev,
    hasNext,
    goToPrev: () => setCurrentPage((p) => Math.max(1, p - 1)),
    goToNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
  };
}

import React from "react";
import { Icons } from "./Icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showFirstLast?: boolean;
  showJumpToPage?: boolean;
  maxPageButtons?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showFirstLast = true,
  showJumpToPage = true,
  maxPageButtons = 7,
}) => {
  const [jumpToPageInput, setJumpToPageInput] = React.useState("");

  // Calculate page numbers to display
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];
    const halfMaxButtons = Math.floor((maxPageButtons - 3) / 2);

    // Always show first page
    pages.push(1);

    let startPage = Math.max(2, currentPage - halfMaxButtons);
    let endPage = Math.min(totalPages - 1, currentPage + halfMaxButtons);

    // Adjust if we're near the start
    if (currentPage <= halfMaxButtons + 2) {
      endPage = Math.min(totalPages - 1, maxPageButtons - 2);
    }

    // Adjust if we're near the end
    if (currentPage >= totalPages - halfMaxButtons - 1) {
      startPage = Math.max(2, totalPages - maxPageButtons + 3);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("ellipsis");
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPageInput("");
    }
  };

  const handleJumpToPageKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleJumpToPage();
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Left side - Items info and page size selector */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        {totalItems !== undefined && (
          <span>
            Showing {startItem}-{endItem} of {totalItems} items
          </span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="input-sm !w-auto !py-1"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        )}
      </div>

      {/* Center - Page navigation */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="First page"
          >
            <Icons.ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Previous page"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  currentPage === page
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Next page"
        >
          <Icons.ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Last page"
          >
            <Icons.ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right side - Jump to page */}
      {showJumpToPage && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpToPageInput}
            onChange={(e) => setJumpToPageInput(e.target.value)}
            onKeyDown={handleJumpToPageKeyDown}
            placeholder="Page"
            className="input-sm !w-16 !py-1"
          />
          <button
            onClick={handleJumpToPage}
            disabled={!jumpToPageInput}
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;

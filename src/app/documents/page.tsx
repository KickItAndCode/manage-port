"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useDebounce } from "@/utils/clientSideFilters";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { DOCUMENT_TYPES } from "@/../convex/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Search,
  Tag,
  Download,
  Trash2,
  Edit,
  AlertCircle,
  Folder,
  Clock,
  X,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocumentForm } from "@/components/DocumentForm";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TagAutocomplete } from "@/components/TagAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Document type icons
// const typeIcons: Record<string, any> = {
//   lease: FileText,
//   utility: FileText,
//   property: Home,
//   insurance: Shield,
//   tax: Receipt,
//   maintenance: Wrench,
//   other: FileText,
// };

// Import icons that might be missing
// import { Home, Shield, Receipt, Wrench } from "lucide-react";

// Comprehensive documents page loading skeleton
const DocumentsLoadingSkeleton = () => (
  <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    {/* Header skeleton */}
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    {/* Stats Cards skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Expiring Documents Alert skeleton */}
    <Card className="mb-6 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Filters skeleton */}
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search skeleton */}
          <div className="flex-1">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Filters Row skeleton */}
          <div className="flex flex-col sm:flex-row gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 flex-1" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Documents Table skeleton */}
    <Card>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Table header skeleton */}
          <div className="border-b p-2 sm:p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-5" />
              <div className="flex-1 grid grid-cols-6 gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>

          {/* Table rows skeleton */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b p-2 sm:p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-5" />
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  </div>
);

// Signed-out state skeleton with overlay
const SignedOutSkeleton = () => (
  <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    {/* Header skeleton */}
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    {/* Stats Cards skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Main content with authentication overlay */}
    <div className="relative">
      {/* Authentication overlay */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="text-center space-y-3 p-6">
          <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Skeleton className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-56 mx-auto" />
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
          <Skeleton className="h-10 w-32 mx-auto" />
        </div>
      </div>

      {/* Background content (dimmed) */}
      <div className="opacity-30 space-y-6">
        {/* Filters skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <div className="flex flex-col sm:flex-row gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 flex-1" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table skeleton */}
        <Card>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="border-b p-2 sm:p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 grid grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-16" />
                    ))}
                  </div>
                </div>
              </div>

              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b p-2 sm:p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-5 w-5" />
                    <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
);

export default function DocumentsPage() {
  const { user } = useUser();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const wasFocusedRef = useRef(false);
  // Initialize search from sessionStorage if available (for page refresh recovery)
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("documents-search") || "";
    }
    return "";
  });
  const [typeFilter, setTypeFilter] = useState("");
  // categoryFilter removed - using type-based classification
  const [propertyFilter, setPropertyFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Pagination state - must be declared before useQuery
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Debounce search input to prevent excessive queries - longer delay
  const debouncedSearch = useDebounce(search, 600);

  // Persist search value to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (search) {
        sessionStorage.setItem("documents-search", search);
      } else {
        sessionStorage.removeItem("documents-search");
      }
    }
  }, [search]);

  // Stable handler for search input - prevent any side effects
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Mark that user is typing to prevent any interference
      isTypingRef.current = true;
      wasFocusedRef.current = true;
      // Immediately update local state without triggering queries
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;
      setSearch(newValue);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          const newPosition = Math.min(cursorPosition, newValue.length);
          searchInputRef.current.setSelectionRange(newPosition, newPosition);
        }
      });

      // Keep typing flag active longer to prevent focus loss
      setTimeout(() => {
        isTypingRef.current = false;
      }, 1000);
    },
    []
  );

  // Memoize query args to prevent unnecessary re-renders
  // Always use getDocuments - it supports search parameter
  // Only update query when debounced value changes, not on every keystroke
  const queryArgs = useMemo(() => {
    if (!user) return "skip";

    return {
      userId: user.id,
      search:
        debouncedSearch && debouncedSearch.trim()
          ? debouncedSearch.trim()
          : undefined,
      type: typeFilter || undefined,
      // category removed - using type-based classification
      propertyId: propertyFilter ? (propertyFilter as any) : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    };
  }, [
    debouncedSearch,
    typeFilter,
    propertyFilter,
    selectedTags,
    user?.id,
    itemsPerPage,
    currentPage,
  ]);

  // Always use getDocuments - it supports search parameter
  const documentsResult = useQuery(api.documents.getDocuments, queryArgs);

  // Extract documents and pagination info
  // getDocuments always returns paginated result { documents, total, hasMore }
  const documents =
    documentsResult && "documents" in documentsResult
      ? documentsResult.documents
      : undefined;
  const totalDocuments =
    documentsResult && "total" in documentsResult ? documentsResult.total : 0;
  const hasMore =
    documentsResult && "hasMore" in documentsResult
      ? documentsResult.hasMore
      : false;
  const totalPages = Math.ceil(totalDocuments / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, propertyFilter, selectedTags]);

  // Restore focus to search input after re-renders if user was typing
  useEffect(() => {
    if (
      searchInputRef.current &&
      (isTypingRef.current || wasFocusedRef.current)
    ) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (searchInputRef.current) {
          // Only restore focus if input is not already focused and user was typing
          if (
            document.activeElement !== searchInputRef.current &&
            isTypingRef.current
          ) {
            searchInputRef.current.focus();
            // Restore cursor position to end
            const length = search.length;
            searchInputRef.current.setSelectionRange(length, length);
          }
        }
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [search, documentsResult]);

  // Track focus events
  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    const handleFocus = () => {
      wasFocusedRef.current = true;
    };

    const handleBlur = () => {
      // Only clear flag if user explicitly blurred (not due to re-render)
      if (!isTypingRef.current) {
        wasFocusedRef.current = false;
      }
    };

    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);

    return () => {
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("blur", handleBlur);
    };
  }, []);

  const propertiesResult = useQuery(
    api.properties.getProperties,
    user ? { userId: user.id, limit: 1000 } : "skip" // Get all properties for dropdown
  );
  // Extract properties array from paginated result
  const properties =
    propertiesResult?.properties ||
    (Array.isArray(propertiesResult) ? propertiesResult : []);

  const expiringDocs = useQuery(
    api.documents.getExpiringDocuments,
    user ? { userId: user.id, daysAhead: 30 } : "skip"
  );

  const docStats = useQuery(
    api.documents.getDocumentStats,
    user ? { userId: user.id } : "skip"
  );

  // Mutations
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const bulkDeleteDocuments = useMutation(api.documents.bulkDeleteDocuments);
  const bulkUpdateTags = useMutation(api.documents.bulkUpdateTags);

  // Bulk tag editing state
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState<string[]>([]);
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState<string[]>([]);

  // Selection functions
  const toggleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const selectAllDocuments = () => {
    if (!documents) return;
    const allDocIds = new Set<string>(documents.map((doc: any) => doc._id));
    setSelectedDocuments(allDocIds);
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const handleBulkDelete = async () => {
    if (!user || selectedDocuments.size === 0) return;

    const selectedCount = selectedDocuments.size;
    confirm({
      title: "Delete Documents",
      description: `Delete ${selectedCount} document${selectedCount !== 1 ? "s" : ""}? This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          const result = await bulkDeleteDocuments({
            documentIds: Array.from(selectedDocuments) as any,
            userId: user.id,
          });

          toast.success(
            `Successfully deleted ${result.success} document${result.success !== 1 ? "s" : ""}`,
            {
              description:
                result.failed > 0
                  ? `${result.failed} document${result.failed !== 1 ? "s" : ""} could not be deleted`
                  : undefined,
            }
          );

          clearSelection();
        } catch (err: any) {
          console.error("Bulk delete error:", err);
          toast.error(formatErrorForToast(err));
        }
      },
    });
  };

  const handleBulkTagUpdate = async () => {
    if (!user || selectedDocuments.size === 0) return;

    if (bulkTagsToAdd.length === 0 && bulkTagsToRemove.length === 0) {
      toast.error("Please add or remove at least one tag");
      return;
    }

    try {
      const result = await bulkUpdateTags({
        documentIds: Array.from(selectedDocuments) as any,
        userId: user.id,
        tagsToAdd: bulkTagsToAdd.length > 0 ? bulkTagsToAdd : undefined,
        tagsToRemove:
          bulkTagsToRemove.length > 0 ? bulkTagsToRemove : undefined,
      });

      toast.success(
        `Successfully updated tags for ${result.success} document${result.success !== 1 ? "s" : ""}`,
        {
          description:
            result.failed > 0
              ? `${result.failed} document${result.failed !== 1 ? "s" : ""} could not be updated`
              : undefined,
        }
      );

      setBulkTagDialogOpen(false);
      setBulkTagsToAdd([]);
      setBulkTagsToRemove([]);
      clearSelection();
    } catch (err: any) {
      console.error("Bulk tag update error:", err);
      toast.error(formatErrorForToast(err));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!user) {
    return <SignedOutSkeleton />;
  }

  if (documents === undefined) {
    return <DocumentsLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Document Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Store and organize all your property-related documents
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Documents
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {docStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Documents
                  </p>
                  <p className="text-2xl font-bold">
                    {docStats.totalDocuments}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">
                    {formatFileSize(docStats.totalSize)}
                  </p>
                </div>
                <Folder className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">
                    {docStats.expiringThisMonth}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(docStats.byCategory).length}
                  </p>
                </div>
                <Tag className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expiring Documents Alert */}
      {expiringDocs && expiringDocs.length > 0 && (
        <Card className="mb-6 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Documents Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringDocs.slice(0, 3).map((doc: any) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{doc.name}</span>
                  <Badge variant="outline" className="text-orange-600">
                    Expires {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                  </Badge>
                </div>
              ))}
              {expiringDocs.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{expiringDocs.length - 3} more documents
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search documents..."
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    // Prevent any form submission or navigation
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      return false;
                    }
                  }}
                  className="pl-10"
                  type="text"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type Filter */}
              <select
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>

              {/* Category filter removed - using type-based classification */}

              {/* Property Filter */}
              {properties && (
                <select
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                >
                  <option value="">All Properties</option>
                  {properties.map((property: any) => (
                    <option key={property._id} value={property._id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedTags((tags) => tags.filter((t) => t !== tag))
                    }
                  />
                </Badge>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTags([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Actions Toolbar */}
      {selectedDocuments.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
          <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {selectedDocuments.size} document
                    {selectedDocuments.size !== 1 ? "s" : ""} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllDocuments}
                    disabled={
                      documents &&
                      selectedDocuments.size === (documents?.length || 0) &&
                      documents.length > 0
                    }
                  >
                    Select All ({documents?.length || 0})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkTagDialogOpen(true)}
                    className="gap-2"
                  >
                    <Tag className="h-4 w-4" />
                    Edit Tags
                  </Button>

                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear Selection
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Tag Edit Dialog */}
      <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Edit Tags for {selectedDocuments.size} Document
              {selectedDocuments.size !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              Add or remove tags from the selected documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Tags</label>
              <TagAutocomplete
                value={bulkTagsToAdd}
                onChange={setBulkTagsToAdd}
                placeholder="Add tags to selected documents..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remove Tags</label>
              <TagAutocomplete
                value={bulkTagsToRemove}
                onChange={setBulkTagsToRemove}
                placeholder="Remove tags from selected documents..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkTagDialogOpen(false);
                  setBulkTagsToAdd([]);
                  setBulkTagsToRemove([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkTagUpdate}
                disabled={
                  bulkTagsToAdd.length === 0 && bulkTagsToRemove.length === 0
                }
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents List */}
      {!documents || documents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={
                debouncedSearch || typeFilter
                  ? "Try adjusting your filters"
                  : "Upload your first document to get started"
              }
              action={
                !debouncedSearch && !typeFilter
                  ? {
                      label: "Upload Document",
                      onClick: () => setUploadDialogOpen(true),
                      icon: Upload,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sm:p-4 w-12">
                    <div className="w-5 h-5 rounded border-2 border-input bg-background flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={
                          documents &&
                          selectedDocuments.size === (documents?.length || 0) &&
                          documents.length > 0
                        }
                        onChange={() => {
                          if (selectedDocuments.size === documents?.length) {
                            clearSelection();
                          } else {
                            selectAllDocuments();
                          }
                        }}
                        className="w-3 h-3 rounded-sm border-0 bg-transparent"
                      />
                    </div>
                  </th>
                  <th className="text-left p-2 sm:p-4">Name</th>
                  <th className="text-left p-2 sm:p-4">Type</th>
                  <th className="text-left p-2 sm:p-4">Property</th>
                  <th className="text-left p-2 sm:p-4">Size</th>
                  <th className="text-left p-2 sm:p-4">Uploaded</th>
                  <th className="text-center p-2 sm:p-4 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc: any) => {
                  const property = properties?.find(
                    (p: any) => p._id === doc.propertyId
                  );
                  const isSelected = selectedDocuments.has(doc._id);

                  return (
                    <tr
                      key={doc._id}
                      className={cn(
                        "border-b hover:bg-muted/30 transition-colors",
                        isSelected && "bg-muted/20 border-l-4 border-l-primary"
                      )}
                    >
                      <td className="p-2 sm:p-4">
                        <div className="w-5 h-5 rounded border-2 border-input bg-background flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectDocument(doc._id);
                            }}
                            className="w-3 h-3 rounded-sm border-0 bg-transparent"
                          />
                        </div>
                      </td>
                      <td
                        className="p-2 sm:p-4 cursor-pointer"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium hover:text-primary transition-colors">
                              {doc.name}
                            </p>
                            {doc.notes && (
                              <p className="text-sm text-muted-foreground">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <Badge variant="outline">{doc.type}</Badge>
                      </td>
                      <td className="p-2 sm:p-4">{property?.name || "-"}</td>
                      <td className="p-2 sm:p-4 text-sm text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="p-2 sm:p-4 text-sm text-muted-foreground">
                        {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-2 sm:p-4">
                        <div
                          className="flex justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DocumentViewer
                                storageId={doc.storageId || doc.url}
                                fileName={doc.name}
                                mimeType={doc.mimeType}
                                actionType="download"
                              >
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DocumentViewer>
                              <DropdownMenuItem
                                onClick={() => setEditingDoc(doc)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  confirm({
                                    title: "Delete Document",
                                    description: `Delete "${doc.name}"? This action cannot be undone.`,
                                    variant: "destructive",
                                    onConfirm: async () => {
                                      try {
                                        await deleteDocument({
                                          id: doc._id,
                                          userId: user.id,
                                        });
                                      } catch (err: any) {
                                        console.error(
                                          "Delete document error:",
                                          err
                                        );
                                        toast.error(formatErrorForToast(err));
                                      }
                                    },
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!debouncedSearch && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t p-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalDocuments)} of{" "}
                {totalDocuments} documents
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[2.5rem]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || !hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Upload Dialog */}
      <DocumentUploadForm
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={() => {
          // Documents will be automatically refreshed via Convex reactivity
        }}
      />

      {/* Edit Document Dialog */}
      <DocumentForm
        document={editingDoc}
        open={!!editingDoc}
        onOpenChange={(open) => !open && setEditingDoc(null)}
        onSave={() => {
          // Document will be automatically refreshed via Convex reactivity
        }}
      />

      {/* Document Preview Dialog */}
      {previewDoc && (
        <DocumentPreview
          storageId={previewDoc.storageId || previewDoc.url}
          fileName={previewDoc.name}
          mimeType={previewDoc.mimeType}
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}

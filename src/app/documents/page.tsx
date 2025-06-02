"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES, DOCUMENT_CATEGORIES } from "@/../convex/documents";
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
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DocumentViewer } from "@/components/DocumentViewer";
import { DocumentForm } from "@/components/DocumentForm";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

// Document type icons
const typeIcons: Record<string, any> = {
  lease: FileText,
  utility: FileText,
  property: Home,
  insurance: Shield,
  tax: Receipt,
  maintenance: Wrench,
  other: FileText,
};

// Import icons that might be missing
import { Home, Shield, Receipt, Wrench } from "lucide-react";

export default function DocumentsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Queries
  const documents = useQuery(api.documents.getDocuments, 
    user ? {
      userId: user.id,
      search: search || undefined,
      type: typeFilter || undefined,
      category: categoryFilter || undefined,
      propertyId: propertyFilter || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    } : "skip"
  );
  
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const expiringDocs = useQuery(api.documents.getExpiringDocuments,
    user ? { userId: user.id, daysAhead: 30 } : "skip"
  );
  
  const docStats = useQuery(api.documents.getDocumentStats,
    user ? { userId: user.id } : "skip"
  );

  // Mutations
  const deleteDocument = useMutation(api.documents.deleteDocument);



  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to manage your documents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Document Management</h1>
            <p className="text-muted-foreground mt-1">
              Store and organize all your property-related documents
            </p>
          </div>
          <Button 
            onClick={() => setUploadDialogOpen(true)}
            className="gap-2"
          >
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
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{docStats.totalDocuments}</p>
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
                  <p className="text-2xl font-bold">{formatFileSize(docStats.totalSize)}</p>
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
                  <p className="text-2xl font-bold">{docStats.expiringThisMonth}</p>
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
                  <p className="text-2xl font-bold">{Object.keys(docStats.byCategory).length}</p>
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
                <div key={doc._id} className="flex items-center justify-between">
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
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
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

              {/* Category Filter */}
              <select
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>

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

            {/* View Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className="px-2"
              >
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className="px-2"
              >
                List
              </Button>
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedTags(tags => tags.filter(t => t !== tag))}
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

      {/* Documents Grid/List */}
      {documents === undefined ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {search || typeFilter || categoryFilter ? 
                  "Try adjusting your filters" : 
                  "Upload your first document to get started"
                }
              </p>
              <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc: any) => {
            const Icon = typeIcons[doc.type] || FileText;
            const property = properties?.find((p: any) => p._id === doc.propertyId);
            
            return (
              <Card key={doc._id} className="group hover:shadow-lg transition-shadow h-full flex flex-col">
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "p-3 rounded-lg",
                      doc.type === "lease" && "bg-blue-100 dark:bg-blue-900/20",
                      doc.type === "insurance" && "bg-green-100 dark:bg-green-900/20",
                      doc.type === "tax" && "bg-purple-100 dark:bg-purple-900/20",
                      doc.type === "maintenance" && "bg-orange-100 dark:bg-orange-900/20",
                      (!doc.type || doc.type === "other") && "bg-gray-100 dark:bg-gray-900/20"
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDoc(doc)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-medium mb-1 truncate">{doc.name}</h3>
                  
                  {property && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {property.name}
                    </p>
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                    
                    {doc.category && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Category</span>
                        <Badge variant="secondary" className="text-xs">
                          {doc.category}
                        </Badge>
                      </div>
                    )}
                    
                    {doc.expiryDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="text-xs">
                          {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span className="text-xs">{doc.fileSize ? formatFileSize(doc.fileSize) : "N/A"}</span>
                    </div>
                  </div>
                  
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {doc.tags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-auto pt-4">
                    <DocumentViewer
                      storageId={doc.url}
                      fileName={doc.name}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => {
                        confirm({
                          title: "Delete Document",
                          description: `Delete "${doc.name}"? This action cannot be undone.`,
                          variant: "destructive",
                          onConfirm: async () => {
                            try {
                              await deleteDocument({ id: doc._id, userId: user.id });
                            } catch (err: any) {
                              console.error("Delete document error:", err);
                              const errorMessage = err.data?.message || err.message || "Unknown error";
                              alert("Failed to delete document: " + errorMessage);
                            }
                          }
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // List View
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 sm:p-4">Name</th>
                  <th className="text-left p-2 sm:p-4">Type</th>
                  <th className="text-left p-2 sm:p-4">Property</th>
                  <th className="text-left p-2 sm:p-4">Size</th>
                  <th className="text-left p-2 sm:p-4">Uploaded</th>
                  <th className="text-left p-2 sm:p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc: any) => {
                  const property = properties?.find((p: any) => p._id === doc.propertyId);
                  
                  return (
                    <tr key={doc._id} className="border-b hover:bg-muted/50">
                      <td className="p-2 sm:p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            {doc.notes && (
                              <p className="text-sm text-muted-foreground">{doc.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <Badge variant="outline">{doc.type}</Badge>
                      </td>
                      <td className="p-2 sm:p-4">
                        {property?.name || "-"}
                      </td>
                      <td className="p-2 sm:p-4 text-sm text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="p-2 sm:p-4 text-sm text-muted-foreground">
                        {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="flex gap-2">
                          <DocumentViewer
                            storageId={doc.url}
                            fileName={doc.name}
                          >
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DocumentViewer>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDoc(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => {
                              confirm({
                                title: "Delete Document",
                                description: `Delete "${doc.name}"? This action cannot be undone.`,
                                variant: "destructive",
                                onConfirm: async () => {
                                  try {
                                    await deleteDocument({ id: doc._id, userId: user.id });
                                  } catch (err: any) {
                                    console.error("Delete document error:", err);
                                    const errorMessage = err.data?.message || err.message || "Unknown error";
                                    alert("Failed to delete document: " + errorMessage);
                                  }
                                }
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      {confirmDialog}
    </div>
  );
}
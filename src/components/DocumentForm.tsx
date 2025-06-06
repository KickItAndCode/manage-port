"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES } from "@/../convex/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DocumentFileReplace } from "@/components/DocumentFileReplace";
import { 
  Tag,
  Save,
  X
} from "lucide-react";

interface DocumentFormProps {
  document?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function DocumentForm({ document, open, onOpenChange, onSave }: DocumentFormProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    name: "",
    type: DOCUMENT_TYPES.OTHER,
    category: "",
    propertyId: "",
    leaseId: "",
    expiryDate: "",
    tags: [] as string[],
    notes: "",
  });
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const leases = useQuery(api.leases.getLeases, 
    user ? { userId: user.id } : "skip"
  );

  // Mutations
  const updateDocument = useMutation(api.documents.updateDocument);

  // Initialize form with document data
  useEffect(() => {
    if (document) {
      setFormData({
        name: document.name || "",
        type: document.type || DOCUMENT_TYPES.OTHER,
        category: document.category || "",
        propertyId: document.propertyId || "",
        leaseId: document.leaseId || "",
        expiryDate: document.expiryDate ? new Date(document.expiryDate).toISOString().split('T')[0] : "",
        tags: document.tags || [],
        notes: document.notes || "",
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !document) return;

    setIsSubmitting(true);
    try {
      const updateData: any = {
        id: document._id,
        userId: user.id,
        name: formData.name,
        type: formData.type,
        category: formData.category || undefined,
        propertyId: formData.propertyId || undefined,
        leaseId: formData.leaseId || undefined,
        expiryDate: formData.expiryDate || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        notes: formData.notes || undefined,
      };

      await updateDocument(updateData);
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter document name"
              required
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category removed - using type-based classification */}
          </div>

          {/* Property and Lease */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <select
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
                value={formData.propertyId}
                onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
              >
                <option value="">Select property</option>
                {properties?.map((property: any) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lease</label>
              <select
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
                value={formData.leaseId}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseId: e.target.value }))}
              >
                <option value="">Select lease</option>
                {leases?.map((lease: any) => (
                  <option key={lease._id} value={lease._id}>
                    {lease.tenantName} - {properties?.find((p: any) => p._id === lease.propertyId)?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* File Replacement */}
          {document && (
            <DocumentFileReplace
              currentFileName={document.name}
              documentId={document._id}
              onFileReplaced={() => {
                // File replacement is handled internally by the component
                // The document will be automatically updated via the mutation
              }}
              onReplaceError={(error) => {
                console.error("File replacement error:", error);
              }}
            />
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
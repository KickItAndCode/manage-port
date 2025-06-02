"use client";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Maximize2,
  Star,
  Edit,
  Trash2,
  Download,
  MoreHorizontal,
  X,
  Save,
  ImageIcon,
  Loader2,
  Check
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PropertyImage } from "@/components/PropertyImage";
import { format } from "date-fns";

interface PropertyImageGalleryProps {
  propertyId: string;
  className?: string;
}

interface ImageData {
  _id: string;
  storageId: string;
  name: string;
  fileSize: number;
  mimeType: string;
  isCover: boolean;
  description?: string;
  order?: number;
  uploadedAt: string;
}

export function PropertyImageGallery({ propertyId, className }: PropertyImageGalleryProps) {
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageData | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  
  const carouselRef = useRef<HTMLDivElement>(null);

  // Queries
  const images = useQuery(api.propertyImages.getPropertyImages, 
    user ? { propertyId: propertyId as any, userId: user.id } : "skip"
  );

  // Mutations
  const setCoverImage = useMutation(api.propertyImages.setCoverImage);
  const updatePropertyImage = useMutation(api.propertyImages.updatePropertyImage);
  const deletePropertyImage = useMutation(api.propertyImages.deletePropertyImage);

  const handleSetCoverImage = async (imageId: string) => {
    if (!user) return;
    try {
      await setCoverImage({ userId: user.id, imageId: imageId as any });
    } catch (error) {
      console.error("Error setting cover image:", error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    alert("DELETE FUNCTION CALLED - Image ID: " + imageId);
    
    if (!user) {
      alert("No user found");
      return;
    }
    
    // Debug: Find and log the full image object
    const imageObj = images?.find(img => img._id === imageId);
    alert("User ID: " + user.id + "\nImage User ID: " + imageObj?.userId);
    
    if (confirm("Delete this image? This action cannot be undone.")) {
      try {
        console.log("Attempting to delete image:", imageId, "for user:", user.id);
        console.log("Image object details:", {
          id: imageObj?._id,
          userId: imageObj?.userId,
          propertyId: imageObj?.propertyId,
          storageId: imageObj?.storageId
        });
        
        const result = await deletePropertyImage({ userId: user.id, imageId: imageId as any });
        console.log("Delete mutation completed successfully:", result);
        
        // Clear from selection
        setSelectedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
        
        // If we're in carousel mode and deleted the current image, adjust index
        if (viewMode === "carousel" && images && selectedImageIndex >= images.length - 1) {
          setSelectedImageIndex(Math.max(0, images.length - 2));
        }
        
        console.log("Image should be deleted, current images count:", images?.length);
        
      } catch (error) {
        console.error("Error deleting image - full error object:", error);
        console.error("Error message:", (error as any)?.message);
        console.error("Error data:", (error as any)?.data);
        alert("Failed to delete image: " + ((error as any)?.message || (error as any)?.data?.message || "Unknown error"));
      }
    }
  };

  const handleUpdateImage = async (imageData: { name: string; description: string }) => {
    if (!user || !editingImage) return;
    
    try {
      await updatePropertyImage({
        userId: user.id,
        imageId: editingImage._id as any,
        name: imageData.name,
        description: imageData.description,
      });
      setEditingImage(null);
    } catch (error) {
      console.error("Error updating image:", error);
    }
  };

  // Helper function to get image URL from storage ID
  const getImageUrl = (storageId: string) => {
    // For now, just return the storage ID - this should be replaced with proper Convex storage URL resolution
    return `/api/storage/${storageId}`;
  };

  const handleBulkDownload = async () => {
    if (!images || selectedImages.size === 0) return;
    
    setIsDownloading(true);
    try {
      // Create a zip file with selected images
      const selectedImageData = images.filter(img => selectedImages.has(img._id));
      
      // This is a simplified implementation - in a real app you'd want to:
      // 1. Create a backend endpoint that zips the files
      // 2. Stream the zip file to the client
      // 3. Handle large files properly
      
      for (const image of selectedImageData) {
        const imageUrl = getImageUrl(image.storageId);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = image.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSelectedImages(new Set());
    } catch (error) {
      console.error("Error downloading images:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    if (!images) return;
    setSelectedImages(new Set(images.map(img => img._id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  const navigateCarousel = (direction: 'prev' | 'next') => {
    if (!images) return;
    
    setSelectedImageIndex(prev => {
      const newIndex = direction === 'prev' 
        ? (prev === 0 ? images.length - 1 : prev - 1)
        : (prev === images.length - 1 ? 0 : prev + 1);
      
      // Auto-scroll thumbnail strip in carousel view
      if (viewMode === 'carousel' && carouselRef.current) {
        const thumbnailWidth = 92; // 80px + 12px gap (3*4 for padding/margin/ring space)
        const containerWidth = carouselRef.current.clientWidth;
        const scrollPosition = newIndex * thumbnailWidth - containerWidth / 2 + thumbnailWidth / 2;
        carouselRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
      
      return newIndex;
    });
  };

  // Enhanced keyboard navigation for both carousel and fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle fullscreen navigation
      if (fullscreenOpen) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateCarousel('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateCarousel('next');
        } else if (e.key === 'Escape') {
          setFullscreenOpen(false);
        }
        return;
      }
      
      // Handle carousel view navigation when component is focused
      if (viewMode === 'carousel' && images && images.length > 0) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateCarousel('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateCarousel('next');
        } else if (e.key === ' ') {
          e.preventDefault();
          toggleImageSelection(images[selectedImageIndex]._id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenOpen, viewMode, images, selectedImageIndex]);

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sign in to view images
      </div>
    );
  }

  if (images === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No images uploaded</h3>
        <p className="text-muted-foreground">
          Upload some images to create a gallery for this property
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">View:</span>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === "carousel" ? "default" : "ghost"}
              onClick={() => setViewMode("carousel")}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Carousel
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedImages.size > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium text-primary">
                  {selectedImages.size} selected
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownload}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearSelection}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={selectAllImages}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Select All
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {images.map((image, index) => (
            <Card key={image._id} className="group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <PropertyImage
                    storageId={image.storageId}
                    alt={image.name}
                    className="w-full h-52 sm:h-48 md:h-52 object-cover cursor-pointer"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setFullscreenOpen(true);
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3">
                      <Checkbox
                        checked={selectedImages.has(image._id)}
                        onCheckedChange={(checked) => toggleImageSelection(image._id)}
                        className="bg-white/90 border-2 border-white shadow-lg backdrop-blur-sm"
                      />
                    </div>
                    
                    {/* Cover Badge */}
                    {image.isCover && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-lg">
                          <Star className="h-3 w-3 fill-current" />
                          Cover
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setFullscreenOpen(true);
                          }}
                          className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md p-2"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => setEditingImage(image)}
                          className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm"
                            className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md p-2"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="backdrop-blur-sm">
                          {!image.isCover && (
                            <DropdownMenuItem onClick={() => handleSetCoverImage(image._id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Cover
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              alert("DROPDOWN DELETE CLICKED - Image ID: " + image._id);
                              handleDeleteImage(image._id);
                            }}
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{image.name}</p>
                  {image.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {image.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Enhanced Carousel View */
        <div className="space-y-4">
          {/* Main Carousel Display */}
          <div className="relative">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative group">
                  <PropertyImage
                    storageId={images[selectedImageIndex].storageId}
                    alt={images[selectedImageIndex].name}
                    className="w-full h-96 object-cover"
                  />
                  
                  {/* Selection Overlay for Active Image */}
                  <div className={cn(
                    "absolute inset-0 border-4 transition-all duration-300",
                    selectedImages.has(images[selectedImageIndex]._id) 
                      ? "border-primary bg-primary/20" 
                      : "border-transparent"
                  )} />
                  
                  {/* Main Image Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4">
                      <Checkbox
                        checked={selectedImages.has(images[selectedImageIndex]._id)}
                        onCheckedChange={(checked) => toggleImageSelection(images[selectedImageIndex]._id)}
                        className="bg-white/90 border-2 border-white shadow-lg backdrop-blur-sm scale-125"
                      />
                    </div>
                    
                    {/* Cover Badge */}
                    {images[selectedImageIndex].isCover && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg">
                          <Star className="h-4 w-4 fill-current" />
                          Cover Image
                        </div>
                      </div>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                        {selectedImageIndex + 1} of {images.length}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button 
                          size="sm" 
                          onClick={() => setFullscreenOpen(true)}
                          className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md"
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Fullscreen
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => setEditingImage(images[selectedImageIndex])}
                          className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm"
                            className="shadow-xl bg-background/90 hover:bg-background text-foreground border border-border/50 backdrop-blur-md"
                          >
                            <MoreHorizontal className="h-4 w-4 mr-2" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="backdrop-blur-sm">
                          {!images[selectedImageIndex].isCover && (
                            <DropdownMenuItem onClick={() => handleSetCoverImage(images[selectedImageIndex]._id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Cover
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              alert("CAROUSEL DELETE CLICKED - Image ID: " + images[selectedImageIndex]._id);
                              handleDeleteImage(images[selectedImageIndex]._id);
                            }}
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  <Button
                    size="lg"
                    variant="outline"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border-border text-foreground shadow-xl backdrop-blur-sm"
                    onClick={() => navigateCarousel('prev')}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border-border text-foreground shadow-xl backdrop-blur-sm"
                    onClick={() => navigateCarousel('next')}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
                
                {/* Image Info */}
                <div className="p-4 border-t bg-muted/30">
                  <h3 className="font-semibold text-lg">{images[selectedImageIndex].name}</h3>
                  {images[selectedImageIndex].description && (
                    <p className="text-muted-foreground mt-1">
                      {images[selectedImageIndex].description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>
                      {format(new Date(images[selectedImageIndex].uploadedAt), "MMM d, yyyy")}
                    </span>
                    <span>
                      {(images[selectedImageIndex].fileSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Thumbnail Strip */}
          <div className="relative">
            <div 
              ref={carouselRef}
              className="flex overflow-x-auto scroll-smooth gap-3 pb-4 pt-2 px-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {images.map((image, index) => (
                <div
                  key={image._id}
                  className={cn(
                    "relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-4 transition-all duration-200 m-1",
                    // Priority: Selected (teal) > Active (white) > Hover > Default
                    selectedImages.has(image._id) 
                      ? "border-primary shadow-lg ring-4 ring-primary ring-offset-2" 
                      : index === selectedImageIndex 
                        ? "border-primary shadow-lg scale-110" 
                        : "border-border hover:border-muted-foreground hover:shadow-md"
                  )}
                  style={{ scrollSnapAlign: 'start' }}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <PropertyImage
                    storageId={image.storageId}
                    alt={image.name}
                    className="w-20 h-20 object-cover"
                  />
                  
                  {/* Selection indicator on thumbnail */}
                  {selectedImages.has(image._id) && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                  
                  {/* Cover indicator */}
                  {image.isCover && (
                    <div className="absolute top-1 right-1">
                      <Star className="h-3 w-3 text-primary fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {images && images[selectedImageIndex] && (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-white dark:bg-gray-900">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Viewer</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <PropertyImage
                storageId={images[selectedImageIndex].storageId}
                alt={images[selectedImageIndex].name}
                className="w-full max-h-[90vh] object-contain"
              />
              
              {/* Navigation */}
              <Button
                size="sm"
                variant="outline"
                className="absolute left-4 top-1/2 -translate-y-1/2"
                onClick={() => navigateCarousel('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onClick={() => navigateCarousel('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <h3 className="font-medium">{images[selectedImageIndex].name}</h3>
              {images[selectedImageIndex].description && (
                <p className="text-muted-foreground mt-1">
                  {images[selectedImageIndex].description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>{selectedImageIndex + 1} of {images.length}</span>
                {images[selectedImageIndex].isCover && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Cover Image
                  </span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Image Modal */}
      <EditImageDialog
        image={editingImage}
        open={!!editingImage}
        onOpenChange={(open) => !open && setEditingImage(null)}
        onSave={handleUpdateImage}
      />
    </div>
  );
}

// Edit Image Dialog Component
interface EditImageDialogProps {
  image: ImageData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string }) => void;
}

function EditImageDialog({ image, open, onOpenChange, onSave }: EditImageDialogProps) {
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (image) {
      setFormData({
        name: image.name,
        description: image.description || "",
      });
    }
  }, [image]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Image Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Image Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
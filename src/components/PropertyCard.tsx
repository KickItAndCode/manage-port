"use client";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PropertyImage } from "@/components/PropertyImage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ImageIcon,
  Home
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyRent: number;
  purchaseDate: string;
  imageUrl?: string;
  monthlyMortgage?: number;
  monthlyCapEx?: number;
}

interface PropertyCardProps {
  property: Property;
  variant?: "default" | "compact" | "table-row";
  showActions?: boolean;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  className?: string;
}

export function PropertyCard({ 
  property, 
  variant = "default", 
  showActions = true,
  onEdit,
  onDelete,
  className 
}: PropertyCardProps) {
  const router = useRouter();
  const { user } = useUser();
  
  // Get cover image for this property
  const coverImage = useQuery(api.propertyImages.getCoverImage, 
    user ? { propertyId: property._id as any, userId: user.id } : "skip"
  );
  
  const isLoadingImage = coverImage === undefined;

  // Default property image component
  const DefaultPropertyImage = ({ className }: { className?: string }) => (
    <div className={cn(
      "w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-700 dark:to-slate-800 border border-border/50",
      className
    )}>
      <div className="text-center">
        <Home className="h-8 w-8 mx-auto mb-2 text-blue-500 dark:text-blue-400" />
        <div className="text-xs text-muted-foreground font-medium">No Image</div>
      </div>
    </div>
  );

  const handleClick = () => {
    router.push(`/properties/${property._id}`);
  };

  if (variant === "table-row") {
    // Render as table row content for existing tables
    return (
      <>
        <td className="py-3 px-2 sm:px-0" role="cell">
          <div className="flex items-center gap-3">
            {/* Thumbnail Image */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {isLoadingImage ? (
                <div className="w-full h-full bg-muted animate-pulse" />
              ) : coverImage ? (
                <PropertyImage
                  storageId={coverImage.storageId}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DefaultPropertyImage />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors cursor-pointer">
                {property.name}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                {property.address}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3 px-2 sm:px-0" role="cell">
          <Badge variant="outline" className="text-xs">
            {property.type}
          </Badge>
        </td>
        <td className="py-3 px-2 sm:px-0" role="cell">
          <StatusBadge status={property.status} variant="compact" />
        </td>
        <td className="py-3 text-right font-medium px-2 sm:px-0 text-sm sm:text-base" role="cell">
          ${property.monthlyRent.toLocaleString()}
        </td>
      </>
    );
  }

  if (variant === "compact") {
    // Compact horizontal card
    return (
      <Card 
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-0">
          <div className="flex">
            {/* Image */}
            <div className="w-24 h-20 flex-shrink-0 bg-muted relative">
              {isLoadingImage ? (
                <div className="w-full h-full bg-muted animate-pulse" />
              ) : coverImage ? (
                <PropertyImage
                  storageId={coverImage.storageId}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DefaultPropertyImage />
              )}
              <div className="absolute top-2 right-2">
                <StatusBadge status={property.status} variant="compact" />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                  {property.name}
                </h3>
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {onEdit && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(property); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(property); }}
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mb-2 truncate">
                <MapPin className="h-3 w-3 inline mr-1" />
                {property.address}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex items-center">
                    <Bed className="h-3 w-3 mr-1" />
                    {property.bedrooms}
                  </span>
                  <span className="flex items-center">
                    <Bath className="h-3 w-3 mr-1" />
                    {property.bathrooms}
                  </span>
                </div>
                <span className="font-semibold text-green-600">
                  ${property.monthlyRent.toLocaleString()}/mo
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card variant
  return (
    <Card 
      className={cn(
        "group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-52 sm:h-48 md:h-52 lg:h-48 bg-muted">
          {isLoadingImage ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : coverImage ? (
            <PropertyImage
              storageId={coverImage.storageId}
              alt={property.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <DefaultPropertyImage />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <StatusBadge status={property.status} />
          </div>
          
          {/* Quick Actions */}
          {showActions && (
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="bg-background/90 hover:bg-background border border-border/50 text-foreground shadow-lg backdrop-blur-sm"
                    onClick={(e) => { e.stopPropagation(); handleClick(); }}
                  >
                    <Eye className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                  {onEdit && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="bg-background/90 hover:bg-background border border-border/50 text-foreground shadow-lg backdrop-blur-sm"
                      onClick={(e) => { e.stopPropagation(); onEdit(property); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="bg-background/90 hover:bg-background border border-border/50 text-foreground shadow-lg backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(property); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDelete(property); }}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
              {property.name}
            </h3>
            <Badge variant="outline" className="ml-2">
              {property.type}
            </Badge>
          </div>
          
          <p className="text-muted-foreground text-sm mb-3 flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {property.address}
          </p>
          
          {/* Property Details */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center">
                <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
                {property.bedrooms} bed
              </span>
              <span className="flex items-center">
                <Bath className="h-4 w-4 mr-1 text-muted-foreground" />
                {property.bathrooms} bath
              </span>
              <span className="flex items-center">
                <Square className="h-4 w-4 mr-1 text-muted-foreground" />
                {property.squareFeet.toLocaleString()} ft²
              </span>
            </div>
          </div>
          
          {/* Price */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-2xl font-bold text-green-600 flex items-center">
              <DollarSign className="h-5 w-5" />
              {property.monthlyRent.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
  Search,
  MapPin,
  DollarSign,
  X,
  ArrowRight,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { PropertyImage } from "@/components/PropertyImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
}

// Component for individual search result item to handle cover image query
function SearchResultItem({
  property,
  index,
  selectedIndex,
  onNavigate,
  onMouseEnter,
}: {
  property: Property;
  index: number;
  selectedIndex: number;
  onNavigate: (id: string) => void;
  onMouseEnter: (index: number) => void;
}) {
  const { isAuthenticated } = useConvexAuth();

  const coverImage = useQuery(
    api.propertyImages.getCoverImage,
    isAuthenticated ? { propertyId: property._id as any} : "skip"
  );

  return (
    <button
      onClick={() => onNavigate(property._id)}
      onMouseEnter={() => onMouseEnter(index)}
      className={cn(
        "w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
        selectedIndex === index && "bg-muted/50"
      )}
    >
      {/* Property Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {coverImage ? (
          <PropertyImage
            storageId={coverImage.storageId}
            alt={property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm truncate">{property.name}</h4>
          <StatusBadge status={property.status} variant="compact" />
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3" />
            {property.address}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{property.type}</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {property.monthlyRent > 0
              ? `$${property.monthlyRent.toLocaleString()}`
              : "$0"}
          </span>
          <span>
            {property.bedrooms}BR/{property.bathrooms}BA
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-3" />
    </button>
  );
}

export function GlobalSearch() {
  
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Starts as "Ctrl" on every render, including the server's, and switches to
   * ⌘ after mount. Reading the platform during render would make the server
   * and client disagree, which is the hydration mismatch this codebase already
   * shipped once in ConditionalLayout.
   */
  const [shortcutKey, setShortcutKey] = useState("Ctrl+");
  useEffect(() => {
    if (navigator.platform.toUpperCase().includes("MAC")) setShortcutKey("⌘");
  }, []);

  const { isAuthenticated } = useConvexAuth();
  const propertiesResult = useQuery(
    api.properties.getProperties,
    isAuthenticated ? { limit: 1000 } : "skip" // Get more properties for search
  );

  // Extract properties array from paginated result
  const properties =
    propertiesResult && "properties" in propertiesResult
      ? propertiesResult.properties
      : [];

  // Filter properties based on search
  const filteredProperties = properties
    ?.filter((property: Property) => {
      if (!search) return false;
      const searchLower = search.toLowerCase();
      return (
        property.name.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.type.toLowerCase().includes(searchLower) ||
        property.status.toLowerCase().includes(searchLower)
      );
    })
    .slice(0, 5); // Limit to 5 results

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * ⌘K / Ctrl-K focuses search from anywhere, Escape leaves it.
   *
   * The field sat in the top bar reachable only by mouse. The shortcut is
   * conventional enough that people try it before looking for the box.
   *
   * Bound on keydown with preventDefault so the browser's own find-in-page or
   * search-bar binding does not also fire.
   */
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // Only surrender focus if search actually has it, so Escape keeps
      // working for whatever dialog is on screen.
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Navigation function
  const navigateToProperty = useCallback(
    (propertyId: string) => {
      router.push(`/properties/${propertyId}`);
      setSearch("");
      setIsOpen(false);
      setSelectedIndex(0);
    },
    [router]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!filteredProperties || filteredProperties.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredProperties.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredProperties.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredProperties[selectedIndex]) {
            navigateToProperty(filteredProperties[selectedIndex]._id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [filteredProperties, selectedIndex, navigateToProperty]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(0);
  };

  return (
    <div
      ref={searchRef}
      className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search properties..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => search && setIsOpen(true)}
          className="pl-10 pr-10 w-full bg-input text-foreground border-border focus:ring-2 focus:ring-primary"
          data-testid="global-search-input"
        />
        {/* A shortcut nobody knows about is not a shortcut. Hidden on touch
            layouts, where there is no keyboard to press it with. */}
        {!search && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex"
          >
            {shortcutKey}K
          </kbd>
        )}
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setIsOpen(false);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && filteredProperties && filteredProperties.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="py-2">
            {filteredProperties.map((property: Property, index: number) => (
              <SearchResultItem
                key={property._id}
                property={property}
                index={index}
                selectedIndex={selectedIndex}
                onNavigate={navigateToProperty}
                onMouseEnter={setSelectedIndex}
              />
            ))}
          </div>
          {filteredProperties.length === 5 && (
            <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t">
              Showing first 5 results
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen &&
        search &&
        (!filteredProperties || filteredProperties.length === 0) && (
          <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center z-50">
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No properties found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching by name, address, or type
            </p>
          </div>
        )}
    </div>
  );
}

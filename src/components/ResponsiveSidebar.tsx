"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Building, 
  FileText, 
  Settings, 
  Flashlight, 
  Layers, 
  Menu, 
  X,
  ChevronLeft
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Properties", href: "/properties", icon: Building },
  { label: "Leases", href: "/leases", icon: Layers },
  { label: "Bills & Payments", href: "/utility-bills", icon: Flashlight },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface ResponsiveSidebarProps {
  onMobileMenuToggle?: (isOpen: boolean) => void;
}

export function ResponsiveSidebar({ onMobileMenuToggle }: ResponsiveSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen);
  }, [isMobileMenuOpen, onMobileMenuToggle]);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname, isMobile]);

  if (!mounted) return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0">
        {/* Logo/Brand */}
        <div className={cn(
          "flex items-center gap-2 px-2 mb-8",
          isCollapsed && !isMobile && "justify-center"
        )}>
          <Building className="text-primary flex-shrink-0" size={24} />
          {(!isCollapsed || isMobile) && (
            <span className="text-xl font-bold text-primary">ManagePort</span>
          )}
        </div>
      </div>

      {/* Navigation Section - Takes available space */}
      <nav className="flex-1 overflow-y-auto min-h-0">
        <ul className="space-y-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            const linkContent = (
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground",
                  "hover:bg-primary hover:text-primary-foreground hover:bg-primary/90",
                  isActive && "bg-success text-success-foreground",
                  isCollapsed && !isMobile && "justify-center"
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {(!isCollapsed || isMobile) && (
                  <span className="font-medium">{label}</span>
                )}
              </Link>
            );

            // Wrap in tooltip when collapsed on desktop
            if (isCollapsed && !isMobile) {
              return (
                <li key={href}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={href}>{linkContent}</li>;
          })}
        </ul>
      </nav>

      {/* Footer Section - Fixed at bottom */}
      <div className="flex-shrink-0 pt-4 border-t border-sidebar-border/50">
        {/* Collapse Toggle (Desktop only) */}
        {!isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            localStorage.setItem('sidebarCollapsed', String(newState));
            // Dispatch custom event for layout to listen
            window.dispatchEvent(new CustomEvent('sidebarToggle'));
          }}
          className={cn(
            "w-full justify-start hover:bg-primary/10",
            isCollapsed && "justify-center"
          )}
        >
            <ChevronLeft 
              size={18} 
              className={cn(
                "transition-transform duration-200 flex-shrink-0",
                isCollapsed && "rotate-180"
              )}
            />
            {!isCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile Menu Toggle Button
  const MobileMenuButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="fixed top-4 left-4 z-50 md:hidden"
      aria-label="Toggle menu"
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
    </Button>
  );

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside className={cn(
      "hidden md:flex h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
      "flex-col shadow-xl transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col h-full py-6 px-4">
        <SidebarContent />
      </div>
    </aside>
  );

  // Mobile Sidebar
  const MobileSidebar = () => (
    <>
      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        "flex flex-col shadow-xl transition-transform duration-300 z-50 md:hidden w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-6 px-4">
          <SidebarContent />
        </div>
      </aside>
    </>
  );

  return (
    <>
      <MobileMenuButton />
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
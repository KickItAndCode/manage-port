"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building, FileText, Settings, Flashlight, Layers, Shield, ExternalLink, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Properties", href: "/properties", icon: Building },
  { label: "Listings", href: "/listings", icon: ExternalLink },
  { label: "AI Enhancement", href: "/listing-enhancement", icon: Wand2 },
  { label: "Leases", href: "/leases", icon: Layers },
  { label: "Bills & Payments", href: "/utility-bills", icon: Flashlight },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin", href: "/admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <aside className="h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col py-6 px-4 rounded-r-2xl shadow-xl transition-colors duration-300">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="text-xl font-bold text-primary flex items-center"><Building className="inline-block mr-2" size={24} />ManagePort</span>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground 
                  hover:bg-primary hover:text-primary-foreground hover:bg-primary/90
                  ${pathname.startsWith(href) ? "bg-success text-success-foreground" : ""}`}
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 
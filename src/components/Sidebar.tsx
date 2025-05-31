"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building, FileText, Settings, Flashlight, File, Layers } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Properties", href: "/properties", icon: Building },
  { label: "Leases", href: "/leases", icon: Layers },
  { label: "Utilities", href: "/utilities", icon: Flashlight },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-screen w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col py-6 px-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="text-xl font-bold text-blue-400">{/* Logo/Icon */} <Building className="inline-block mr-2" size={24} />ManagePort</span>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-zinc-300 hover:bg-zinc-900 hover:text-blue-400 ${
                  pathname.startsWith(href) ? "bg-zinc-900 text-blue-400" : ""
                }`}
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
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavMenuItem } from "../nav-sections";

interface SidebarNavProps {
  menu: readonly NavMenuItem[];
}

export function SidebarNav({ menu }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal">
      <ul className="space-y-1">
        {menu.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600/10 text-blue-500 font-medium border-l-2 border-blue-500 pl-[10px]"
                    : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

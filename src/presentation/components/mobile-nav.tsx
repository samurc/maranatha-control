"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavMenuItem } from "../nav-sections";
import { LogoutButton } from "./logout-button";

export function MobileNav({ menu, role }: { menu: readonly NavMenuItem[]; role: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  
  return (
    <>
      {/* Navbar móvil superior */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-foreground/10 bg-background sticky top-0 z-30">
        <div>
          <h2 className="text-lg font-bold text-foreground leading-tight">Maranatha</h2>
          <p className="text-[10px] text-foreground/50 font-medium tracking-wide uppercase">Escuela Sabática</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-foreground/70 hover:bg-foreground/5 rounded-md transition-colors"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>

      {/* Menú Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
          <div className="relative w-[280px] max-w-[85vw] bg-background border-r border-foreground/10 shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Menú principal</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-foreground/70 hover:bg-foreground/5 rounded-md transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <nav aria-label="Navegación móvil">
                <ul className="space-y-1">
                  {menu.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`block rounded-md px-3 py-3 text-sm transition-colors ${
                            isActive
                              ? "bg-blue-600/10 text-blue-500 font-medium border-l-2 border-blue-500 pl-[10px]"
                              : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground font-medium"
                          }`}
                        >
                          {item.etiqueta}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="p-4 border-t border-foreground/10 bg-foreground/[0.02]">
              <p className="text-[11px] text-foreground/40 font-semibold uppercase tracking-wider mb-3">{role.replace(/_/g, " ")}</p>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

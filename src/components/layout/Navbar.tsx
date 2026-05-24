"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { primaryNavLinks } from "@/lib/navigation";
import { MobileNavMenu } from "./MobileNavMenu";
import { NavbarSavedLink } from "./NavbarSavedLink";
import { NavbarProfileLink } from "./NavbarProfileLink";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <nav
        className={cn(
          "site-navbar relative z-50 border-b backdrop-blur-xl transition-[border-color,background-color] duration-500",
          menuOpen ? "border-white/10" : "border-white/5"
        )}
      >
        <div className="site-navbar__inner mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:h-[72px]">
          <Logo href="/" size="md" priority className="navbar-brand" />

          <div className="hidden items-center gap-8 md:flex lg:gap-10">
            {primaryNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm tracking-wide transition-colors",
                    pathname === link.href
                      ? "text-white"
                      : "text-silver-400 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            <NavbarSavedLink showLabel />
            <NavbarProfileLink />
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Find Your Specialist
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <NavbarSavedLink />
            <NavbarProfileLink />
            <button
            type="button"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              menuOpen
                ? "bg-white/10 text-white"
                : "text-white active:bg-white/5"
            )}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span className="relative flex h-4 w-6 flex-col justify-between">
              <span
                className={cn(
                  "block h-0.5 w-full origin-center rounded-full bg-white transition-all duration-300",
                  menuOpen && "translate-y-[7px] rotate-45"
                )}
              />
              <span
                className={cn(
                  "block h-0.5 w-full rounded-full bg-white transition-all duration-300",
                  menuOpen && "scale-x-0 opacity-0"
                )}
              />
              <span
                className={cn(
                  "block h-0.5 w-full origin-center rounded-full bg-white transition-all duration-300",
                  menuOpen && "-translate-y-[7px] -rotate-45"
                )}
              />
            </span>
          </button>
          </div>
        </div>
      </nav>

      <MobileNavMenu
        open={menuOpen}
        pathname={pathname}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}

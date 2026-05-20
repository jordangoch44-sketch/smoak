"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:h-[72px]">
        <Link
          href="/"
          className="text-lg font-semibold tracking-[0.2em] text-white transition-opacity hover:opacity-70"
        >
          SMOAK
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
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
          <Link
            href="/explore"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Find a Trainer
          </Link>
        </div>

        <button
          type="button"
          className="flex flex-col gap-1.5 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-transform",
              menuOpen && "translate-y-2 rotate-45"
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-opacity",
              menuOpen && "opacity-0"
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-transform",
              menuOpen && "-translate-y-2 -rotate-45"
            )}
          />
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-white/5 bg-black px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-lg text-silver-300 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/explore"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-full bg-white px-6 py-3 text-center text-sm font-medium text-black"
            >
              Find a Trainer
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

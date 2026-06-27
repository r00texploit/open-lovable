"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

interface MobileNavProps {
  isSignedIn: boolean;
  navItems: NavItem[];
}

export function MobileNav({ isSignedIn, navItems }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={handleToggle}
        className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div
        id="mobile-menu"
        className={`md:hidden fixed inset-x-0 top-16 glass-dark border-b border-white/[0.06] ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <nav
          className="container-modern py-4 flex flex-col gap-2"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClose}
              className="py-3 px-4 text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <hr className="my-2 border-white/[0.08]" />
          {isSignedIn ? (
            <Link
              href="/generation"
              onClick={handleClose}
              className="btn-primary mt-2"
            >
              Open Builder
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                onClick={handleClose}
                className="py-3 px-4 text-white/60 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signin"
                onClick={handleClose}
                className="btn-primary mt-2"
              >
                Start building
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  );
}

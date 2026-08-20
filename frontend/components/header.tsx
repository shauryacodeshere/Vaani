"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Sparkles, Activity, ShieldCheck, History, PlusCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackendStatusBadge } from "@/components/backend-status-badge";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "New Job", icon: PlusCircle },
    { href: "/status", label: "Live Status", icon: Activity },
    { href: "/review", label: "Review & Verify", icon: ShieldCheck },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Mark */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-primary to-amber-500 text-primary-foreground shadow-sm">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                  VaaniReach
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  वाणी
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono -mt-1 hidden sm:inline">
                Multilingual Outreach Pipeline
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Status Badge, PS Tag, Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center">
            <Badge variant="outline" className="text-xs font-mono py-1 px-2 text-muted-foreground bg-muted/30">
              <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
              PS-02 Codeissance
            </Badge>
          </div>
          <BackendStatusBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

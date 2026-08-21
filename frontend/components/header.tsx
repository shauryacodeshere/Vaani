"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  Sparkles,
  Activity,
  ShieldCheck,
  History,
  PlusCircle,
  Lock,
  LogOut,
  UserCheck,
  Tv,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackendStatusBadge } from "@/components/backend-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const { isAdmin, user, openLoginModal, logout } = useAuth();

  // Officer / Admin Navigation Items
  const adminNavItems = [
    { href: "/jobs", label: "New Job", icon: PlusCircle },
    { href: "/status", label: "Live Status", icon: Activity },
    { href: "/review", label: "Review & Verify", icon: ShieldCheck },
    { href: "/history", label: "History & Ledger", icon: History },
  ];

  // Citizen / Public Navigation Items
  const citizenNavItems = [
    { href: "/", label: "Public Broadcast Bulletin", icon: Tv },
  ];

  const currentNavItems = isAdmin ? adminNavItems : citizenNavItems;

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
                {isAdmin ? "Officer Pipeline & Verification Studio" : "Multilingual Citizen Outreach Portal"}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {currentNavItems.map((item) => {
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

        {/* Right Section: Role Status, Login/Logout, Status Badge, Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Indicator & Action */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>OFFICER / ADMIN</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit to Citizen View</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={openLoginModal}
              className="text-xs h-8 gap-1.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Admin Login</span>
            </Button>
          )}

          <BackendStatusBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}


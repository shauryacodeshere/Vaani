"use client";

import * as React from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  Building2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function AdminLoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginAsAdmin } = useAuth();
  const [email, setEmail] = useState("admin@vaanireach.gov.in");
  const [password, setPassword] = useState("officer2026");
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      loginAsAdmin(email, password);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-card border border-primary/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-primary/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeLoginModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-amber-500 p-0.5 shadow-lg shadow-primary/20 flex items-center justify-center">
            <div className="w-full h-full bg-card rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Officer / Admin Portal</h2>
            <p className="text-xs text-muted-foreground">
              Sign in with institutional credentials to access the video generation & verification suite.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Official Officer Email</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@vaanireach.gov.in"
              required
              className="text-xs h-9 bg-background/80"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Security Password</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="text-xs h-9 bg-background/80"
            />
          </div>

          {/* Institutional Badge Preview */}
          <div className="p-3 rounded-xl border bg-muted/30 flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground">Nodal Desk Sign-In</span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  GOV VERIFIED
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Access to Ingestion, Script Writer, LLM Verifier & Human Gate
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-10 text-xs font-bold gap-2 cursor-pointer shadow-md">
            {isLoading ? (
              <span>Authenticating Officer...</span>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                <span>Sign In as Verification Officer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            PS-02 Codeissance 2026 • Single Sign-On Enabled
          </p>
        </form>
      </div>
    </div>
  );
}

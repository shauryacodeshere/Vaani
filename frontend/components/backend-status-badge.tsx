"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function BackendStatusBadge() {
  const [status, setStatus] = React.useState<"checking" | "online" | "mock">("checking");
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null);

  const checkHealth = React.useCallback(async () => {
    setStatus("checking");
    try {
      await api.health();
      setStatus("online");
      setLastCheck(new Date());
    } catch {
      setStatus("mock");
      setLastCheck(new Date());
    }
  }, []);

  React.useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="flex items-center gap-2">
      {status === "checking" && (
        <Badge variant="outline" className="text-xs flex items-center gap-1 py-1 font-mono text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Checking API...</span>
        </Badge>
      )}
      {status === "online" && (
        <Badge
          variant="outline"
          className="text-xs flex items-center gap-1.5 py-1 font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          title={`Backend API Connected at ${lastCheck?.toLocaleTimeString()}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>API Connected</span>
        </Badge>
      )}
      {status === "mock" && (
        <Badge
          variant="outline"
          className="text-xs flex items-center gap-1.5 py-1 font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
          title="Backend offline. Operating in Mock Fixture mode for standalone UI preview."
        >
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span>Mock Fixture Mode</span>
        </Badge>
      )}
    </div>
  );
}

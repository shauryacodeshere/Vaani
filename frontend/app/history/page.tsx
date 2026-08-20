"use client";

import * as React from "react";
import Link from "next/link";
import { History, FileText, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_HISTORY_JOBS } from "@/lib/mock";

export default function HistoryPage() {
  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Job History & Audit Trail</h1>
            <Badge variant="outline" className="font-mono text-xs">feat/dashboard-history</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Complete archive of generated multilingual outreach runs, reviewer sign-offs, and failure logs.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span>Recent Pipeline Jobs</span>
          </CardTitle>
          <CardDescription>
            Audit log of jobs processed across L1 to L6
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Job ID</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_HISTORY_JOBS.map((job) => {
                  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                  let statusColor = "text-muted-foreground";

                  if (job.stage === "approved") {
                    statusColor = "text-emerald-500";
                  } else if (job.stage === "rejected" || job.stage === "failed") {
                    badgeVariant = "destructive";
                    statusColor = "text-rose-500";
                  } else if (job.stage === "pending_review") {
                    statusColor = "text-amber-500";
                  }

                  return (
                    <TableRow key={job.job_id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {job.job_id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs truncate max-w-[200px]" title={job.doc_id}>
                          {job.doc_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {job.languages.map((l) => (
                            <span
                              key={l}
                              className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className="font-mono text-[11px] uppercase">
                          {job.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(job.created_at || "").toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/review" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs flex items-center gap-1 inline-flex" })}>
                          <span>Inspect</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

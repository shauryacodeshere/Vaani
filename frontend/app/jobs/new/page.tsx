"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Globe, FileUp, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NewJobPage() {
  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Create Outreach Video Job</h1>
          <Badge variant="outline" className="font-mono text-xs">feat/dashboard-job-submission</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Scrape a public government portal URL or upload an official notice document to begin extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
              <Globe className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Public Notice URL</CardTitle>
            <CardDescription>
              Scrape press release portals (PIB, State Portals, University boards) to detect published circulars.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className={buttonVariants({ className: "w-full" })}>
              Launch URL Ingestion Flow
            </Link>
          </CardContent>
        </Card>

        <Card className="border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2">
              <FileUp className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Document Upload</CardTitle>
            <CardDescription>
              Upload PDF, DOCX, or plain text notice files directly to extract atomic, cited facts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Upload Circular
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

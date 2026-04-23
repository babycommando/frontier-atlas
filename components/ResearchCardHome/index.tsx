import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowRightCircle,
  Link,
  Plus,
  PlusCircle,
} from "lucide-react";

type Apod = {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  date: string;
  media_type?: "image" | "video";
};

export function ResearchCardHome() {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/95">
      <CardHeader>
        <CardTitle className="text-xl">Conduct New Research</CardTitle>
        <CardDescription>Create clusters of knowledge</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <Button
            variant="ghost"
            className="h-auto w-full justify-between rounded-2xl px-4 py-3">
            <span className="text-left flex items-center gap-3">
              {/* <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" /> */}
              <span>
                <span className="block font-medium text-foreground">
                  Tutorial Research
                </span>
                <span className="block text-xs text-muted-foreground">
                  An introduction for Frontier Atlas
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs rounded-lg w-full h-8 cursor-pointer hover:opacity-90 flex flex-wrap items-center justify-center">
            <Plus />
            <p>Add</p>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

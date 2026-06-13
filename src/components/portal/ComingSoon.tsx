import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-lg">
      <Card className="border-border bg-card/80 text-center backdrop-blur-sm">
        <CardHeader className="items-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-blue-200">
            <Construction className="h-7 w-7" />
          </div>
          <CardTitle className="font-display text-2xl text-white">
            {title}
          </CardTitle>
          <CardDescription>
            {description ??
              "This section is under construction. Check back soon for new features."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;re building tools to help you run jobs faster and quote with
            confidence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
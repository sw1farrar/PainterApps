"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PhotoGalleryUpload } from "@/components/storage/PhotoGalleryUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAbsoluteHttpUrl } from "@/lib/utils";
import { updateJobPhotos } from "../actions";

type JobPhotosPanelProps = {
  jobId: string;
  initialPhotos: string[];
  beforePhotos?: string[];
};

export function JobPhotosPanel({
  jobId,
  initialPhotos,
  beforePhotos = [],
}: JobPhotosPanelProps) {
  const router = useRouter();
  const [photos, setPhotos] = React.useState(initialPhotos);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  async function persistPhotos(nextPhotos: string[]) {
    setPhotos(nextPhotos);
    setSaving(true);
    const result = await updateJobPhotos(jobId, nextPhotos);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save photos.");
      setPhotos(initialPhotos);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4">
      {beforePhotos.length > 0 ? (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Before photos</CardTitle>
            <CardDescription>
              Reference images from the original quote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {beforePhotos.map((photo) =>
                isAbsoluteHttpUrl(photo) ? (
                  <div
                    key={photo}
                    className="overflow-hidden rounded-lg border border-border bg-muted/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt="Before photo"
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Job site photos</CardTitle>
              <CardDescription>
                Document progress, prep, and finished work on this job.
              </CardDescription>
            </div>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <PhotoGalleryUpload
            photos={photos}
            onChange={persistPhotos}
            jobId={jobId}
            variant="job"
            label="Progress photos"
            description="Upload photos from the job site. Changes save automatically."
          />
        </CardContent>
      </Card>
    </div>
  );
}
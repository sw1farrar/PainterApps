"use client";

import { AddressFields } from "@/components/forms/AddressFields";
import { PhotoGalleryUpload } from "@/components/storage/PhotoGalleryUpload";
import { CustomerCombobox } from "@/components/quotes/CustomerCombobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobAddressFields } from "@/lib/address";
import type {
  Customer,
  QuoteEstimationMode,
  QuoteJobType,
} from "@/types/database";

type BasicsStepProps = {
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (id: string) => void;
  onCustomerCreated?: (customer: Customer) => void;
  jobType: QuoteJobType;
  onJobTypeChange: (type: QuoteJobType) => void;
  estimationMode?: QuoteEstimationMode;
  onEstimationModeChange?: (mode: QuoteEstimationMode) => void;
  jobAddress: JobAddressFields;
  onJobAddressChange: (address: JobAddressFields) => void;
  beforePhotos: string[];
  onBeforePhotosChange: (photos: string[]) => void;
  quoteId?: string;
  selectedCustomer?: Customer;
};

export function BasicsStep({
  customers,
  customerId,
  onCustomerIdChange,
  onCustomerCreated,
  jobType,
  onJobTypeChange,
  estimationMode = "hybrid",
  onEstimationModeChange,
  jobAddress,
  onJobAddressChange,
  beforePhotos,
  onBeforePhotosChange,
  quoteId,
  selectedCustomer,
}: BasicsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project basics</CardTitle>
        <CardDescription>
          Customer, job type, and site details for this estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomerCombobox
          customers={customers}
          value={customerId}
          onChange={onCustomerIdChange}
          onCustomerCreated={onCustomerCreated}
        />

        <div className="space-y-2">
          <Label>Job type</Label>
          <Select
            value={jobType}
            onValueChange={(v) => onJobTypeChange(v as QuoteJobType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="interior">Interior</SelectItem>
              <SelectItem value="exterior">Exterior</SelectItem>
              <SelectItem value="both">Interior + Exterior</SelectItem>
              <SelectItem value="specialty">Specialty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {onEstimationModeChange ? (
          <div className="space-y-2">
            <Label>Estimation mode</Label>
            <Select
              value={estimationMode}
              onValueChange={(v) =>
                onEstimationModeChange(v as QuoteEstimationMode)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hybrid">
                  Hybrid — surfaces, then room sq ft
                </SelectItem>
                <SelectItem value="surface">Surface measurements only</SelectItem>
                <SelectItem value="room">Room totals only</SelectItem>
                <SelectItem value="manual">Manual line items only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls how &quot;Generate from rooms&quot; builds line items in
              Areas.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Job site address</Label>
            {selectedCustomer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onJobAddressChange({
                    job_address: selectedCustomer.address ?? "",
                    job_address_line2: selectedCustomer.address_line2 ?? "",
                    job_city: selectedCustomer.city ?? "",
                    job_state: selectedCustomer.state ?? "",
                    job_zip: selectedCustomer.zip ?? "",
                  })
                }
              >
                Use customer address
              </Button>
            ) : null}
          </div>
          <AddressFields
            idPrefix="job"
            value={{
              address: jobAddress.job_address,
              address_line2: jobAddress.job_address_line2 ?? "",
              city: jobAddress.job_city ?? "",
              state: jobAddress.job_state ?? "",
              zip: jobAddress.job_zip ?? "",
            }}
            onChange={(value) =>
              onJobAddressChange({
                job_address: value.address ?? "",
                job_address_line2: value.address_line2 ?? "",
                job_city: value.city ?? "",
                job_state: value.state ?? "",
                job_zip: value.zip ?? "",
              })
            }
            line1Label="Job street address"
            required
          />
        </div>

        <PhotoGalleryUpload
          photos={beforePhotos}
          onChange={onBeforePhotosChange}
          quoteId={quoteId}
          label="Before photos"
          description="Upload photos of the job site before work begins."
        />
      </CardContent>
    </Card>
  );
}
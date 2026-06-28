"use client";

import * as React from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { PageHeader } from "@/components/portal/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_ADDRESS, formatAddress, toAddressInput } from "@/lib/address";
import { formatPhoneDisplay } from "@/lib/phone";
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Customer } from "@/types/database";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "./actions";

type CustomersClientProps = {
  customers: Customer[];
};

function customerToAddress(customer: Customer) {
  return {
    address: customer.address ?? "",
    address_line2: customer.address_line2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zip: customer.zip ?? "",
  };
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(
    null,
  );

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addressFields, setAddressFields] = React.useState(EMPTY_ADDRESS);
  const [notes, setNotes] = React.useState("");

  const envError = getSupabaseEnvError();
  const isEditing = editingCustomer !== null;

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setAddressFields(EMPTY_ADDRESS);
    setNotes("");
    setEditingCustomer(null);
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEditDrawer(customer: Customer) {
    setEditingCustomer(customer);
    setName(customer.name);
    setEmail(customer.email ?? "");
    setPhone(formatPhoneDisplay(customer.phone));
    setAddressFields(customerToAddress(customer));
    setNotes(customer.notes ?? "");
    setDrawerOpen(true);
  }

  async function handleCreate() {
    if (envError) {
      toast.error(envError);
      return;
    }

    const payload: CustomerInput = {
      name,
      email,
      phone,
      ...toAddressInput(addressFields),
      notes,
    };

    setLoading(true);
    const result = isEditing
      ? await updateCustomer(editingCustomer.id, payload)
      : await createCustomer(payload);
    setLoading(false);

    if (!result.success) {
      toast.error(
        result.error ??
          (isEditing ? "Failed to update customer." : "Failed to create customer."),
      );
      return;
    }

    toast.success(isEditing ? "Customer updated." : "Customer added.");
    resetForm();
    setDrawerOpen(false);
  }

  async function handleDelete(id: string, customerName: string) {
    if (envError) {
      toast.error(envError);
      return;
    }

    if (!confirm(`Delete ${customerName}? This cannot be undone.`)) return;

    setDeletingId(id);
    const result = await deleteCustomer(id);
    setDeletingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete customer.");
      return;
    }

    toast.success("Customer deleted.");
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your client list and contact details."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" />
            Add customer
          </Button>
        }
      />

      {envError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      {customers.length === 0 ? (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>No customers yet</CardTitle>
            <CardDescription>
              Add your first customer to start building quotes and jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreateDrawer}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => {
            const formattedAddress = formatAddress(customer);

            return (
              <Card
                key={customer.id}
                className="border-border bg-card/80 backdrop-blur-sm"
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{customer.name}</CardTitle>
                    <CardDescription>
                      Added {new Date(customer.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDrawer(customer)}
                      aria-label={`Edit ${customer.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(customer.id, customer.name)}
                      disabled={deletingId === customer.id}
                      aria-label={`Delete ${customer.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {customer.email ? (
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </p>
                  ) : null}
                  {customer.phone ? (
                    <p className="flex min-w-0 items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {formatPhoneDisplay(customer.phone)}
                      </span>
                    </p>
                  ) : null}
                  {formattedAddress ? (
                    <p className="flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{formattedAddress}</span>
                    </p>
                  ) : null}
                  <Badge variant="outline" className="mt-2">
                    Portal ready
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AppDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) resetForm();
        }}
        title={isEditing ? "Edit customer" : "Add customer"}
        description={
          isEditing
            ? "Update contact details for this customer."
            : "Create a new customer record for quotes and jobs."
        }
        footer={
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={loading || !name.trim()}
            >
              {loading ? "Saving…" : isEditing ? "Save changes" : "Save customer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="customer-contact">Email</Label>
                <Input
                  id="customer-contact"
                  type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <PhoneInput
                id="customer-phone"
                value={phone}
                onChange={setPhone}
              />
            </div>
          </div>
          <AddressFields
            idPrefix="customer"
            value={addressFields}
            onChange={setAddressFields}
            showNotes
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
      </AppDrawer>
    </div>
  );
}
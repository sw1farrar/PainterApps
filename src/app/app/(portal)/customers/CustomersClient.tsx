"use client";

import * as React from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppDrawer } from "@/components/portal/AppDrawer";
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
import { getSupabaseEnvError } from "@/lib/supabase/env";
import type { Customer } from "@/types/database";
import { createCustomer, deleteCustomer, updateCustomer } from "./actions";

type CustomersClientProps = {
  customers: Customer[];
};

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
  const [address, setAddress] = React.useState("");

  const envError = getSupabaseEnvError();
  const isEditing = editingCustomer !== null;

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
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
    setPhone(customer.phone ?? "");
    setAddress(customer.address ?? "");
    setDrawerOpen(true);
  }

  async function handleCreate() {
    if (envError) {
      toast.error(envError);
      return;
    }

    setLoading(true);
    const result = isEditing
      ? await updateCustomer(editingCustomer.id, {
          name,
          email,
          phone,
          address,
        })
      : await createCustomer({ name, email, phone, address });
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
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-white md:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client list and contact details.
          </p>
        </div>
        <Button onClick={openCreateDrawer}>
          <Plus className="h-4 w-4" />
          Add customer
        </Button>
      </div>

      {envError ? (
        <Card className="mt-6 border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{envError}</p>
          </CardContent>
        </Card>
      ) : null}

      {customers.length === 0 ? (
        <Card className="mt-6 border-border bg-card/80 backdrop-blur-sm">
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
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
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {customer.email}
                  </p>
                ) : null}
                {customer.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {customer.phone}
                  </p>
                ) : null}
                {customer.address ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {customer.address}
                  </p>
                ) : null}
                <Badge variant="outline" className="mt-2">
                  Portal ready
                </Badge>
              </CardContent>
            </Card>
          ))}
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
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input
              id="customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Address</Label>
            <Input
              id="customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Oak St"
            />
          </div>
        </div>
      </AppDrawer>
    </>
  );
}
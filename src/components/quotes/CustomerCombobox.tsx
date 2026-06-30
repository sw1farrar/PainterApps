"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import { createCustomer } from "@/app/app/(portal)/customers/actions";
import { AppDrawer } from "@/components/portal/AppDrawer";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { AddressFields } from "@/components/forms/AddressFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_ADDRESS, toAddressInput } from "@/lib/address";
import { Z_LAYERS } from "@/lib/ui/z-layers";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";

type CustomerComboboxProps = {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  onCustomerCreated?: (customer: Customer) => void;
  className?: string;
  compact?: boolean;
};

export function CustomerCombobox({
  customers,
  value,
  onChange,
  onCustomerCreated,
  className,
  compact = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);

  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressFields, setAddressFields] = useState(EMPTY_ADDRESS);

  const selected = localCustomers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localCustomers;
    return localCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q),
    );
  }, [localCustomers, query]);

  const handleSelect = (customer: Customer) => {
    onChange(customer.id);
    setQuery(customer.name);
    setOpen(false);
  };

  const openCreateDrawer = () => {
    const trimmed = query.trim();
    if (trimmed) setName(trimmed);
    setOpen(false);
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    setCreating(true);
    const result = await createCustomer({
      name,
      email,
      phone,
      ...toAddressInput(addressFields),
    });
    setCreating(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to create customer.");
      return;
    }
    if (!result.data?.id || !result.data.portal_token) {
      toast.error("Failed to create customer.");
      return;
    }

    const newCustomer: Customer = {
      id: result.data.id,
      company_id: "",
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: addressFields.address || null,
      address_line2: addressFields.address_line2 || null,
      city: addressFields.city || null,
      state: addressFields.state || null,
      zip: addressFields.zip || null,
      notes: null,
      portal_token: result.data.portal_token,
      created_at: new Date().toISOString(),
    };

    setLocalCustomers((prev) =>
      [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)),
    );
    onChange(newCustomer.id);
    onCustomerCreated?.(newCustomer);
    setQuery(newCustomer.name);
    setDrawerOpen(false);
    setName("");
    setEmail("");
    setPhone("");
    setAddressFields(EMPTY_ADDRESS);
    toast.success("Customer added.");
  };

  const createLabel = query.trim()
    ? `Create "${query.trim()}"`
    : "Add new customer";

  return (
    <div className={cn("relative", compact ? "space-y-1" : "space-y-2", className)}>
      <Label htmlFor="customer-search" className={compact ? "text-xs" : undefined}>
        Customer <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="customer-search"
          role="combobox"
          aria-expanded={open}
          aria-controls="customer-listbox"
          aria-autocomplete="list"
          value={open ? query : (selected?.name ?? query)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => {
            setQuery(selected?.name ?? "");
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search or add customer…"
          className={cn("pl-9", compact && "h-9")}
          autoComplete="off"
        />

        {open ? (
          <div
            id="customer-listbox"
            role="listbox"
            aria-label="Customers"
            className={cn(
              "absolute left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-lg",
              Z_LAYERS.popover,
            )}
          >
            {filtered.length ? (
              filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  role="option"
                  aria-selected={customer.id === value}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(customer)}
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{customer.name}</p>
                    {customer.email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {localCustomers.length === 0
                  ? "No customers yet — add one below."
                  : "No customers match your search."}
              </p>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/60"
              onPointerDown={(e) => e.preventDefault()}
              onClick={openCreateDrawer}
            >
              <Plus className="h-4 w-4" />
              {createLabel}
            </button>
          </div>
        ) : null}
      </div>

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Add customer"
        description="Quick-add a customer without leaving the quote."

        footer={
          <Button className="w-full" onClick={handleCreate} disabled={creating}>
            {creating ? "Saving…" : "Save customer"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <AddressFields
            idPrefix="new-customer"
            value={addressFields}
            onChange={setAddressFields}
          />
        </div>
      </AppDrawer>
    </div>
  );
}
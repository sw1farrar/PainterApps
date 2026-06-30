"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/app/app/(portal)/notifications/actions";
import { signalNavigationStart } from "@/lib/ui/navigation-progress";

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationRow[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  async function loadNotifications() {
    setLoading(true);
    try {
      const rows = await getNotifications();
      setNotifications(rows);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadNotifications();
  }, []);

  async function handleOpenChange(open: boolean) {
    if (open) await loadNotifications();
  }

  function handleItemClick(notification: NotificationRow) {
    if (notification.href) {
      signalNavigationStart();
      router.push(notification.href);
    }

    if (!notification.read_at) {
      const readAt = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read_at: readAt } : item,
        ),
      );
      void markNotificationRead(notification.id);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-card">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-normal text-primary hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex cursor-pointer flex-col items-start gap-1 py-2"
              onClick={() => handleItemClick(notification)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span
                  className={`text-sm ${
                    notification.read_at
                      ? "text-muted-foreground"
                      : "font-medium text-foreground"
                  }`}
                >
                  {notification.title}
                </span>
                {notification.read_at ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              {notification.body ? (
                <span className="text-xs text-muted-foreground">
                  {notification.body}
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/dashboard" className="justify-center text-center">
            View dashboard
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
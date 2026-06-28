import { AdminSiteSettingsClient } from "@/components/admin/AdminSiteSettingsClient";
import { getSiteSettings } from "@/app/app/admin/settings/actions";

export default async function AdminSiteSettingsPage() {
  const settings = await getSiteSettings();

  return <AdminSiteSettingsClient initialSettings={settings} />;
}
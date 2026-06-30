import { redirect } from "next/navigation";

export default function SellSheetsRedirectPage() {
  redirect("/app/products/sell-sheets");
}
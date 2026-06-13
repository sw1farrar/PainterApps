import { requireOnboarded } from "@/lib/auth/session";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const session = await requireOnboarded();

  return (
    <ProfileClient profile={session.profile} company={session.company} />
  );
}
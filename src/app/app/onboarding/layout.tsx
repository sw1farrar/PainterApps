export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="portal-shell min-h-[100dvh]">{children}</div>;
}
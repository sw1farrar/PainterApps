export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-shell site-viewport-shell min-h-0">
      <div data-site-scroll-main className="site-scroll-main scroll-smooth">
        {children}
      </div>
    </div>
  );
}
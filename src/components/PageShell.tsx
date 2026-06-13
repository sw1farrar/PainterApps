type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "main" | "nav";
};

export default function PageShell({
  children,
  className = "",
  as: Tag = "div",
}: PageShellProps) {
  const isNav = Tag === "nav";

  return (
    <Tag
      className={`w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 ${className}`}
    >
      {children}
      {!isNav ? <div className="page-bottom-pad" aria-hidden="true" /> : null}
    </Tag>
  );
}
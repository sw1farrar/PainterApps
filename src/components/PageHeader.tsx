type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      {eyebrow ? <p className="type-eyebrow">{eyebrow}</p> : null}
      <h1 className="font-display mt-3 text-4xl sm:text-5xl lg:text-[3.5rem] lg:leading-none xl:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="type-lead mt-4 max-w-2xl text-base sm:text-lg lg:mt-5 lg:text-xl">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
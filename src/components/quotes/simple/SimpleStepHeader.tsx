type SimpleStepHeaderProps = {
  title: string;
  description: string;
};

export function SimpleStepHeader({ title, description }: SimpleStepHeaderProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
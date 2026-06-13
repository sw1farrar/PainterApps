import Image from "next/image";

type PageBackgroundProps = {
  children: React.ReactNode;
  viewportLocked?: boolean;
};

export default function PageBackground({
  children,
  viewportLocked = false,
}: PageBackgroundProps) {
  return (
    <div
      className={`relative flex flex-col ${
        viewportLocked ? "h-dvh overflow-hidden" : "min-h-dvh"
      }`}
    >
      <div className="fixed inset-0 -z-10">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="hero-gradient absolute inset-0" />
        <div className="hero-vignette absolute inset-0" />
        <div className="hero-grid absolute inset-0" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
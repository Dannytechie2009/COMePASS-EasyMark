import logoAsset from "@/assets/comepass-logo.png.asset.json";

export function BrandMark({
  size = 36,
  withWordmark = true,
  tagline = false,
}: {
  size?: number;
  withWordmark?: boolean;
  tagline?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoAsset.url}
        alt="COMePASS Prevarsity logo"
        width={size}
        height={size}
        className="rounded-full shrink-0 ring-1 ring-border"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <div className="leading-tight">
          <div className="font-bold tracking-tight">
            COM<span className="text-[var(--brand-red)]">e</span>PASS
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Prevarsity
            </span>
          </div>
          {tagline && (
            <div className="text-[11px] text-muted-foreground">
              Impacting lives for global relevance
            </div>
          )}
        </div>
      )}
    </div>
  );
}

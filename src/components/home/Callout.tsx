import type { ReactNode } from "react";
import { Dimension } from "@/components/ui/Dimension";

/**
 * A dimension callout that folds onto a second line instead of pushing the
 * sheet sideways. The value inside a `Dimension` never shrinks, so the wrap has
 * to be asked for here.
 */
export function Callout({
  children,
  tone = "ink",
  className = "",
  innerClassName = "max-w-[72vw] sm:max-w-none",
}: {
  children: ReactNode;
  tone?: "ink" | "signal" | "light";
  className?: string;
  innerClassName?: string;
}) {
  return (
    <Dimension tone={tone} className={className}>
      <span className={`block leading-relaxed ${innerClassName}`}>{children}</span>
    </Dimension>
  );
}

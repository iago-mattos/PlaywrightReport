import { forwardRef } from "react";

import { cn } from "../../lib/cn.js";

export const Input = forwardRef(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background/65 px-3 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
});

import { cn } from "../../lib/cn.js";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("material-surface rounded-2xl text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

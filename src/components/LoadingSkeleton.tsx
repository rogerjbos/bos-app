import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  lines?: number;
  animation?: "pulse" | "wave" | "none";
}

/**
 * Loading Skeleton Component
 *
 * Provides visual feedback while content is loading.
 * Supports multiple variants and animations.
 *
 * @example
 * ```tsx
 * // Text loading
 * <LoadingSkeleton variant="text" lines={3} />
 *
 * // Card loading
 * <LoadingSkeleton variant="card" />
 *
 * // Custom skeleton
 * <LoadingSkeleton className="h-32 w-full rounded-lg" />
 * ```
 */
export function LoadingSkeleton({
  className,
  variant = "rectangular",
  lines = 1,
  animation = "pulse",
}: LoadingSkeletonProps) {
  const baseClasses = "bg-white/5 rounded-lg";

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]",
    none: "",
  };

  const variantClasses = {
    text: "h-4 w-full",
    circular: "h-12 w-12 rounded-full",
    rectangular: "h-12 w-full",
    card: "h-48 w-full",
  };

  // Multiple text lines
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses.text,
              animationClasses[animation],
              i === lines - 1 && "w-3/4", // Last line shorter
              className
            )}
          />
        ))}
      </div>
    );
  }

  // Single skeleton
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  );
}

/**
 * Card Skeleton
 * Pre-built skeleton for card layouts
 */
export function CardSkeleton() {
  return (
    <div className="glass-dark p-6 rounded-xl border border-white/10">
      <div className="flex items-center gap-4 mb-4">
        <LoadingSkeleton variant="circular" className="h-12 w-12" />
        <div className="flex-1">
          <LoadingSkeleton variant="text" className="h-5 w-1/3 mb-2" />
          <LoadingSkeleton variant="text" className="h-4 w-1/2" />
        </div>
      </div>
      <LoadingSkeleton variant="text" lines={3} />
    </div>
  );
}

/**
 * Table Row Skeleton
 * Pre-built skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <LoadingSkeleton key={i} variant="text" className="flex-1" />
      ))}
    </div>
  );
}

/**
 * Stats Box Skeleton
 * Pre-built skeleton for statistics boxes
 */
export function StatsBoxSkeleton() {
  return (
    <div className="glass-dark p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <LoadingSkeleton variant="text" className="h-4 w-1/2" />
        <LoadingSkeleton variant="circular" className="h-8 w-8" />
      </div>
      <LoadingSkeleton variant="text" className="h-8 w-3/4 mb-2" />
      <LoadingSkeleton variant="text" className="h-3 w-1/3" />
    </div>
  );
}

export default LoadingSkeleton;

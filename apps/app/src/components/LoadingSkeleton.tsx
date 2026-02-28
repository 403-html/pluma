interface LoadingSkeletonProps {
  label?: string;
}

export default function LoadingSkeleton({ label = 'Loading API keys' }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse flex flex-col gap-3" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-muted rounded-md" />
      ))}
    </div>
  );
}

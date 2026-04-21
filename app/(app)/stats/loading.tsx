import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

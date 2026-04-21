import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <Skeleton className="h-12 w-96" />
      <div className="grid xl:grid-cols-[2fr_1fr_1fr] gap-4">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[110px]" />
      </div>
      <div className="grid xl:grid-cols-[1fr_1.3fr_1fr] gap-4">
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[260px]" />
      </div>
    </div>
  );
}

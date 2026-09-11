import { Card, Skeleton } from "@/components/ui";

/**
 * The shape of a page that is on its way.
 *
 * Holds the layout so a route change does not collapse the column and then
 * jump when the content lands. The sweep is slow and low-contrast, as it is in
 * the app — this is a loading state, not an event, and it holds still when the
 * reader has asked the device to keep still.
 */
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto flex max-w-[1400px] flex-col gap-6"
      role="status"
    >
      {/* Heading */}
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="size-14" rounded="full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" rounded="md" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>

      {/* Hero */}
      <Skeleton className="h-56 w-full" rounded="lg" />

      {/* Tile row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-24 w-full" key={i} rounded="lg" />
        ))}
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {[0, 1].map((i) => (
            <Card className="flex flex-col gap-4 p-6" key={i}>
              <Skeleton className="h-6 w-48" rounded="md" />
              <Skeleton className="h-28 w-full" rounded="lg" />
              <Skeleton className="h-28 w-full" rounded="lg" />
            </Card>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {[0, 1].map((i) => (
            <Card className="flex flex-col gap-3 p-6" key={i}>
              <Skeleton className="h-6 w-36" rounded="md" />
              <Skeleton className="h-16 w-full" rounded="lg" />
              <Skeleton className="h-16 w-full" rounded="lg" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

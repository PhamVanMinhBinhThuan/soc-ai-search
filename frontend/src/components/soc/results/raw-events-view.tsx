import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Lightbulb,
  Table2,
} from "lucide-react";

import { CountryCode } from "@/components/soc/country-code";
import { EmptyModeState } from "@/components/soc/results/empty-mode-state";
import { SeverityBadge } from "@/components/soc/severity-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SearchEventDto } from "@/types/soc";

export function RawEventsView({
  events,
  total,
  page,
  size,
  totalPages,
  onPageChange,
  onSelectEvent,
}: {
  events: SearchEventDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectEvent: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <EmptyModeState
        icon={FileSearch}
        title="No matching events"
        description="The search completed successfully, but no event logs matched the validated SearchPlan."
      />
    );
  }

  const firstResult = page * size + 1;
  const lastResult = Math.min(page * size + events.length, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#071018]/85 shadow-[0_0_26px_-22px_#22d3ee]">
      <div className="flex items-center gap-2 border-b border-cyan-400/15 bg-cyan-400/[0.055] px-4 py-3">
        <Table2 className="size-4 text-cyan-200" />
        <h3 className="text-sm font-semibold text-slate-50">Event Logs</h3>
        <div className="flex-1" />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <Lightbulb className="size-3.5 text-amber-300" />
          Tip: Click on any row to view full details
        </span>
      </div>
      <Table>
        <TableHeader className="bg-cyan-950/20">
          <TableRow className="border-cyan-400/15 hover:bg-transparent">
            <TableHead>Timestamp</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="min-w-64">Message</TableHead>
            <TableHead className="w-8 px-2">
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow
              key={event.event_id}
              tabIndex={0}
              aria-label={`Open event ${event.event_id}`}
              className="group cursor-pointer border-cyan-400/10 transition-colors hover:bg-cyan-400/[0.045] focus-visible:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50"
              onClick={() => onSelectEvent(event.event_id)}
              onKeyDown={(eventKey) => {
                if (eventKey.key === "Enter" || eventKey.key === " ") {
                  eventKey.preventDefault();
                  onSelectEvent(event.event_id);
                }
              }}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.timestamp?.replace("T", " ")?.replace("Z", "") || "N/A"}
              </TableCell>
              <TableCell>
                <SeverityBadge severity={event.severity} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {event.source}
              </TableCell>
              <TableCell>
                <span className="rounded-md border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">
                  {event.event_type}
                </span>
              </TableCell>
              <TableCell>{event.user}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.host}
              </TableCell>
              <TableCell className="font-mono text-xs">{event.ip}</TableCell>
              <TableCell>
                <CountryCode code={event.country_code} />
              </TableCell>
              <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                {event.message}
              </TableCell>
              <TableCell className="px-2">
                <ChevronRight className="size-4 text-cyan-200 opacity-0 transition-opacity group-hover:opacity-100" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-cyan-400/15 bg-zinc-950/55 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-mono text-foreground">{firstResult}</span>
          {" - "}
          <span className="font-mono text-foreground">{lastResult}</span>
          {" of "}
          <span className="font-mono text-foreground">
            {total.toLocaleString("en-US")}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous result page"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next result page"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

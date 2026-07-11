import {
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatEntityInput,
  formatSearchSortValue,
  parseCountryCodeInput,
  parseEntityInput,
  parseEventIdInput,
  parseSearchSortValue,
  toggleArrayValue,
} from "@/lib/search-plan-filters";
import {
  EVENT_TYPE_OPTIONS,
  MAX_EVENT_ID_FILTERS,
  SEARCH_SORT_OPTIONS,
  SEVERITY_OPTIONS,
} from "@/lib/search-plan-constants";
import type { SearchMode, SearchPlanDto, Severity } from "@/types/soc";

function MultiSelectDropdown<T extends string>({
  label,
  placeholder,
  options,
  values,
  accentClassName,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: readonly T[];
  values: T[];
  accentClassName: string;
  onChange: (values: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${values.length} selected`;

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-left text-sm text-foreground shadow-inner shadow-black/20 transition hover:border-cyan-300/45 focus:border-cyan-300/70 focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={
            values.length === 0 ? "text-muted-foreground" : "text-foreground"
          }
        >
          {selectedLabel}
        </span>
        <ChevronDown
          className={
            "size-4 text-muted-foreground transition " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-cyan-400/25 bg-zinc-950 p-2 shadow-2xl shadow-cyan-950/30">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground">
              {values.length} selected
            </span>
            {values.length > 0 ? (
              <button
                type="button"
                className="text-[11px] font-medium text-cyan-300 hover:text-cyan-100"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="space-y-1">
            {options.map((option) => {
              const selected = values.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  className={
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition " +
                    (selected
                      ? `${accentClassName} text-foreground`
                      : "text-muted-foreground hover:bg-cyan-400/10 hover:text-foreground")
                  }
                  onClick={() => onChange(toggleArrayValue(values, option))}
                >
                  <span
                    className={
                      "grid size-4 place-items-center rounded border " +
                      (selected
                        ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                        : "border-zinc-700")
                    }
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="font-mono">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ResultControls({
  mode,
  searchPlan,
  onApply,
}: {
  mode: SearchMode;
  searchPlan: SearchPlanDto;
  onApply?: (plan: SearchPlanDto) => void;
}) {
  const currentFilters = searchPlan.filters ?? {};
  const initialSearchSortValue = formatSearchSortValue(searchPlan.sort?.[0]);

  const [severity, setSeverity] = useState<Severity[]>(
    currentFilters.severity ?? [],
  );
  const [eventTypes, setEventTypes] = useState<string[]>(
    currentFilters.event_type ?? [],
  );
  const [eventId, setEventId] = useState(
    formatEntityInput(currentFilters.event_id),
  );
  const [source, setSource] = useState(formatEntityInput(currentFilters.source));
  const [user, setUser] = useState(formatEntityInput(currentFilters.user));
  const [host, setHost] = useState(formatEntityInput(currentFilters.host));
  const [ip, setIp] = useState(formatEntityInput(currentFilters.ip));
  const [countryCode, setCountryCode] = useState(
    currentFilters.country_code?.join(", ") ?? "",
  );
  const [messageQuery, setMessageQuery] = useState(
    searchPlan.message_query ?? "",
  );
  const [searchSort, setSearchSort] = useState(initialSearchSortValue);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const eventIdValues = parseEventIdInput(eventId);
  const eventIdLimitExceeded =
    eventIdValues !== null && eventIdValues.length > MAX_EVENT_ID_FILTERS;

  if (!onApply || mode !== "search") {
    return null;
  }

  const buildCommonFilters = () => ({
    ...(searchPlan.filters ?? {}),
    event_id: eventIdValues,
    severity: severity.length > 0 ? severity : null,
    event_type: eventTypes.length > 0 ? eventTypes : null,
    source: parseEntityInput(source),
    user: parseEntityInput(user),
    host: parseEntityInput(host),
    ip: parseEntityInput(ip),
    country_code: parseCountryCodeInput(countryCode),
  });

  const applySearchControls = () => {
    const { field, order } = parseSearchSortValue(searchSort);

    onApply({
      ...searchPlan,
      mode: "search",
      page: 0,
      filters: buildCommonFilters(),
      message_query: messageQuery.trim() || null,
      sort: [{ field, order }],
    });
  };

  const ControlsToggleIcon = controlsExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="border-b border-cyan-400/15 bg-cyan-950/[0.06] px-4 py-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-zinc-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_-22px_#22d3ee]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
          aria-expanded={controlsExpanded}
          aria-controls="filter-sort-results-content"
          onClick={() => setControlsExpanded((current) => !current)}
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]">
              <SlidersHorizontal className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-50">
              Filter & Sort Results
            </h3>
          </div>
          <ControlsToggleIcon className="size-4 text-muted-foreground" />
        </button>

        {controlsExpanded ? (
          <div id="filter-sort-results-content" className="px-4 pb-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <MultiSelectDropdown
                label="Severity"
                placeholder="Select severities"
                options={SEVERITY_OPTIONS}
                values={severity}
                accentClassName="bg-cyan-500/10"
                onChange={setSeverity}
              />
              <MultiSelectDropdown
                label="Event Type"
                placeholder="Select event types"
                options={EVENT_TYPE_OPTIONS}
                values={eventTypes}
                accentClassName="bg-violet-500/10"
                onChange={setEventTypes}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Sort
                </label>
                <select
                  value={searchSort}
                  onChange={(event) => setSearchSort(event.target.value)}
                  className="w-full rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-cyan-300/60"
                >
                  {SEARCH_SORT_OPTIONS.map((option) => (
                    <option
                      key={`${option.field}:${option.order}`}
                      value={`${option.field}:${option.order}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Source, e.g. vpn"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="User"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="Host"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                placeholder="Source IP"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                placeholder="Country code, e.g. CN"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={messageQuery}
                onChange={(event) => setMessageQuery(event.target.value)}
                placeholder="Message contains"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60 lg:col-span-2"
              />
              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Event ID
                </label>
                <textarea
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  placeholder="Paste up to 20 UUIDs, separated by commas"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 font-mono text-xs outline-none transition placeholder:font-sans placeholder:text-muted-foreground focus:border-cyan-300/60"
                />
                {eventIdLimitExceeded ? (
                  <p className="mt-1 text-xs text-amber-200">
                    Event ID filter supports at most {MAX_EVENT_ID_FILTERS} values.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSeverity([]);
                  setEventTypes([]);
                  setEventId("");
                  setSource("");
                  setUser("");
                  setHost("");
                  setIp("");
                  setCountryCode("");
                  setMessageQuery("");
                  setSearchSort("timestamp:desc");
                }}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={applySearchControls}
                disabled={eventIdLimitExceeded}
                className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

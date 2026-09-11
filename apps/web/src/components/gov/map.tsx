"use client";

/**
 * The operational map.
 *
 * Pins are grouped by village rather than scattered per report: forty reports
 * of one broken pipe are one fault at one place, and a map that draws them as
 * forty dots tells the officer the opposite of the truth. Each pin therefore
 * carries the number of distinct problems, sized by how many citizens reported
 * them, and coloured by the worst severity in the group.
 *
 * Leaflet is loaded on the client only, and the marker layer is rebuilt when
 * the filtered problem set changes so the map always agrees with the table
 * beside it.
 */

import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cx } from "@/components/ui";
import type { RankedProblem, Severity, Village } from "@/lib/gov/types";

export type MapGroup = {
  village: Village;
  problems: RankedProblem[];
  reports: number;
  worst: Severity;
};

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

const PIN_COLOR: Record<Severity, string> = {
  critical: "#c93e3a",
  high: "#e29448",
  medium: "#4f5fd8",
  low: "#2fae6a",
};

/** One pin per village that currently has matching problems. */
export function groupByVillage(problems: RankedProblem[], villages: Village[]): MapGroup[] {
  const byVillage = new Map<string, RankedProblem[]>();
  for (const p of problems) {
    for (const v of p.villageIds) {
      byVillage.set(v, [...(byVillage.get(v) ?? []), p]);
    }
  }
  return [...byVillage.entries()]
    .map(([villageId, list]) => {
      const village = villages.find((v) => v.id === villageId);
      if (!village) return null;
      const worst = list.reduce<Severity>(
        (acc, p) =>
          SEVERITY_ORDER.indexOf(p.severity) > SEVERITY_ORDER.indexOf(acc) ? p.severity : acc,
        "low",
      );
      return {
        village,
        problems: [...list].sort((a, b) => a.rank - b.rank),
        reports: list.reduce((sum, p) => sum + p.reportCount, 0),
        worst,
      };
    })
    .filter((g): g is MapGroup => g !== null)
    .sort((a, b) => b.reports - a.reports);
}

export function GovMap({
  problems,
  villages,
  selectedVillageId,
  onSelectVillage,
  className,
  height = 520,
}: {
  problems: RankedProblem[];
  villages: Village[];
  selectedVillageId?: string;
  onSelectVillage: (villageId: string) => void;
  className?: string;
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const select = useRef(onSelectVillage);
  const [ready, setReady] = useState(false);

  /* Marker handlers are bound once per redraw; the ref keeps them pointing at
     the latest callback without rebuilding the layer. */
  useEffect(() => {
    select.current = onSelectVillage;
  }, [onSelectVillage]);

  /* Create the map once. Leaflet touches `window`, so it is imported here
     rather than at module scope. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current || map.current) return;

      const instance = L.map(container.current, {
        center: [23.4, 85.29],
        zoom: 11,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(instance);

      layer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  /* Redraw the pins whenever the filtered set changes. */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !map.current || !layer.current) return;

      layer.current.clearLayers();
      const groups = groupByVillage(problems, villages);
      const maxReports = Math.max(...groups.map((g) => g.reports), 1);

      for (const g of groups) {
        const scale = 34 + Math.round((g.reports / maxReports) * 22);
        const selected = g.village.id === selectedVillageId;
        const color = PIN_COLOR[g.worst];

        const icon = L.divIcon({
          className: "",
          iconSize: [scale, scale],
          iconAnchor: [scale / 2, scale / 2],
          html: `
            <span
              role="button"
              tabindex="0"
              aria-label="${g.village.name}: ${g.problems.length} problems, ${g.reports} citizen reports, worst severity ${g.worst}"
              style="
                display:flex;align-items:center;justify-content:center;
                width:${scale}px;height:${scale}px;border-radius:999px;
                background:${color};color:#fff;font:700 ${scale > 46 ? 15 : 13}px/1 var(--font-sans, Inter, sans-serif);
                border:${selected ? 4 : 3}px solid ${selected ? "#191a2e" : "#ffffff"};
                box-shadow:0 8px 20px -8px rgb(25 26 46 / .45);
                font-variant-numeric:tabular-nums;cursor:pointer;
              ">${g.problems.length}</span>`,
        });

        L.marker([g.village.lat, g.village.lng], { icon, keyboard: true, title: g.village.name })
          .addTo(layer.current)
          .on("click", () => select.current(g.village.id))
          .on("keypress", () => select.current(g.village.id))
          .bindTooltip(
            `<strong>${g.village.name}</strong><br>${g.problems.length} problems · ${g.reports} reports`,
            { direction: "top", offset: [0, -scale / 2] },
          );
      }

      if (groups.length) {
        map.current.fitBounds(
          groups.map((g) => [g.village.lat, g.village.lng] as [number, number]),
          { padding: [56, 56], maxZoom: 13 },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [problems, villages, selectedVillageId, ready]);

  return (
    <div className={cx("relative overflow-hidden rounded-lg", className)}>
      <div
        aria-label="Map of problems by village"
        className="z-0 w-full bg-container"
        ref={container}
        role="application"
        style={{ height }}
      />
      {!ready ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
          Loading map…
        </p>
      ) : null}
      <ul className="pointer-events-none absolute right-3 bottom-3 z-[400] flex flex-col gap-1 rounded-md bg-card/95 p-3 shadow-level1">
        {SEVERITY_ORDER.slice()
          .reverse()
          .map((s) => (
            <li className="flex items-center gap-2 text-xs font-semibold text-ink" key={s}>
              <span className="size-3 rounded-full" style={{ background: PIN_COLOR[s] }} />
              <span className="capitalize">{s}</span>
            </li>
          ))}
        <li className="mt-1 max-w-40 text-[11px] leading-tight font-normal text-ink-muted">
          Pin size follows citizen report volume; the number is distinct problems.
        </li>
      </ul>
    </div>
  );
}

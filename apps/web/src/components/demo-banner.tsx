import { Icon } from "@/components/icon";

/**
 * Says out loud that a surface is running on fixtures.
 *
 * One surface left. Government, institute, the citizen intake and — as of this
 * stage — the industry portal all reach the real API; the student screens
 * still render from `lib/data.ts`. They look completely functional, which is
 * exactly the problem: a student can "apply" to an opportunity and the page
 * will congratulate them for something that was never written anywhere.
 *
 * Shipping them unlabelled would be the dishonest option and deleting them
 * would throw away thirteen finished screens. So they ship, and they say what
 * they are. The banner comes out the moment the surface is wired to its
 * endpoints — it is a statement about the data, not a permanent fixture. The
 * industry variant came out when the portal was wired; this one goes when the
 * student workspace is.
 */
export function DemoBanner({ surface }: { surface: "student" }) {
  const what =
    "Opportunities, projects, applications and achievements on these screens are sample data.";

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-tint px-4 py-3 text-on-warning-tint"
      role="status"
    >
      <span className="mt-px shrink-0">
        <Icon name="warning" size={18} />
      </span>
      <p className="text-sm leading-relaxed">
        <span className="font-semibold">Demonstration data.</span> {what} Nothing you
        do here is saved, and no figure on this surface describes a real
        organisation.
      </p>
    </div>
  );
}

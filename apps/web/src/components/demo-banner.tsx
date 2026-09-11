import { Icon } from "@/components/icon";

/**
 * Says out loud that a surface is running on fixtures.
 *
 * Three surfaces reach the real API — government, institute and the session
 * itself. Two do not: the industry portal is `USING_MOCK_DATA = true` end to
 * end, and the student screens render from `lib/data.ts`. Both look completely
 * functional, which is exactly the problem: a CSR officer can "approve" a
 * sponsorship and a student can "apply" to an opportunity, and the page will
 * congratulate them for something that was never written anywhere.
 *
 * Shipping them unlabelled would be the dishonest option, and deleting them
 * would throw away eighteen and thirteen finished screens. So they ship, and
 * they say what they are. The banner comes out the moment the surface is wired
 * to its endpoints — it is a statement about the data, not a permanent fixture.
 */
export function DemoBanner({ surface }: { surface: "industry" | "student" }) {
  const what =
    surface === "industry"
      ? "Challenges, funding, mentorship and CSR figures on this portal are sample data."
      : "Opportunities, projects, applications and achievements on these screens are sample data.";

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

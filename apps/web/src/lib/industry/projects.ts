/**
 * Co-development projects — what happens after a company commits.
 *
 * A project is the join between a validated challenge, a university team, a
 * government department and this company. It carries the milestones money is
 * released against, the pilot data that says whether the thing works, the
 * documents each party has shared, and the impact figures — which come from
 * citizen verification, not from a projection.
 *
 * The identifiers are `CDP-` rather than `PRJ-` deliberately: `PRJ-` belongs to
 * the government's own works contracts in `lib/gov`, and a partner reading two
 * different `PRJ-204`s on two screens would be right to distrust both.
 *
 * Every portfolio figure the screens report — ₹42.0 L deployed, 18,420 people,
 * 64 students, 37 problem clusters closed — is the sum of this array. None of
 * them is written down anywhere as a constant.
 */

import { d, inDays } from "./mock-data";
import type { AuditEntry, IndustryProject } from "./types";

/* Audit entries are written in the order they happened and read newest-first. */
function log(
  at: string,
  actor: AuditEntry["actor"],
  action: string,
  opts: { actorName?: string; detail?: string; automated?: boolean } = {},
): AuditEntry {
  return {
    id: `${at}-${action}`.replace(/[^a-z0-9]/gi, "").slice(0, 40),
    at,
    actor,
    actorName: opts.actorName,
    action,
    detail: opts.detail,
    automated: opts.automated ?? (actor === "AI" || actor === "System"),
  };
}

export const PROJECTS: IndustryProject[] = [
  /* ------------------------------------------------------------- CDP-101 */
  {
    id: "CDP-101",
    challengeId: "C-2126",
    title: "Field-portable fluoride screening for Palamu handpumps",
    stage: "pilot",
    progress: 72,
    universityId: "u-cuj",
    teamId: "t-nirmal",
    facultyId: "f-06",
    governmentBody: "Drinking Water & Sanitation Department, Palamu",
    governmentRole: "Owns the handpump register and accepts the test records",
    startedAt: d(96),
    expectedCompletion: inDays(74),
    investment: { committed: 480000, disbursed: 340000 },
    coFunders: [
      { id: "cf-101-a", party: "Jal Jeevan Mission (State share)", kind: "government", amount: 300000, status: "committed", at: d(120) },
      { id: "cf-101-b", party: "Nirvaha Technologies", kind: "industry", amount: 480000, status: "disbursed", at: d(96), isSelf: true },
    ],
    peopleImpacted: 2890,
    villages: 5,
    clustersClosed: 6,
    providing: ["fund", "mentor", "test", "technology"],
    sdgs: [3, 6, 9],
    milestones: [
      { id: "m-101-1", label: "Baseline survey", detail: "96 handpumps sampled against the district laboratory result, to establish where the kit has to agree.", status: "complete", percent: 100, dueAt: d(80), completedAt: d(82), deliverables: ["Baseline sampling report", "Handpump register extract"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 120000 },
      { id: "m-101-2", label: "Prototype kit", detail: "Six field-portable colorimetric pods with on-board logging and an SMS uplink.", status: "complete", percent: 100, dueAt: d(52), completedAt: d(49), deliverables: ["Bill of materials v3", "Enclosure drawings", "Firmware v1.2"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 120000 },
      { id: "m-101-3", label: "Field testing", detail: "Fourteen days of continuous readings across five villages, compared against manual gauge and district lab results.", status: "active", percent: 88, dueAt: d(4), deliverables: ["Field test report", "Temperature correction curve v3", "Node packet-loss log"], awaitingReview: true, trancheAmount: 140000 },
      { id: "m-101-4", label: "Pilot across the block", detail: "All 96 pumps on a monthly screening cycle, operated by the panchayat's own jal sahiya.", status: "pending", percent: 0, dueAt: inDays(34), deliverables: [], awaitingReview: false, trancheAmount: 60000 },
      { id: "m-101-5", label: "Handover & certification", detail: "District laboratory accepts the kit's records; two panchayat staff certified to operate it.", status: "pending", percent: 0, dueAt: inDays(74), deliverables: [], awaitingReview: false, trancheAmount: 40000 },
    ],
    pilot: {
      location: "Chainpur Block, Palamu District",
      villages: 5,
      durationDays: 60,
      dayOfPlan: 26,
      users: 1240,
      adoption: 81,
      reliability: 94,
      issues: [
        { id: "i-101-1", label: "Node 4 packet loss above 3% on the Manatu run", severity: "medium", open: true },
        { id: "i-101-2", label: "Colorimetric drift above 35 °C", severity: "high", open: false },
      ],
      feedback: [
        { quote: "Earlier we sent the sample to Daltonganj and heard nothing for two weeks. Now the reading comes the same morning and the jal sahiya writes it on the pump itself.", from: "Ward member", village: "Chainpur" },
        { quote: "Three pumps were marked unsafe. People were angry at first, and then the tanker started coming to those tolas.", from: "Anganwadi worker", village: "Tarhasi" },
      ],
      metrics: [
        { label: "Screening turnaround", value: "same day", target: "same day", met: true },
        { label: "Agreement with district lab", value: "±0.08 mg/L", target: "±0.15 mg/L", met: true },
        { label: "Pumps on a monthly cycle", value: "62 of 96", target: "96", met: false },
        { label: "Uptime", value: "94%", target: "90%", met: true },
      ],
    },
    documents: [
      { id: "doc-101-1", name: "CDP-101_field_test_report.pdf", kind: "report", sizeKb: 2840, at: d(4), by: "Team Nirmal", sharedWith: ["industry", "university", "government"] },
      { id: "doc-101-2", name: "temp_correction_curve_v3.pdf", kind: "data", sizeKb: 610, at: d(2), by: "Team Nirmal", sharedWith: ["industry", "university"] },
      { id: "doc-101-3", name: "Tranche_2_utilisation_certificate.pdf", kind: "financial", sizeKb: 340, at: d(46), by: "Central University of Jharkhand", sharedWith: ["industry", "university", "government"] },
      { id: "doc-101-4", name: "District_lab_concurrence_note.pdf", kind: "approval", sizeKb: 220, at: d(30), by: "Palamu District Laboratory", sharedWith: ["industry", "government"] },
      { id: "doc-101-5", name: "Departmental_cost_estimate_internal.pdf", kind: "financial", sizeKb: 190, at: d(110), by: "Drinking Water & Sanitation", sharedWith: ["government"] },
    ],
    impact: [
      { label: "People on a tested water source", value: 2890, unit: "people", baseline: 0, method: "Panchayat water register reconciled against kit test records, verified by the block office" },
      { label: "Screening turnaround", value: 1, unit: "days", baseline: 11, method: "Time from sample to result, measured against the district laboratory's 2025–26 mean" },
      { label: "Pumps found above the permissible limit", value: 21, unit: "pumps", method: "Kit readings confirmed by district laboratory re-test" },
    ],
    audit: [
      log(d(120), "System", "Challenge published to the marketplace", { detail: "Palamu district validation complete; industry response window opened" }),
      log(d(104), "Industry", "Expressed interest", { actorName: "Nirvaha Technologies" }),
      log(d(100), "Industry", "Funding proposal submitted", { actorName: "Nirvaha Technologies", detail: "₹4.80 L across five milestone tranches" }),
      log(d(98), "Officer", "Proposal approved", { actorName: "District administration, Palamu", detail: "Countersigned against Jal Jeevan Mission state share" }),
      log(d(96), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹4.80 L committed; project opened as CDP-101" }),
      log(d(96), "System", "University team assigned", { detail: "Team Nirmal, Central University of Jharkhand — 7 students, faculty mentor Dr. Shabnam Khatun" }),
      log(d(90), "Industry", "Mentors assigned", { actorName: "Nirvaha Technologies", detail: "Ananya Sengupta (hardware), Farah Ansari (certification & standards)" }),
      log(d(82), "Officer", "Milestone 1 approved", { actorName: "District administration, Palamu", detail: "Baseline survey accepted; ₹1.20 L tranche released" }),
      log(d(49), "Industry", "Milestone 2 approved", { actorName: "Nirvaha CSR Committee", detail: "Prototype kit accepted; ₹1.20 L tranche released" }),
      log(d(26), "System", "Pilot started", { detail: "Chainpur block, 5 villages, 60-day plan" }),
      log(d(4), "Citizen", "Milestone 3 submitted for review", { actorName: "Team Nirmal", detail: "Field-testing evidence uploaded; ₹1.40 L tranche held pending industry review", automated: false }),
    ],
  },

  /* ------------------------------------------------------------- CDP-102 */
  {
    id: "CDP-102",
    challengeId: "P-1051",
    title: "Solar street-lighting with fault telemetry, Booty Basti",
    stage: "impact",
    progress: 100,
    universityId: "u-nit",
    teamId: "t-roshni",
    facultyId: "f-03",
    governmentBody: "Electrical & Street Lighting, Nagri Gram Panchayat",
    governmentRole: "Takes ownership of the units at handover and holds the maintenance contract",
    startedAt: d(210),
    expectedCompletion: d(12),
    investment: { committed: 360000, disbursed: 288000 },
    coFunders: [
      { id: "cf-102-a", party: "Nirvaha Technologies", kind: "industry", amount: 360000, status: "disbursed", at: d(210), isSelf: true },
    ],
    peopleImpacted: 1980,
    villages: 2,
    clustersClosed: 5,
    providing: ["fund", "technology", "mentor", "deploy"],
    sdgs: [7, 11],
    milestones: [
      { id: "m-102-1", label: "Ward survey & load study", detail: "Eleven dark poles surveyed; existing wiring and pole condition assessed.", status: "complete", percent: 100, dueAt: d(190), completedAt: d(188), deliverables: ["Ward survey"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 60000 },
      { id: "m-102-2", label: "Controller prototype", detail: "Solar charge controller with GSM fault reporting, built at the NIT power electronics lab.", status: "complete", percent: 100, dueAt: d(150), completedAt: d(144), deliverables: ["Controller schematic", "Test bench results"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 90000 },
      { id: "m-102-3", label: "Field testing", detail: "Three units run for 45 nights through a monsoon, including two deliberate fault injections.", status: "complete", percent: 100, dueAt: d(96), completedAt: d(92), deliverables: ["45-night uptime log", "Fault injection report"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 90000 },
      { id: "m-102-4", label: "Full ward deployment", detail: "All eleven poles converted; telemetry backend handed to the panchayat.", status: "complete", percent: 100, dueAt: d(36), completedAt: d(34), deliverables: ["Commissioning certificate", "Maintenance protocol", "Spares list"], awaitingReview: false, reviewedBy: "Block Development Officer", trancheAmount: 48000 },
      { id: "m-102-5", label: "Handover & verification", detail: "Panchayat electrician certified; citizen verification closed.", status: "complete", percent: 100, dueAt: d(10), completedAt: d(12), deliverables: ["Handover certificate", "Citizen verification summary"], awaitingReview: false, reviewedBy: "Block Development Officer", trancheAmount: 72000 },
    ],
    documents: [
      { id: "doc-102-1", name: "Commissioning_certificate.pdf", kind: "approval", sizeKb: 280, at: d(34), by: "Electrical & Street Lighting", sharedWith: ["industry", "university", "government"] },
      { id: "doc-102-2", name: "Maintenance_protocol_v2.pdf", kind: "spec", sizeKb: 940, at: d(36), by: "Team Roshni", sharedWith: ["industry", "university", "government"] },
      { id: "doc-102-3", name: "Citizen_verification_summary.pdf", kind: "report", sizeKb: 460, at: d(12), by: "Nagri Gram Panchayat", sharedWith: ["industry", "government"] },
    ],
    impact: [
      { label: "People with lit streets after dark", value: 1980, unit: "people", baseline: 0, method: "Ward population within 60 m of a converted pole, confirmed by citizen verification of 87 original reporters" },
      { label: "Lit hours delivered", value: 97, unit: "% of dark hours", baseline: 31, method: "Controller uptime log over 90 days, against the pre-project complaint baseline" },
      { label: "Fault-to-repair time", value: 5, unit: "days", baseline: 42, method: "Telemetry ticket timestamps against the panchayat's 2025 complaint register" },
    ],
    audit: [
      log(d(224), "System", "Matched to your profile at 92%", { detail: "Energy theme, Jharkhand geography, solar & power electronics capability" }),
      log(d(216), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹3.60 L across five tranches" }),
      log(d(210), "System", "Project opened", { detail: "Team Roshni, NIT Jamshedpur — 6 students" }),
      log(d(180), "Industry", "Mentor assigned", { actorName: "Nirvaha Technologies", detail: "Sameer Toppo, field operations" }),
      log(d(34), "Officer", "Deployment accepted", { actorName: "Gram panchayat administration", detail: "Eleven poles commissioned" }),
      log(d(28), "Officer", "Handover approved", { actorName: "Block Development Officer", detail: "Ownership transferred to Nagri Gram Panchayat" }),
      log(d(12), "Citizen", "Verification closed", { actorName: "87 residents", detail: "84 confirmed the fix, 3 did not respond", automated: false }),
      log(d(1), "System", "Impact recomputed", { detail: "Confirmed beneficiaries revised 1,740 → 1,980 after two additional hamlets were surveyed" }),
    ],
  },

  /* ------------------------------------------------------------- CDP-103 */
  {
    id: "CDP-103",
    challengeId: "P-1046",
    title: "Drainage overflow early warning, Hesag market ward",
    stage: "pilot",
    progress: 64,
    universityId: "u-cuj",
    teamId: "t-tarang",
    facultyId: "f-07",
    governmentBody: "Solid Waste & Drainage, Nagri Gram Panchayat",
    governmentRole: "Owns the drain and acts on the warnings",
    startedAt: d(72),
    expectedCompletion: inDays(52),
    investment: { committed: 520000, disbursed: 312000 },
    coFunders: [
      { id: "cf-103-a", party: "Nirvaha Technologies", kind: "industry", amount: 520000, status: "disbursed", at: d(72), isSelf: true },
      { id: "cf-103-b", party: "Government of Jharkhand", kind: "government", amount: 520000, status: "committed", at: d(80) },
    ],
    peopleImpacted: 1650,
    villages: 1,
    clustersClosed: 4,
    providing: ["fund", "mentor", "technology"],
    sdgs: [6, 11, 13],
    milestones: [
      { id: "m-103-1", label: "Hydrology study", detail: "Two monsoons of rainfall and drain level reconstructed from ward records and IMD data.", status: "complete", percent: 100, dueAt: d(58), completedAt: d(60), deliverables: ["Hydrology note", "Historic level series"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 130000 },
      { id: "m-103-2", label: "Sensor & model prototype", detail: "Ultrasonic level sensors plus a first threshold model.", status: "complete", percent: 100, dueAt: d(30), completedAt: d(28), deliverables: ["Sensor build notes", "Model v1"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 130000 },
      { id: "m-103-3", label: "Field testing", detail: "A fortnight of live alerts, honestly reported: 31 raised, 4 real. The finding is the deliverable.", status: "changes_requested", percent: 70, dueAt: d(6), deliverables: ["Alert log", "False-positive analysis"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", reviewNote: "Accepted as evidence, not as a pass. Rework the trigger to require rate-of-rise as well as level before the pilot extends to the full ward.", trancheAmount: 130000 },
      { id: "m-103-4", label: "Pilot with the ward committee", detail: "Eleven households on the warning list, with a named person to act on each alert.", status: "active", percent: 40, dueAt: inDays(24), deliverables: [], awaitingReview: false, trancheAmount: 80000 },
      { id: "m-103-5", label: "Handover", detail: "Ward committee operates the alert list without the team present.", status: "pending", percent: 0, dueAt: inDays(52), deliverables: [], awaitingReview: false, trancheAmount: 50000 },
    ],
    pilot: {
      location: "Hesag market ward, Nagri Gram Panchayat",
      villages: 1,
      durationDays: 90,
      dayOfPlan: 34,
      users: 340,
      adoption: 62,
      reliability: 88,
      issues: [
        { id: "i-103-1", label: "False alarms during steady monsoon rain", severity: "high", open: true },
        { id: "i-103-2", label: "Sensor fouling from market waste", severity: "medium", open: true },
      ],
      feedback: [
        { quote: "The first week we moved everything upstairs four times for nothing. Now it warns less and we believe it more.", from: "Resident", village: "Hesag" },
        { quote: "Two hours is enough to move the grain sacks. Before this we found out when the water was at the door.", from: "Shopkeeper", village: "Hesag" },
      ],
      metrics: [
        { label: "False alarm rate", value: "38%", target: "under 20%", met: false },
        { label: "Warning lead time", value: "2h 10m", target: "2h", met: true },
        { label: "Households on the alert list", value: "11 of 11", target: "11", met: true },
        { label: "Sensor uptime", value: "88%", target: "90%", met: false },
      ],
    },
    documents: [
      { id: "doc-103-1", name: "False_positive_analysis.pdf", kind: "report", sizeKb: 1620, at: d(8), by: "Team Tarang", sharedWith: ["industry", "university", "government"] },
      { id: "doc-103-2", name: "Hesag_historic_level_series.csv", kind: "data", sizeKb: 4400, at: d(60), by: "Team Tarang", sharedWith: ["industry", "university"] },
      { id: "doc-103-3", name: "Ward_committee_alert_protocol.pdf", kind: "spec", sizeKb: 380, at: d(20), by: "Solid Waste & Drainage", sharedWith: ["industry", "government"] },
    ],
    impact: [
      { label: "Households with usable flood warning", value: 11, unit: "households", baseline: 0, method: "Alert delivery confirmed against the ward committee's flooding log" },
      { label: "Warning lead time", value: 130, unit: "minutes", baseline: 0, method: "Interval between alert and confirmed overflow, across 4 real events" },
    ],
    audit: [
      log(d(84), "System", "Matched to your profile at 84%", { detail: "Infrastructure domain, Jharkhand geography, IoT and data platform capability" }),
      log(d(78), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹5.20 L across five tranches" }),
      log(d(72), "System", "Project opened", { detail: "Team Tarang, Central University of Jharkhand — 8 students" }),
      log(d(15), "Industry", "Mentor assigned", { actorName: "Nirvaha Technologies", detail: "Rohit Mahato, data" }),
      log(d(6), "Industry", "Changes requested on milestone 3", { actorName: "Nirvaha CSR Committee", detail: "Trigger to require rate-of-rise as well as level" }),
    ],
  },

  /* ------------------------------------------------------------- CDP-104 */
  {
    id: "CDP-104",
    challengeId: "P-1008",
    title: "Roof repair and rainwater harvesting, Chandaghasi Middle School",
    stage: "prototype",
    progress: 35,
    universityId: "u-bit",
    teamId: "t-saksham",
    facultyId: "f-02",
    governmentBody: "Education & Health Infrastructure, Nagri Gram Panchayat",
    governmentRole: "Owns the school building and approves any structural work",
    startedAt: d(38),
    expectedCompletion: inDays(62),
    investment: { committed: 340000, disbursed: 102000 },
    coFunders: [
      { id: "cf-104-a", party: "Nirvaha Technologies", kind: "industry", amount: 340000, status: "committed", at: d(38), isSelf: true },
    ],
    peopleImpacted: 480,
    villages: 1,
    clustersClosed: 3,
    providing: ["fund", "mentor", "prototype", "deploy"],
    sdgs: [4, 6],
    milestones: [
      { id: "m-104-1", label: "Condition survey", detail: "Roof, gutter and tank surveyed; the tank failure traced to the same roof leak.", status: "complete", percent: 100, dueAt: d(24), completedAt: d(22), deliverables: ["Condition survey", "Photographic record"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 102000 },
      { id: "m-104-2", label: "Retrofit design", detail: "Three tap and ferrule options costed over their service life rather than their purchase price.", status: "active", percent: 60, dueAt: inDays(6), deliverables: ["Design options v2", "Cost-to-manufacture draft"], awaitingReview: true, trancheAmount: 68000 },
      { id: "m-104-3", label: "Build & install", detail: "Roof section replaced, gutter re-laid, 8,000 L tank returned to service.", status: "pending", percent: 0, dueAt: inDays(38), deliverables: [], awaitingReview: false, trancheAmount: 102000 },
      { id: "m-104-4", label: "Handover & verification", detail: "Headmaster's return confirms the classrooms and the tank are in use.", status: "pending", percent: 0, dueAt: inDays(62), deliverables: [], awaitingReview: false, trancheAmount: 68000 },
    ],
    documents: [
      { id: "doc-104-1", name: "Design_options_v2.pdf", kind: "spec", sizeKb: 3200, at: d(5), by: "Team Saksham", sharedWith: ["industry", "university"] },
      { id: "doc-104-2", name: "Condition_survey.pdf", kind: "report", sizeKb: 5100, at: d(22), by: "Team Saksham", sharedWith: ["industry", "university", "government"] },
      { id: "doc-104-3", name: "BDO_structural_clearance_pending.pdf", kind: "approval", sizeKb: 140, at: d(9), by: "Block Development Officer", sharedWith: ["government"] },
    ],
    impact: [
      { label: "Children in usable classrooms", value: 480, unit: "children", baseline: 0, method: "School enrolment for the two affected classrooms; counted only once the headmaster's return confirms use" },
    ],
    audit: [
      log(d(46), "System", "Matched to your profile at 89%", { detail: "Education theme, Jharkhand geography, water systems capability" }),
      log(d(42), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹3.40 L across four tranches" }),
      log(d(38), "System", "Project opened", { detail: "Team Saksham, BIT Mesra — 9 students" }),
      log(d(10), "Industry", "Mentors assigned", { actorName: "Nirvaha Technologies", detail: "Vikram Nair (product), Deepa Krishnan (manufacturing)" }),
      log(d(2), "System", "Structural clearance requested", { detail: "With the Block Development Officer since 9 days" }),
    ],
  },

  /* ------------------------------------------------------------- CDP-105 */
  {
    id: "CDP-105",
    challengeId: "P-1003",
    title: "Power resilience monitoring, Nagri Primary Health Centre",
    stage: "impact",
    progress: 100,
    universityId: "u-nit",
    teamId: "t-ujjwal",
    facultyId: "f-04",
    governmentBody: "Education & Health Infrastructure, Nagri Gram Panchayat",
    governmentRole: "Runs the PHC and holds the maintenance budget",
    startedAt: d(268),
    expectedCompletion: d(48),
    investment: { committed: 450000, disbursed: 450000 },
    coFunders: [
      { id: "cf-105-a", party: "Nirvaha Technologies", kind: "industry", amount: 450000, status: "disbursed", at: d(268), isSelf: true },
      { id: "cf-105-b", party: "Usha Martin Foundation", kind: "industry", amount: 200000, status: "disbursed", at: d(260) },
    ],
    peopleImpacted: 5200,
    villages: 2,
    clustersClosed: 6,
    providing: ["fund", "technology", "test"],
    sdgs: [3, 7, 9],
    milestones: [
      { id: "m-105-1", label: "Supply instrumentation", detail: "Mains, generator and battery bank instrumented to find out which one was actually failing.", status: "complete", percent: 100, dueAt: d(240), completedAt: d(238), deliverables: ["Instrumentation plan", "First month of logs"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 120000 },
      { id: "m-105-2", label: "Diagnosis", detail: "Battery state of health, not generator capacity — which changed the fix and the cost.", status: "complete", percent: 100, dueAt: d(200), completedAt: d(196), deliverables: ["Diagnosis report"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 90000 },
      { id: "m-105-3", label: "Remediation", detail: "Battery bank replaced and a state-of-health model put in front of the PHC manager.", status: "complete", percent: 100, dueAt: d(130), completedAt: d(126), deliverables: ["Replacement certificate", "SoH model"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 150000 },
      { id: "m-105-4", label: "Verification", detail: "Six months of delivery-room supply logs with no unbacked outage.", status: "complete", percent: 100, dueAt: d(50), completedAt: d(48), deliverables: ["Six-month supply log", "PHC incident register extract"], awaitingReview: false, reviewedBy: "Block Development Officer", trancheAmount: 90000 },
    ],
    documents: [
      { id: "doc-105-1", name: "Diagnosis_report.pdf", kind: "report", sizeKb: 2100, at: d(196), by: "Team Ujjwal", sharedWith: ["industry", "university", "government"] },
      { id: "doc-105-2", name: "Six_month_supply_log.csv", kind: "data", sizeKb: 8200, at: d(48), by: "Team Ujjwal", sharedWith: ["industry", "university", "government"] },
      { id: "doc-105-3", name: "Battery_replacement_certificate.pdf", kind: "financial", sizeKb: 190, at: d(126), by: "NIT Jamshedpur", sharedWith: ["industry", "government"] },
    ],
    impact: [
      { label: "People served by a PHC with reliable backup", value: 5200, unit: "people", baseline: 0, method: "PHC catchment population from the block health register, confirmed after six months without an unbacked outage" },
      { label: "Unbacked outages during deliveries", value: 0, unit: "per month", baseline: 3, method: "PHC incident register, six months after remediation against three months before" },
      { label: "Battery replacement warning", value: 34, unit: "days ahead", method: "State-of-health model prediction against the actual replacement date" },
    ],
    audit: [
      log(d(280), "System", "Matched to your profile at 94%", { detail: "Health theme, Jharkhand geography, power electronics capability" }),
      log(d(272), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹4.50 L; Usha Martin Foundation co-funded ₹2.00 L" }),
      log(d(268), "System", "Project opened", { detail: "Team Ujjwal, NIT Jamshedpur — 9 students" }),
      log(d(196), "Industry", "Diagnosis accepted", { actorName: "Nirvaha CSR Committee", detail: "Scope changed from generator replacement to battery bank — ₹6.2 L saved against the original estimate" }),
      log(d(48), "Officer", "Project closed", { actorName: "Gram panchayat administration", detail: "Six months verified without an unbacked outage" }),
    ],
  },

  /* ------------------------------------------------------------- CDP-106 */
  {
    id: "CDP-106",
    challengeId: "C-2101",
    title: "Solar cold room for the Ormanjhi vegetable belt",
    stage: "prototype",
    progress: 42,
    universityId: "u-bau",
    teamId: "t-anna",
    facultyId: "f-05",
    governmentBody: "Agriculture & Farmers' Welfare, Ranchi District",
    governmentRole: "Runs the farmer producer group and provides the collection point site",
    startedAt: d(112),
    expectedCompletion: inDays(68),
    investment: { committed: 640000, disbursed: 256000 },
    coFunders: [
      { id: "cf-106-a", party: "Nirvaha Technologies", kind: "industry", amount: 640000, status: "committed", at: d(112), isSelf: true },
    ],
    peopleImpacted: 1860,
    villages: 6,
    clustersClosed: 4,
    providing: ["fund", "mentor", "prototype", "partner"],
    sdgs: [2, 7, 12],
    milestones: [
      { id: "m-106-1", label: "Loss baseline", detail: "240 growers surveyed across one kharif season to establish what is actually lost and where.", status: "complete", percent: 100, dueAt: d(90), completedAt: d(88), deliverables: ["Post-harvest loss survey"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 128000 },
      { id: "m-106-2", label: "Cold room prototype", detail: "Solar-backed 5-tonne cold room holding 4 °C through an eight-hour outage.", status: "complete", percent: 100, dueAt: d(40), completedAt: d(36), deliverables: ["Thermal performance log", "Build drawings"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 128000 },
      { id: "m-106-3", label: "Cost reduction", detail: "Bring the unit from ₹2.4 L to under ₹1.6 L without losing the outage tolerance.", status: "active", percent: 45, dueAt: inDays(20), deliverables: ["Value engineering draft"], awaitingReview: false, trancheAmount: 192000 },
      { id: "m-106-4", label: "Field trial at two collection points", detail: "One season of real produce through the room, measured on the weighbridge.", status: "pending", percent: 0, dueAt: inDays(68), deliverables: [], awaitingReview: false, trancheAmount: 192000 },
    ],
    documents: [
      { id: "doc-106-1", name: "Post_harvest_loss_survey.pdf", kind: "report", sizeKb: 3600, at: d(88), by: "Team Anna", sharedWith: ["industry", "university", "government"] },
      { id: "doc-106-2", name: "Thermal_performance_log.csv", kind: "data", sizeKb: 2200, at: d(36), by: "Team Anna", sharedWith: ["industry", "university"] },
    ],
    impact: [
      { label: "Growers in the producer group", value: 1860, unit: "people", baseline: 0, method: "Farmer producer group membership across six villages; impact counted only once the field trial reports weighbridge data" },
    ],
    audit: [
      log(d(124), "System", "Matched to your profile at 81%", { detail: "Agriculture is adjacent to rural development; manufacturing and testing capability held" }),
      log(d(118), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹6.40 L across four tranches" }),
      log(d(112), "System", "Project opened", { detail: "Team Anna, Birsa Agricultural University — 10 students" }),
      log(d(9), "Citizen", "Mentorship requested", { actorName: "Team Anna", detail: "Manufacturing and go-to-market roles", automated: false }),
    ],
  },

  /* ------------------------------------------------------------- CDP-107 */
  {
    id: "CDP-107",
    challengeId: "C-2112",
    title: "Accessibility audit of Ranchi public buildings",
    stage: "research",
    progress: 22,
    universityId: "u-xiss",
    teamId: "t-samarth",
    facultyId: "f-08",
    governmentBody: "Ranchi Municipal Corporation",
    governmentRole: "Owns the buildings and will allocate the accessibility budget on the findings",
    startedAt: d(64),
    expectedCompletion: inDays(86),
    investment: { committed: 280000, disbursed: 84000 },
    coFunders: [
      { id: "cf-107-a", party: "Nirvaha Technologies", kind: "industry", amount: 280000, status: "committed", at: d(64), isSelf: true },
    ],
    peopleImpacted: 960,
    villages: 5,
    clustersClosed: 3,
    providing: ["fund", "mentor", "technology"],
    sdgs: [10, 11],
    milestones: [
      { id: "m-107-1", label: "Audit instrument", detail: "A survey instrument mapped onto the Harmonised Guidelines, usable by a student in an afternoon.", status: "active", percent: 65, dueAt: inDays(10), deliverables: ["Instrument draft v2"], awaitingReview: false, trancheAmount: 84000 },
      { id: "m-107-2", label: "Pilot audit, five wards", detail: "48 buildings surveyed to test whether the instrument produces a ranking the corporation will act on.", status: "pending", percent: 0, dueAt: inDays(44), deliverables: [], awaitingReview: false, trancheAmount: 98000 },
      { id: "m-107-3", label: "Full survey & handover", detail: "All 214 buildings, published as a ranked list the budget can be written against.", status: "pending", percent: 0, dueAt: inDays(86), deliverables: [], awaitingReview: false, trancheAmount: 98000 },
    ],
    documents: [
      { id: "doc-107-1", name: "Audit_instrument_v2.pdf", kind: "spec", sizeKb: 720, at: d(6), by: "Team Samarth", sharedWith: ["industry", "university"] },
    ],
    impact: [
      { label: "Registered disabled residents in the pilot wards", value: 960, unit: "people", baseline: 0, method: "RPwD district registration data for the five pilot wards; counted as reached once the corporation acts on the ranking" },
    ],
    audit: [
      log(d(72), "System", "Matched to your profile at 82%", { detail: "Accessibility is adjacent to education; software and training capability held" }),
      log(d(68), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹2.80 L across three tranches" }),
      log(d(64), "System", "Project opened", { detail: "Team Samarth, XISS Ranchi — 7 students" }),
      log(d(1.25), "Citizen", "Mentorship requested", { actorName: "Team Samarth", detail: "Product and regulatory roles — no mentor with free hours", automated: false }),
    ],
  },

  /* ------------------------------------------------------------- CDP-108 */
  {
    id: "CDP-108",
    challengeId: "P-1012",
    title: "Load rating and structural monitoring, Kanchi stream crossing",
    stage: "pilot",
    progress: 78,
    universityId: "u-bit",
    teamId: "t-prahari",
    facultyId: "f-02",
    governmentBody: "Rural Works Department, Ranchi Block",
    governmentRole: "Holds the load restriction and will write the repair estimate on this rating",
    startedAt: d(148),
    expectedCompletion: inDays(28),
    investment: { committed: 1130000, disbursed: 791000 },
    coFunders: [
      { id: "cf-108-a", party: "Nirvaha Technologies", kind: "industry", amount: 1130000, status: "disbursed", at: d(148), isSelf: true },
      { id: "cf-108-b", party: "Government of Jharkhand", kind: "government", amount: 1710000, status: "committed", at: d(160) },
    ],
    peopleImpacted: 3400,
    villages: 2,
    clustersClosed: 6,
    providing: ["fund", "technology", "test", "mentor"],
    sdgs: [9, 11],
    milestones: [
      { id: "m-108-1", label: "Instrumentation plan", detail: "Strain gauge and displacement positions agreed with the district engineer's office.", status: "complete", percent: 100, dueAt: d(130), completedAt: d(128), deliverables: ["Instrumentation plan", "District engineer concurrence"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 226000 },
      { id: "m-108-2", label: "Deck instrumentation", detail: "Fourteen gauges installed across the cracked panel and its two neighbours.", status: "complete", percent: 100, dueAt: d(96), completedAt: d(94), deliverables: ["Installation record", "Calibration certificates"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 339000 },
      { id: "m-108-3", label: "Load monitoring fortnight", detail: "Continuous strain under real traffic, including loaded tractor-trailers.", status: "complete", percent: 100, dueAt: d(20), completedAt: d(18), deliverables: ["14-day strain series", "Load spectrum analysis"], awaitingReview: false, reviewedBy: "Nirvaha CSR Committee", trancheAmount: 226000 },
      { id: "m-108-4", label: "Rating note", detail: "A load rating in the format the district engineer's office accepts without query.", status: "active", percent: 55, dueAt: inDays(10), deliverables: ["Rating note draft"], awaitingReview: true, trancheAmount: 226000 },
      { id: "m-108-5", label: "Handover to the repair estimate", detail: "Rating accepted and folded into the department's repair specification.", status: "pending", percent: 0, dueAt: inDays(28), deliverables: [], awaitingReview: false, trancheAmount: 113000 },
    ],
    pilot: {
      location: "Kanchi stream crossing, Tigra–Chandaghasi road",
      villages: 2,
      durationDays: 45,
      dayOfPlan: 38,
      users: 3400,
      adoption: 100,
      reliability: 97,
      issues: [
        { id: "i-108-1", label: "Gauge 9 lost to moisture ingress, replaced", severity: "low", open: false },
      ],
      feedback: [
        { quote: "The restriction means the tractor goes eleven kilometres round. Everyone wants to know when it lifts — at least now there is a date and a reason.", from: "Panchayat member", village: "Tigra" },
      ],
      metrics: [
        { label: "Gauge uptime", value: "97%", target: "95%", met: true },
        { label: "Load events captured", value: "1,842", target: "1,000", met: true },
        { label: "Peak strain vs 1998 design assumption", value: "+41%", target: "characterised", met: true },
      ],
    },
    documents: [
      { id: "doc-108-1", name: "14_day_strain_series.csv", kind: "data", sizeKb: 14200, at: d(18), by: "Team Prahari", sharedWith: ["industry", "university", "government"] },
      { id: "doc-108-2", name: "Load_spectrum_analysis.pdf", kind: "report", sizeKb: 4100, at: d(16), by: "Team Prahari", sharedWith: ["industry", "university", "government"] },
      { id: "doc-108-3", name: "District_engineer_concurrence.pdf", kind: "approval", sizeKb: 260, at: d(128), by: "Rural Works Department", sharedWith: ["industry", "government"] },
      { id: "doc-108-4", name: "Repair_tender_internal_estimate.pdf", kind: "financial", sizeKb: 310, at: d(40), by: "Rural Works Department", sharedWith: ["government"] },
    ],
    impact: [
      { label: "People whose direct route is restored", value: 3400, unit: "people", baseline: 0, method: "Village population served by the crossing; counted once the restriction lifts on the rated repair" },
      { label: "Detour removed", value: 11, unit: "km per trip", baseline: 11, method: "Block transport survey of the alternative route" },
    ],
    audit: [
      log(d(160), "System", "Matched to your profile at 81%", { detail: "Infrastructure is adjacent to rural development; instrumentation and testing capability held" }),
      log(d(154), "Industry", "Funding committed", { actorName: "Nirvaha Technologies", detail: "₹11.30 L alongside ₹17.10 L of government funding" }),
      log(d(148), "System", "Project opened", { detail: "Team Prahari, BIT Mesra — 8 students" }),
      log(d(18), "Citizen", "Load monitoring completed", { actorName: "Team Prahari", detail: "1,842 load events over 14 days", automated: false }),
      log(d(6), "Citizen", "Rating note submitted for review", { actorName: "Team Prahari", automated: false }),
    ],
  },
];

export function findProject(id: string): IndustryProject | undefined {
  return PROJECTS.find((p) => p.id === id);
}

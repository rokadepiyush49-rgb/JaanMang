/**
 * Seed data for the industry portal — the organisation side.
 *
 * The company, the universities, the people and the machinery that runs in the
 * background. Challenges live in `challenges.ts` and delivery in
 * `projects.ts`, because those two read from the government fixture and this
 * one does not.
 *
 * Everything is set in Jharkhand, Odisha and Maharashtra — the three states the
 * signed-in company is registered to deploy in — and every institution is a
 * real one from that geography, because a partner evaluating "which university
 * could build this?" learns nothing from "University 1".
 *
 * The company itself is invented. Attaching a specific CSR ledger, specific
 * commitments and a specific leaderboard position to a real firm would be
 * making up records about somebody who exists.
 */

import type {
  CompanyProfile,
  EmployeeMentor,
  Faculty,
  IndustryAutomation,
  IndustryAlert,
  LeaderboardEntry,
  MentorAssignment,
  MentorshipRequest,
  MessageThread,
  MonthPoint,
  Sdg,
  StudentTeam,
  SupportKind,
  SupportMeta,
  University,
} from "./types";

/* Fixed clock, as in the government fixture, so response windows, session
   dates and audit trails stay coherent with one another. */
const T = Date.now();
export const h = (hours: number) => new Date(T - hours * 36e5).toISOString();
export const ahead = (hours: number) => new Date(T + hours * 36e5).toISOString();
export const d = (days: number) => h(days * 24);
export const inDays = (days: number) => ahead(days * 24);

/* =============================================================== sdgs === */

export const SDGS: Sdg[] = [
  { number: 3, title: "Good Health and Well-being", short: "Health" },
  { number: 4, title: "Quality Education", short: "Education" },
  { number: 6, title: "Clean Water and Sanitation", short: "Clean Water" },
  { number: 7, title: "Affordable and Clean Energy", short: "Clean Energy" },
  { number: 9, title: "Industry, Innovation and Infrastructure", short: "Industry & Innovation" },
  { number: 10, title: "Reduced Inequalities", short: "Reduced Inequalities" },
  { number: 11, title: "Sustainable Cities and Communities", short: "Sustainable Communities" },
  { number: 12, title: "Responsible Consumption and Production", short: "Responsible Production" },
  { number: 13, title: "Climate Action", short: "Climate Action" },
  { number: 17, title: "Partnerships for the Goals", short: "Partnerships" },
];

export function sdg(n: number): Sdg {
  return SDGS.find((s) => s.number === n) ?? { number: n, title: `SDG ${n}`, short: `SDG ${n}` };
}

/* ====================================================== support kinds === */

/**
 * The seven contributions, each named for what the company actually hands over.
 *
 * They are ordered the way a partnership tends to deepen — money is the easiest
 * to give and the first listed, and everything after it costs the company
 * attention rather than budget.
 */
export const SUPPORT: Record<SupportKind, SupportMeta> = {
  fund: {
    kind: "fund",
    label: "Fund",
    gives: "CSR or innovation capital",
    icon: "banknote",
    blurb: "Sponsor the build, tied to milestones the government countersigns.",
  },
  mentor: {
    kind: "mentor",
    label: "Mentor",
    gives: "Engineering hours",
    icon: "users",
    blurb: "Put your engineers in the student team's design reviews.",
  },
  technology: {
    kind: "technology",
    label: "Technology",
    gives: "Hardware, software, cloud",
    icon: "code",
    blurb: "Contribute gateways, sensors, licences or platform credits.",
  },
  prototype: {
    kind: "prototype",
    label: "Prototype",
    gives: "Fabrication & lab access",
    icon: "bulb",
    blurb: "Open your workshop for enclosure, PCB and assembly runs.",
  },
  test: {
    kind: "test",
    label: "Test",
    gives: "Calibration & QA rigs",
    icon: "gauge",
    blurb: "Validate the prototype against instruments a campus lab lacks.",
  },
  deploy: {
    kind: "deploy",
    label: "Deploy",
    gives: "Field crews & logistics",
    icon: "map-pin",
    blurb: "Install, commission and maintain in the villages themselves.",
  },
  partner: {
    kind: "partner",
    label: "Co-develop",
    gives: "Joint IP & productisation",
    icon: "share",
    blurb: "Take the prototype to a product the state can procure at scale.",
  },
};

/* ============================================================ company === */

export const COMPANY: CompanyProfile = {
  id: "co-nirvaha",
  name: "Nirvaha Technologies",
  legalName: "Nirvaha Technologies Ltd.",
  sector: "Industrial IoT & Water Infrastructure",
  about:
    "Nirvaha builds instrumentation and telemetry for public utilities — pumping stations, distribution networks, micro-grids and treatment plants. Its CSR arm backs student-built civic technology in the districts where its field crews already operate.",
  headquarters: "Jamshedpur, Jharkhand",
  employees: 2140,
  /* Deliberately narrower than the company's marketing would claim. AI/ML,
     hydraulic modelling and certification are genuine gaps, and the match
     engine is allowed to say so — a partner who is told they are a perfect fit
     for everything stops reading the score. */
  technologyDomains: [
    "IoT & Telemetry",
    "LoRaWAN",
    "Water Systems",
    "Sensors & Instrumentation",
    "Embedded Systems",
    "Cloud & Data Platforms",
    "Solar & Power Electronics",
    "GIS",
  ],
  csrThemes: ["water", "rural", "education", "health", "environment"],
  geographies: ["Jharkhand", "Odisha", "Maharashtra"],
  sdgPreferences: [6, 9, 11, 17],
  capabilities: [
    "hardware",
    "software",
    "manufacturing",
    "testing",
    "field-deployment",
    "logistics",
    "training",
  ],
  fundingRange: { min: 150000, max: 2500000 },
  targetCommunities: [
    "Gram panchayats under the Jal Jeevan Mission",
    "Scheduled-tribe majority villages",
    "Aspirational districts",
    "Government schools & anganwadi centres",
  ],
  provenDomains: ["water", "rural", "energy"],
  csrBudget: {
    financialYear: "FY 2026–27",
    allocated: 12000000,
    committedElsewhere: 3200000,
    disbursed: 4200000,
    preferredProjectCeiling: 2500000,
    allocation: [
      { domain: "education", share: 32 },
      { domain: "health", share: 21 },
      { domain: "water", share: 18 },
      { domain: "rural", share: 16 },
      { domain: "environment", share: 13 },
    ],
  },
  mentors: [
    {
      id: "m-01",
      name: "Ananya Sengupta",
      title: "Principal Engineer, Telemetry",
      unit: "Platform Engineering",
      roles: ["iot", "hardware", "data"],
      hoursPerMonth: 8,
      activeTeams: 2,
      languages: ["English", "Hindi", "Bengali"],
    },
    {
      id: "m-02",
      name: "Vikram Nair",
      title: "Head of Product, Utilities",
      unit: "Product",
      roles: ["product", "go-to-market"],
      hoursPerMonth: 6,
      activeTeams: 1,
      languages: ["English", "Hindi", "Malayalam"],
    },
    {
      id: "m-03",
      name: "Sameer Toppo",
      title: "Manager, Field Operations — Jharkhand",
      unit: "Deployment",
      roles: ["field-ops", "regulatory"],
      hoursPerMonth: 10,
      activeTeams: 2,
      languages: ["Hindi", "Nagpuri", "Kurukh"],
    },
    {
      id: "m-04",
      name: "Deepa Krishnan",
      title: "Lead, Manufacturing Engineering",
      unit: "Operations",
      roles: ["manufacturing", "hardware"],
      hoursPerMonth: 6,
      activeTeams: 1,
      languages: ["English", "Tamil", "Hindi"],
    },
    {
      id: "m-05",
      name: "Rohit Mahato",
      title: "Senior Data Scientist",
      unit: "Data & AI",
      roles: ["data", "product"],
      hoursPerMonth: 8,
      activeTeams: 0,
      languages: ["Hindi", "English"],
    },
    {
      id: "m-06",
      name: "Farah Ansari",
      title: "Compliance & Standards Lead",
      unit: "Quality",
      roles: ["regulatory", "manufacturing"],
      hoursPerMonth: 4,
      activeTeams: 0,
      languages: ["English", "Hindi", "Urdu"],
    },
  ] satisfies EmployeeMentor[],
};

/* ======================================================== universities === */

export const UNIVERSITIES: University[] = [
  {
    id: "u-bit",
    name: "Birla Institute of Technology, Mesra",
    shortName: "BIT Mesra",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "NAAC A+ · Deemed University",
    focusAreas: ["Electronics & Communication", "Civil Engineering", "Remote Sensing"],
    labs: ["Embedded Systems Lab", "Water Resources Lab", "Geoinformatics Centre"],
    activeProjects: 2,
    studentsEngaged: 15,
    facultyCount: 4,
    deliveryScore: 92,
    since: "2024",
  },
  {
    id: "u-nit",
    name: "National Institute of Technology, Jamshedpur",
    shortName: "NIT Jamshedpur",
    city: "Jamshedpur",
    state: "Jharkhand",
    accreditation: "NIRF Engineering Top 100 · Institute of National Importance",
    focusAreas: ["Electrical Engineering", "Production Engineering", "Energy Systems"],
    labs: ["Power Electronics Lab", "Renewable Energy Lab", "Fabrication Workshop"],
    activeProjects: 2,
    studentsEngaged: 16,
    facultyCount: 3,
    deliveryScore: 88,
    since: "2024",
  },
  {
    id: "u-bau",
    name: "Birsa Agricultural University",
    shortName: "BAU Ranchi",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "ICAR accredited State Agricultural University",
    focusAreas: ["Agricultural Engineering", "Post-Harvest Technology", "Soil Science"],
    labs: ["Post-Harvest Lab", "Micro-Irrigation Field Station"],
    activeProjects: 1,
    studentsEngaged: 10,
    facultyCount: 3,
    deliveryScore: 84,
    since: "2025",
  },
  {
    id: "u-cuj",
    name: "Central University of Jharkhand",
    shortName: "CUJ",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "Central University · NAAC A",
    focusAreas: ["Environmental Sciences", "Water Engineering", "Public Health"],
    labs: ["Environmental Analytics Lab", "Community Health Field Unit"],
    activeProjects: 2,
    studentsEngaged: 14,
    facultyCount: 3,
    deliveryScore: 86,
    since: "2025",
  },
  {
    id: "u-xiss",
    name: "Xavier Institute of Social Service",
    shortName: "XISS Ranchi",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "AICTE approved · Autonomous",
    focusAreas: ["Rural Management", "Disability & Inclusion", "Impact Assessment"],
    labs: ["Community Research Unit", "Accessibility Audit Cell"],
    activeProjects: 1,
    studentsEngaged: 9,
    facultyCount: 2,
    deliveryScore: 90,
    since: "2025",
  },
  {
    id: "u-iiit",
    name: "Indian Institute of Information Technology, Ranchi",
    shortName: "IIIT Ranchi",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "Institute of National Importance",
    focusAreas: ["Computer Science", "Applied AI", "Human-Computer Interaction"],
    labs: ["Applied AI Lab", "Accessible Computing Group"],
    activeProjects: 0,
    studentsEngaged: 0,
    facultyCount: 2,
    deliveryScore: 0,
    since: "2026",
  },
  {
    id: "u-nifft",
    name: "National Institute of Advanced Manufacturing Technology, Ranchi",
    shortName: "NIAMT Ranchi",
    city: "Ranchi",
    state: "Jharkhand",
    accreditation: "Institute of National Importance",
    focusAreas: ["Manufacturing", "Materials", "Foundry Technology"],
    labs: ["Precision Machining Cell", "Materials Testing Lab"],
    activeProjects: 0,
    studentsEngaged: 0,
    facultyCount: 1,
    deliveryScore: 0,
    since: "2026",
  },
  {
    id: "u-vjti",
    name: "Veermata Jijabai Technological Institute",
    shortName: "VJTI Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    accreditation: "Autonomous · NAAC A",
    focusAreas: ["Civil Engineering", "Instrumentation", "Structural Health Monitoring"],
    labs: ["Hydraulics Lab", "Instrumentation Lab"],
    activeProjects: 0,
    studentsEngaged: 0,
    facultyCount: 2,
    deliveryScore: 0,
    since: "2026",
  },
];

export const FACULTY: Faculty[] = [
  { id: "f-01", name: "Dr. Anjali Prasad", designation: "Associate Professor, Electronics & Communication", universityId: "u-bit", expertise: ["Embedded systems", "LoRaWAN", "Sensor networks"] },
  { id: "f-02", name: "Dr. Nilesh Kachhap", designation: "Assistant Professor, Civil Engineering", universityId: "u-bit", expertise: ["Water distribution networks", "Hydraulic modelling"] },
  { id: "f-03", name: "Dr. Sanjay Mahto", designation: "Professor, Electrical Engineering", universityId: "u-nit", expertise: ["Power electronics", "Solar micro-grids"] },
  { id: "f-04", name: "Dr. Ritu Verma", designation: "Assistant Professor, Production Engineering", universityId: "u-nit", expertise: ["Design for manufacture", "Reliability testing"] },
  { id: "f-05", name: "Dr. Manoj Oraon", designation: "Professor, Post-Harvest Technology", universityId: "u-bau", expertise: ["Cold chain", "Solar refrigeration"] },
  { id: "f-06", name: "Dr. Shabnam Khatun", designation: "Associate Professor, Environmental Sciences", universityId: "u-cuj", expertise: ["Water quality", "Fluoride & heavy metals"] },
  { id: "f-07", name: "Dr. Alok Bhengra", designation: "Assistant Professor, Public Health", universityId: "u-cuj", expertise: ["Community health systems", "Field epidemiology"] },
  { id: "f-08", name: "Dr. Grace Lakra", designation: "Associate Professor, Rural Management", universityId: "u-xiss", expertise: ["Accessibility audit", "Impact assessment"] },
  { id: "f-09", name: "Dr. Prakash Ekka", designation: "Assistant Professor, Applied AI", universityId: "u-iiit", expertise: ["Computer vision", "Assistive technology"] },
];


/* ============================================================== teams === */

/**
 * Student teams as an industry partner is permitted to see them.
 *
 * First name, year and discipline — enough to hold a design review with the
 * right person in the room, and not enough to identify or approach a student
 * outside the platform. Surnames, contact details and marks are not shared with
 * industry at any stage of a project.
 */
export const TEAMS: StudentTeam[] = [
  {
    id: "t-dhara",
    name: "Team Dhara",
    universityId: "u-bit",
    facultyId: "f-01",
    memberCount: 8,
    members: [
      { firstName: "Ritesh", year: "B.Tech 4th year", discipline: "Electronics & Communication" },
      { firstName: "Sunidhi", year: "B.Tech 4th year", discipline: "Electronics & Communication" },
      { firstName: "Amrit", year: "B.Tech 3rd year", discipline: "Computer Science" },
      { firstName: "Pooja", year: "B.Tech 3rd year", discipline: "Civil Engineering" },
      { firstName: "Nikhil", year: "M.Tech 1st year", discipline: "Embedded Systems" },
      { firstName: "Kavita", year: "B.Tech 3rd year", discipline: "Electronics & Communication" },
      { firstName: "Sourav", year: "B.Tech 4th year", discipline: "Mechanical Engineering" },
      { firstName: "Anjali", year: "M.Tech 2nd year", discipline: "Water Resources" },
    ],
    skills: ["LoRaWAN", "Pressure & flow sensing", "Firmware", "Field installation"],
    stage: "prototype",
    mentorRolesWanted: ["iot", "product"],
  },
  {
    id: "t-nirmal",
    name: "Team Nirmal",
    universityId: "u-cuj",
    facultyId: "f-06",
    memberCount: 7,
    members: [
      { firstName: "Shalini", year: "M.Sc 2nd year", discipline: "Environmental Science" },
      { firstName: "Deepak", year: "M.Sc 2nd year", discipline: "Environmental Science" },
      { firstName: "Rani", year: "B.Sc 3rd year", discipline: "Chemistry" },
      { firstName: "Imran", year: "M.Tech 1st year", discipline: "Water Engineering" },
      { firstName: "Sneha", year: "B.Sc 3rd year", discipline: "Biotechnology" },
      { firstName: "Vivek", year: "M.Sc 1st year", discipline: "Environmental Science" },
      { firstName: "Prerna", year: "M.Sc 1st year", discipline: "Analytical Chemistry" },
    ],
    skills: ["Spectrophotometry", "Water sampling protocol", "Data validation"],
    stage: "pilot",
    mentorRolesWanted: ["hardware", "regulatory"],
  },
  {
    id: "t-roshni",
    name: "Team Roshni",
    universityId: "u-nit",
    facultyId: "f-03",
    memberCount: 6,
    members: [
      { firstName: "Manish", year: "B.Tech 4th year", discipline: "Electrical Engineering" },
      { firstName: "Fatima", year: "B.Tech 4th year", discipline: "Electrical Engineering" },
      { firstName: "Rahul", year: "B.Tech 3rd year", discipline: "Electronics" },
      { firstName: "Sweta", year: "M.Tech 1st year", discipline: "Power Systems" },
      { firstName: "Arjun", year: "B.Tech 3rd year", discipline: "Electrical Engineering" },
      { firstName: "Neha", year: "B.Tech 4th year", discipline: "Computer Science" },
    ],
    skills: ["Solar charge controllers", "GSM telemetry", "Fault detection"],
    stage: "impact",
    mentorRolesWanted: [],
  },
  {
    id: "t-saksham",
    name: "Team Saksham",
    universityId: "u-bit",
    facultyId: "f-02",
    memberCount: 9,
    members: [
      { firstName: "Karan", year: "B.Tech 4th year", discipline: "Civil Engineering" },
      { firstName: "Meera", year: "B.Tech 4th year", discipline: "Civil Engineering" },
      { firstName: "Zaid", year: "B.Tech 3rd year", discipline: "Electronics" },
      { firstName: "Ishita", year: "M.Tech 1st year", discipline: "Structural Engineering" },
      { firstName: "Gaurav", year: "B.Tech 3rd year", discipline: "Civil Engineering" },
      { firstName: "Ankita", year: "B.Tech 4th year", discipline: "Computer Science" },
      { firstName: "Suresh", year: "M.Tech 2nd year", discipline: "Water Resources" },
      { firstName: "Bhavna", year: "B.Tech 3rd year", discipline: "Civil Engineering" },
      { firstName: "Tarun", year: "B.Tech 4th year", discipline: "Mechanical Engineering" },
    ],
    skills: ["Rainwater harvesting design", "Plumbing retrofit", "Community survey"],
    stage: "prototype",
    mentorRolesWanted: ["product", "manufacturing"],
  },
  {
    id: "t-tarang",
    name: "Team Tarang",
    universityId: "u-cuj",
    facultyId: "f-07",
    memberCount: 8,
    members: [
      { firstName: "Prakash", year: "M.Sc 2nd year", discipline: "Public Health" },
      { firstName: "Sarita", year: "M.Sc 1st year", discipline: "Public Health" },
      { firstName: "Aman", year: "B.Tech 4th year", discipline: "Computer Science" },
      { firstName: "Jyoti", year: "M.Sc 2nd year", discipline: "Environmental Science" },
      { firstName: "Ravi", year: "B.Sc 3rd year", discipline: "Statistics" },
      { firstName: "Nasreen", year: "M.Sc 1st year", discipline: "Public Health" },
      { firstName: "Vinod", year: "B.Tech 3rd year", discipline: "Electronics" },
      { firstName: "Lata", year: "M.Sc 2nd year", discipline: "Nutrition" },
    ],
    skills: ["Drainage hydrology", "Early-warning logic", "Community reporting"],
    stage: "pilot",
    mentorRolesWanted: ["data", "iot"],
  },
  {
    id: "t-anna",
    name: "Team Anna",
    universityId: "u-bau",
    facultyId: "f-05",
    memberCount: 10,
    members: [
      { firstName: "Sudhir", year: "M.Tech 2nd year", discipline: "Agricultural Engineering" },
      { firstName: "Rekha", year: "B.Tech 4th year", discipline: "Agricultural Engineering" },
      { firstName: "Firoz", year: "B.Tech 3rd year", discipline: "Food Technology" },
      { firstName: "Nandini", year: "M.Sc 1st year", discipline: "Post-Harvest Technology" },
      { firstName: "Ashok", year: "B.Tech 4th year", discipline: "Mechanical Engineering" },
      { firstName: "Pinky", year: "B.Tech 3rd year", discipline: "Agricultural Engineering" },
      { firstName: "Devendra", year: "M.Tech 1st year", discipline: "Renewable Energy" },
      { firstName: "Sabina", year: "B.Sc 3rd year", discipline: "Horticulture" },
      { firstName: "Mukesh", year: "B.Tech 4th year", discipline: "Electrical Engineering" },
      { firstName: "Chandni", year: "M.Sc 2nd year", discipline: "Food Technology" },
    ],
    skills: ["Solar refrigeration", "Cold-chain logistics", "Farmer producer groups"],
    stage: "prototype",
    mentorRolesWanted: ["manufacturing", "go-to-market"],
  },
  {
    id: "t-samarth",
    name: "Team Samarth",
    universityId: "u-xiss",
    facultyId: "f-08",
    memberCount: 7,
    members: [
      { firstName: "Bipin", year: "MA 2nd year", discipline: "Rural Management" },
      { firstName: "Anushka", year: "MA 2nd year", discipline: "Development Studies" },
      { firstName: "Hemant", year: "MA 1st year", discipline: "Rural Management" },
      { firstName: "Salma", year: "MA 1st year", discipline: "Social Work" },
      { firstName: "Kunal", year: "B.Tech 4th year", discipline: "Computer Science" },
      { firstName: "Roshni", year: "MA 2nd year", discipline: "Disability Studies" },
      { firstName: "Tanmay", year: "MA 1st year", discipline: "Development Studies" },
    ],
    skills: ["Accessibility audit", "GIS mapping", "Participatory survey"],
    stage: "research",
    mentorRolesWanted: ["product", "regulatory"],
  },
  {
    id: "t-ujjwal",
    name: "Team Ujjwal",
    universityId: "u-nit",
    facultyId: "f-04",
    memberCount: 9,
    members: [
      { firstName: "Sanjeev", year: "B.Tech 4th year", discipline: "Production Engineering" },
      { firstName: "Priyanka", year: "B.Tech 4th year", discipline: "Electrical Engineering" },
      { firstName: "Aslam", year: "B.Tech 3rd year", discipline: "Electronics" },
      { firstName: "Divya", year: "M.Tech 1st year", discipline: "Energy Systems" },
      { firstName: "Nitin", year: "B.Tech 3rd year", discipline: "Mechanical Engineering" },
      { firstName: "Shreya", year: "B.Tech 4th year", discipline: "Computer Science" },
      { firstName: "Basant", year: "M.Tech 2nd year", discipline: "Power Systems" },
      { firstName: "Alisha", year: "B.Tech 3rd year", discipline: "Electrical Engineering" },
      { firstName: "Om", year: "B.Tech 4th year", discipline: "Instrumentation" },
    ],
    skills: ["Load monitoring", "Battery health", "Remote diagnostics"],
    stage: "impact",
    mentorRolesWanted: [],
  },
  {
    id: "t-prahari",
    name: "Team Prahari",
    universityId: "u-bit",
    facultyId: "f-02",
    memberCount: 8,
    members: [
      { firstName: "Rohit", year: "M.Tech 2nd year", discipline: "Structural Engineering" },
      { firstName: "Nusrat", year: "B.Tech 4th year", discipline: "Civil Engineering" },
      { firstName: "Vishal", year: "B.Tech 4th year", discipline: "Civil Engineering" },
      { firstName: "Kirti", year: "M.Tech 1st year", discipline: "Structural Engineering" },
      { firstName: "Abhay", year: "B.Tech 3rd year", discipline: "Electronics" },
      { firstName: "Sunita", year: "B.Tech 3rd year", discipline: "Civil Engineering" },
      { firstName: "Danish", year: "B.Tech 4th year", discipline: "Instrumentation" },
      { firstName: "Preeti", year: "M.Tech 2nd year", discipline: "Geotechnical Engineering" },
    ],
    skills: ["Strain gauging", "Structural health monitoring", "Load rating"],
    stage: "pilot",
    mentorRolesWanted: ["hardware"],
  },
];

/* ========================================================= mentorship === */

/**
 * What university teams have asked industry for.
 *
 * Each request names the thing the team is actually stuck on. A request that
 * says only "looking for an IoT mentor" tells an engineer nothing about whether
 * they are the right engineer, so the platform makes the team say why.
 */
export const MENTORSHIP_REQUESTS: MentorshipRequest[] = [
  {
    id: "mr-01",
    challengeId: "P-1042",
    teamId: "t-dhara",
    universityId: "u-bit",
    roles: ["iot", "product"],
    hoursPerMonth: 8,
    stage: "prototype",
    askedAt: d(4),
    need: "Six pressure nodes work on the bench and lose packets past 800 m on the Hesag feeder. The team needs someone who has run a real LoRaWAN deployment, and a product review before they commit to an enclosure.",
  },
  {
    id: "mr-02",
    challengeId: "C-2126",
    projectId: "CDP-101",
    teamId: "t-nirmal",
    universityId: "u-cuj",
    roles: ["hardware", "regulatory"],
    hoursPerMonth: 6,
    stage: "testing",
    askedAt: d(30),
    need: "Colorimetric readings drift above 35 °C, and nobody on the team has read BIS 10500 closely enough to know what a district lab will accept from a field kit.",
  },
  {
    id: "mr-03",
    challengeId: "P-1051",
    projectId: "CDP-102",
    teamId: "t-roshni",
    universityId: "u-nit",
    roles: ["field-ops"],
    hoursPerMonth: 6,
    stage: "deployment",
    askedAt: d(44),
    need: "Handover to the panchayat electrician needs a maintenance protocol and a spares list the team has never had to write.",
  },
  {
    id: "mr-04",
    challengeId: "P-1008",
    projectId: "CDP-104",
    teamId: "t-saksham",
    universityId: "u-bit",
    roles: ["product", "manufacturing"],
    hoursPerMonth: 8,
    stage: "prototype",
    askedAt: d(12),
    need: "Three competing tap-retrofit designs and no basis to choose between them. The team needs a product review and a cost-to-manufacture read.",
  },
  {
    id: "mr-05",
    challengeId: "P-1046",
    projectId: "CDP-103",
    teamId: "t-tarang",
    universityId: "u-cuj",
    roles: ["data", "iot"],
    hoursPerMonth: 6,
    stage: "pilot",
    askedAt: d(18),
    need: "The overflow model fired 31 alerts in a fortnight and only 4 were real. Residents stopped reading them. The team wants help tuning against historic rainfall.",
  },
  {
    id: "mr-06",
    challengeId: "C-2101",
    projectId: "CDP-106",
    teamId: "t-anna",
    universityId: "u-bau",
    roles: ["manufacturing", "go-to-market"],
    hoursPerMonth: 8,
    stage: "prototype",
    askedAt: d(9),
    need: "The solar cold-room holds temperature but costs ₹2.4 L a unit. The team needs a manufacturing engineer to find the ₹80,000 of that which is design rather than physics.",
  },
  {
    id: "mr-07",
    challengeId: "C-2112",
    projectId: "CDP-107",
    teamId: "t-samarth",
    universityId: "u-xiss",
    roles: ["product", "regulatory"],
    hoursPerMonth: 4,
    stage: "research",
    askedAt: h(30),
    need: "The audit instrument has to map onto the Harmonised Guidelines and the RPwD Act before the municipal corporation will accept its findings.",
  },
];

export const MENTOR_ASSIGNMENTS: MentorAssignment[] = [
  {
    id: "ma-01",
    requestId: "mr-02",
    mentorId: "m-01",
    teamId: "t-nirmal",
    projectId: "CDP-101",
    roles: ["hardware"],
    since: d(26),
    sessions: [
      { id: "s-1", at: d(21), topic: "Enclosure thermal behaviour and sensor placement", mentorId: "m-01", minutes: 60, done: true },
      { id: "s-2", at: d(9), topic: "Firmware review — sampling schedule and power budget", mentorId: "m-01", minutes: 45, done: true },
      { id: "s-3", at: inDays(2), topic: "Pilot readiness review, Tigra tola", mentorId: "m-01", minutes: 60, done: false },
    ],
    openQuestions: [
      { id: "q-1", from: "Imran (Team Nirmal)", at: h(20), question: "Should the node retry on the same spreading factor, or step down after two failed uplinks?", answered: false },
    ],
    documentsShared: 6,
    feedbackRequests: 1,
  },
  {
    id: "ma-02",
    requestId: "mr-02",
    mentorId: "m-06",
    teamId: "t-nirmal",
    projectId: "CDP-101",
    roles: ["regulatory"],
    since: d(26),
    sessions: [
      { id: "s-4", at: d(20), topic: "BIS 10500 parameters a field kit must cover", mentorId: "m-06", minutes: 60, done: true },
      { id: "s-5", at: d(6), topic: "Calibration record format district labs accept", mentorId: "m-06", minutes: 45, done: true },
    ],
    openQuestions: [
      { id: "q-2", from: "Dr. Shabnam Khatun (CUJ)", at: d(2), question: "Does a district lab accept a two-point calibration, or does it require three?", answered: true },
    ],
    documentsShared: 4,
    feedbackRequests: 0,
  },
  {
    id: "ma-03",
    requestId: "mr-03",
    mentorId: "m-03",
    teamId: "t-roshni",
    projectId: "CDP-102",
    roles: ["field-ops"],
    since: d(40),
    sessions: [
      { id: "s-6", at: d(31), topic: "Handover protocol with the panchayat electrician", mentorId: "m-03", minutes: 75, done: true },
      { id: "s-7", at: d(9), topic: "Spares kit and the 12-month maintenance plan", mentorId: "m-03", minutes: 60, done: true },
    ],
    openQuestions: [],
    documentsShared: 5,
    feedbackRequests: 0,
  },
  {
    id: "ma-04",
    requestId: "mr-04",
    mentorId: "m-02",
    teamId: "t-saksham",
    projectId: "CDP-104",
    roles: ["product"],
    since: d(10),
    sessions: [
      { id: "s-8", at: d(4), topic: "Design review — three retrofit options", mentorId: "m-02", minutes: 90, done: true },
      { id: "s-9", at: inDays(4), topic: "Cost per year of service, not cost per tap", mentorId: "m-02", minutes: 60, done: false },
    ],
    openQuestions: [
      { id: "q-3", from: "Meera (Team Saksham)", at: h(52), question: "Is a brass ferrule worth ₹40 a tap over PVC where the groundwater is hard?", answered: false },
    ],
    documentsShared: 2,
    feedbackRequests: 1,
  },
  {
    id: "ma-05",
    requestId: "mr-04",
    mentorId: "m-04",
    teamId: "t-saksham",
    projectId: "CDP-104",
    roles: ["manufacturing"],
    since: d(8),
    sessions: [
      { id: "s-10", at: inDays(4), topic: "Cost-to-manufacture walkthrough for 240 taps", mentorId: "m-04", minutes: 60, done: false },
    ],
    openQuestions: [],
    documentsShared: 1,
    feedbackRequests: 0,
  },
  {
    id: "ma-06",
    requestId: "mr-05",
    mentorId: "m-05",
    teamId: "t-tarang",
    projectId: "CDP-103",
    roles: ["data"],
    since: d(15),
    sessions: [
      { id: "s-11", at: d(8), topic: "False-positive analysis on last monsoon's data", mentorId: "m-05", minutes: 60, done: true },
      { id: "s-12", at: inDays(7), topic: "Threshold tuning and alert fatigue", mentorId: "m-05", minutes: 45, done: false },
    ],
    openQuestions: [],
    documentsShared: 3,
    feedbackRequests: 1,
  },
];

/* ========================================================= automation === */

/**
 * The rules that run for this company between sessions.
 *
 * The portal's claim is that a partner does not have to go looking — that
 * relevant work finds them. This is where the claim becomes auditable: what
 * each rule does, when it last ran, what it produced, and a switch to stop it.
 * Anything that would move money or bind the company ends at a person, and the
 * card says so rather than implying otherwise.
 */
export const AUTOMATIONS: IndustryAutomation[] = [
  {
    id: "au-match",
    name: "Challenge matching",
    description:
      "Scores every newly validated challenge against your CSR themes, geographies, technology domains, funding range and deployment capability.",
    category: "discovery",
    status: "healthy",
    enabled: true,
    lastRunAt: h(3.6),
    nextAction: "Next sweep at 18:00, and immediately on any new validation",
    results: [
      { label: "New matches this week", value: "7", href: "/industry/opportunities" },
      { label: "Scoring above 85%", value: "3", href: "/industry/discover" },
      { label: "Screened out", value: "34" },
    ],
    runsThisWeek: 21,
    requiresHuman: false,
  },
  {
    id: "au-csr",
    name: "CSR eligibility check",
    description:
      "Tests each match against Schedule VII of the Companies Act, your board-approved themes, and the allocation left in that domain this year.",
    category: "eligibility",
    status: "healthy",
    enabled: true,
    lastRunAt: h(3.5),
    nextAction: "Runs on every new match",
    results: [
      { label: "Eligible", value: "6" },
      { label: "Outside Schedule VII", value: "1" },
      { label: "Domain allocation exhausted", value: "0" },
    ],
    runsThisWeek: 21,
    requiresHuman: false,
  },
  {
    id: "au-expertise",
    name: "Industry expertise matching",
    description:
      "Maps the technologies a challenge needs onto the domains your engineering organisation actually practises, and names the gap where there is one.",
    category: "discovery",
    status: "healthy",
    enabled: true,
    lastRunAt: h(3.5),
    nextAction: "Runs on every new match",
    results: [
      { label: "Full capability", value: "4" },
      { label: "Partial — gap named", value: "2" },
      { label: "Outside capability", value: "1" },
    ],
    runsThisWeek: 21,
    requiresHuman: false,
  },
  {
    id: "au-funding",
    name: "Funding recommendation",
    description:
      "Proposes a contribution size and a tranche schedule from the challenge cost, the co-funders already in, and your remaining domain allocation. It never commits anything.",
    category: "eligibility",
    status: "healthy",
    enabled: true,
    lastRunAt: h(4),
    nextAction: "3 recommendations are waiting for a person to decide",
    results: [
      { label: "Recommendations open", value: "3", href: "/industry/funding" },
      { label: "Value proposed", value: "₹16.4 L" },
      { label: "Committed automatically", value: "none, by design" },
    ],
    runsThisWeek: 9,
    requiresHuman: true,
  },
  {
    id: "au-mentor",
    name: "Mentor matching",
    description:
      "Matches a team's requested mentor roles against your registered employee mentors, the hours they declared, and the teams they already carry.",
    category: "mentorship",
    status: "attention",
    enabled: true,
    lastRunAt: h(9),
    nextAction: "XISS accessibility audit still has no regulatory mentor with free hours",
    results: [
      { label: "Requests open", value: "3", href: "/industry/mentorship" },
      { label: "Matched this quarter", value: "6" },
      { label: "Unfilled role", value: "regulatory" },
    ],
    runsThisWeek: 6,
    requiresHuman: true,
  },
  {
    id: "au-milestone",
    name: "Project milestone reminders",
    description:
      "Watches every project you fund and tells you when a milestone is submitted for review — or when your review is the thing holding a tranche.",
    category: "delivery",
    status: "attention",
    enabled: true,
    lastRunAt: h(2),
    nextAction: "CDP-101 field-testing evidence has been waiting on you for 3 days",
    results: [
      { label: "Awaiting your review", value: "2", href: "/industry/projects" },
      { label: "Tranche held", value: "₹1.4 L" },
      { label: "Reviewed within 5 days", value: "11 of 13" },
    ],
    runsThisWeek: 14,
    requiresHuman: true,
  },
  {
    id: "au-govt",
    name: "Government approval notifications",
    description:
      "Follows each proposal through panchayat, block and district sign-off, and tells you which desk it is currently sitting on.",
    category: "delivery",
    status: "healthy",
    enabled: true,
    lastRunAt: h(6),
    nextAction: "CDP-104 is with the Block Development Officer",
    results: [
      { label: "Approvals received", value: "2 this week" },
      { label: "In process", value: "1" },
      { label: "Median time to sign-off", value: "6 days" },
    ],
    runsThisWeek: 11,
    requiresHuman: false,
  },
  {
    id: "au-university",
    name: "University updates",
    description:
      "Collects the weekly note each faculty mentor files and turns it into one digest, instead of eight separate emails you would read at different times.",
    category: "delivery",
    status: "healthy",
    enabled: true,
    lastRunAt: h(20),
    nextAction: "Next digest Monday 09:00",
    results: [
      { label: "Updates collected", value: "8 of 8" },
      { label: "Flags raised", value: "1" },
      { label: "Digest recipients", value: "4" },
    ],
    runsThisWeek: 7,
    requiresHuman: false,
  },
  {
    id: "au-pilot",
    name: "Pilot alerts",
    description:
      "Watches live pilot telemetry against the success metrics agreed at commitment, and raises anything drifting away from them.",
    category: "delivery",
    status: "healthy",
    enabled: true,
    lastRunAt: h(0.5),
    nextAction: "Continuous while a pilot is live",
    results: [
      { label: "Pilots watched", value: "3", href: "/industry/projects" },
      { label: "Metrics on target", value: "11 of 12" },
      { label: "Open issue", value: "node 4 packet loss" },
    ],
    runsThisWeek: 168,
    requiresHuman: false,
  },
  {
    id: "au-impact",
    name: "Impact report generation",
    description:
      "Recomputes people reached, cost per beneficiary and problem reduction from verified project data — never from a projection or a plan.",
    category: "reporting",
    status: "healthy",
    enabled: true,
    lastRunAt: d(1),
    nextAction: "Recomputes whenever citizen verification closes on any project",
    results: [
      { label: "Projects recomputed", value: "8" },
      { label: "Figures traced to verification", value: "100%" },
      { label: "Last change", value: "CDP-102 +240 people" },
    ],
    runsThisWeek: 4,
    requiresHuman: false,
  },
  {
    id: "au-csr-report",
    name: "CSR reporting assistance",
    description:
      "Keeps the Schedule VII narrative, the domain split and the beneficiary counts current, so the annual CSR report is assembled rather than written from scratch.",
    category: "reporting",
    status: "healthy",
    enabled: true,
    lastRunAt: d(2),
    nextAction: "FY 2026–27 draft ready — 3 of 8 projects are still awaiting verification close",
    results: [
      { label: "Draft completeness", value: "62%", href: "/industry/csr" },
      { label: "Projects included", value: "5 of 8" },
      { label: "Board review", value: "due 31 March" },
    ],
    runsThisWeek: 3,
    requiresHuman: true,
  },
];

/* ============================================================= alerts === */

export const ALERTS: IndustryAlert[] = [
  {
    id: "ia-1",
    kind: "funding_opportunity",
    title: "₹6.2 L water challenge needs an industry partner",
    detail:
      "Nagri, Hesag and Chandaghasi — 4,281 people, priority 94, government validated, BIT Mesra team already prototyped. The industry response window closes in 20 hours before the government funding fallback fires.",
    at: h(2),
    read: false,
    challengeId: "P-1042",
    action: { label: "Open challenge", href: "/industry/challenges/P-1042" },
  },
  {
    id: "ia-2",
    kind: "milestone_review",
    title: "Field-testing milestone is waiting on your review",
    detail:
      "Team Nirmal submitted the CDP-101 field-testing evidence three days ago — 14 days of continuous data and the manual-gauge comparison. A ₹1.4 L tranche is held until you approve or ask for changes.",
    at: h(2),
    read: false,
    projectId: "CDP-101",
    action: { label: "Review milestone", href: "/industry/projects/CDP-101" },
  },
  {
    id: "ia-3",
    kind: "new_match",
    title: "7 new challenges match your profile",
    detail:
      "This morning's sweep found 7 validated challenges above your 70% threshold, 3 of them above 85%. Water and rural development lead the set.",
    at: h(3.6),
    read: false,
    action: { label: "See opportunities", href: "/industry/opportunities" },
  },
  {
    id: "ia-4",
    kind: "mentor_request",
    title: "XISS accessibility team requested a regulatory mentor",
    detail:
      "Team Samarth needs someone who can map their audit instrument onto the Harmonised Guidelines. No registered mentor currently has hours free.",
    at: h(30),
    read: false,
    challengeId: "C-2112",
    action: { label: "Open request", href: "/industry/mentorship" },
  },
  {
    id: "ia-5",
    kind: "deadline",
    title: "Sponsorship window closes tomorrow",
    detail:
      "Ormanjhi link road culvert — ₹7.8 L, 2,450 people. If no partner commits by 18:00 tomorrow the district moves it onto the government funding queue.",
    at: h(6),
    read: false,
    challengeId: "P-1035",
    action: { label: "Review challenge", href: "/industry/challenges/P-1035" },
  },
  {
    id: "ia-6",
    kind: "government_approval",
    title: "Block Development Officer approved the CDP-102 handover",
    detail:
      "Solar street-lighting telemetry is cleared for handover to Nagri Gram Panchayat. Your final tranche of ₹72,000 releases on handover.",
    at: h(28),
    read: true,
    projectId: "CDP-102",
    action: { label: "Open project", href: "/industry/projects/CDP-102" },
  },
  {
    id: "ia-7",
    kind: "impact_update",
    title: "CDP-102 impact revised upward by 14%",
    detail:
      "Citizen verification closed on the Booty Basti ward. Confirmed beneficiaries rose from 1,740 to 1,980 once two additional hamlets were surveyed.",
    at: d(1),
    read: true,
    projectId: "CDP-102",
    action: { label: "See impact", href: "/industry/impact" },
  },
  {
    id: "ia-8",
    kind: "new_match",
    title: "Cold-chain challenge matches your manufacturing capability",
    detail:
      "Keonjhar tribal milk cooperatives, Odisha — 84% match. Your fabrication workshop and the BAU post-harvest lab cover the whole build between them.",
    at: d(2),
    read: true,
    challengeId: "C-2130",
    action: { label: "Open challenge", href: "/industry/challenges/C-2130" },
  },
  {
    id: "ia-9",
    kind: "impact_update",
    title: "Quarterly impact statement is ready to review",
    detail:
      "₹42.0 L deployed, 18,420 people reached, 21 villages, 64 students supported. Three projects are still awaiting citizen verification close.",
    at: d(3),
    read: true,
    action: { label: "Open CSR ledger", href: "/industry/csr" },
  },
];

/* ========================================================= timeseries === */

/** Twelve months of deployment and reach, for the analytics screens. */
export const MONTHLY: MonthPoint[] = [
  { month: "Oct", investment: 280000, peopleImpacted: 620 },
  { month: "Nov", investment: 450000, peopleImpacted: 1149 },
  { month: "Dec", investment: 360000, peopleImpacted: 1860 },
  { month: "Jan", investment: 520000, peopleImpacted: 2140 },
  { month: "Feb", investment: 340000, peopleImpacted: 1420 },
  { month: "Mar", investment: 610000, peopleImpacted: 1980 },
  { month: "Apr", investment: 380000, peopleImpacted: 890 },
  { month: "May", investment: 290000, peopleImpacted: 1240 },
  { month: "Jun", investment: 470000, peopleImpacted: 2890 },
  { month: "Jul", investment: 240000, peopleImpacted: 760 },
  { month: "Aug", investment: 640000, peopleImpacted: 1190 },
  { month: "Sep", investment: 620000, peopleImpacted: 2281 },
];

/* ======================================================== recognition === */

/**
 * The partner recognition table.
 *
 * Rupees are deliberately absent from the scoring. A company that writes the
 * largest cheque and is never heard from again should not out-rank one that put
 * four engineers into a student team for a year, so the factors are outcomes,
 * delivery, employee time and citizen satisfaction — every one of which a small
 * firm can win on. The formula is printed on the screen for the same reason.
 */
export const LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    previousRank: 1,
    companyId: "co-tata",
    company: "Tata Steel Foundation",
    sector: "Metals & Mining",
    score: 91,
    isSelf: false,
    factors: [
      { label: "People reached per project", value: "3,910", points: 22 },
      { label: "Problem clusters closed", value: "58", points: 20 },
      { label: "Deployments handed over", value: "14", points: 18 },
      { label: "Employee mentor hours", value: "1,240", points: 17 },
      { label: "Citizen satisfaction", value: "93%", points: 14 },
    ],
  },
  {
    rank: 2,
    previousRank: 4,
    companyId: "co-usha",
    company: "Usha Martin Foundation",
    sector: "Wire Ropes",
    score: 84,
    isSelf: false,
    factors: [
      { label: "People reached per project", value: "2,410", points: 18 },
      { label: "Problem clusters closed", value: "41", points: 17 },
      { label: "Deployments handed over", value: "11", points: 16 },
      { label: "Employee mentor hours", value: "1,860", points: 21 },
      { label: "Citizen satisfaction", value: "89%", points: 12 },
    ],
  },
  {
    rank: 3,
    previousRank: 6,
    companyId: "co-nirvaha",
    company: "Nirvaha Technologies",
    sector: "Industrial IoT & Water Infrastructure",
    score: 78,
    isSelf: true,
    factors: [
      { label: "People reached per project", value: "2,303", points: 17 },
      { label: "Problem clusters closed", value: "37", points: 16 },
      { label: "Deployments handed over", value: "6", points: 12 },
      { label: "Employee mentor hours", value: "742", points: 19 },
      { label: "Citizen satisfaction", value: "94%", points: 14 },
    ],
  },
  {
    rank: 4,
    previousRank: 3,
    companyId: "co-jindal",
    company: "Jindal Rural Infra Trust",
    sector: "Steel",
    score: 71,
    isSelf: false,
    factors: [
      { label: "People reached per project", value: "4,180", points: 24 },
      { label: "Problem clusters closed", value: "29", points: 13 },
      { label: "Deployments handed over", value: "7", points: 13 },
      { label: "Employee mentor hours", value: "210", points: 8 },
      { label: "Citizen satisfaction", value: "81%", points: 13 },
    ],
  },
  {
    rank: 5,
    previousRank: 5,
    companyId: "co-hindalco",
    company: "Hindalco Community Trust",
    sector: "Aluminium",
    score: 64,
    isSelf: false,
    factors: [
      { label: "People reached per project", value: "1,920", points: 14 },
      { label: "Problem clusters closed", value: "24", points: 12 },
      { label: "Deployments handed over", value: "6", points: 12 },
      { label: "Employee mentor hours", value: "480", points: 14 },
      { label: "Citizen satisfaction", value: "86%", points: 12 },
    ],
  },
  {
    rank: 6,
    previousRank: 2,
    companyId: "co-ccl",
    company: "Central Coalfields CSR Cell",
    sector: "Coal",
    score: 52,
    isSelf: false,
    factors: [
      { label: "People reached per project", value: "2,640", points: 16 },
      { label: "Problem clusters closed", value: "18", points: 10 },
      { label: "Deployments handed over", value: "3", points: 7 },
      { label: "Employee mentor hours", value: "90", points: 5 },
      { label: "Citizen satisfaction", value: "74%", points: 14 },
    ],
  },
];

/** The factors above, with the weight each carries. Printed on the screen. */
export const LEADERBOARD_FORMULA = [
  { label: "People reached per rupee and per project", weight: 25 },
  { label: "Problem clusters actually closed", weight: 20 },
  { label: "Deployments handed over to a public body", weight: 20 },
  { label: "Employee mentor hours given", weight: 20 },
  { label: "Citizen satisfaction after handover", weight: 15 },
];

/* =========================================================== messages === */

/**
 * Threads exist because a project exists.
 *
 * There is no way to open a conversation with a student, a faculty member or an
 * officer outside a piece of work you are both on. That is what keeps this a
 * collaboration tool rather than a directory of people a company may approach.
 */
export const THREADS: MessageThread[] = [
  {
    id: "th-101",
    projectId: "CDP-101",
    subject: "Pilot readiness — Chainpur block fluoride screening",
    unread: 2,
    updatedAt: h(5),
    participants: [
      { id: "p-off", name: "Junior Engineer, Water", role: "Government", organisation: "Drinking Water & Sanitation, Palamu" },
      { id: "f-06", name: "Dr. Shabnam Khatun", role: "Faculty", organisation: "Central University of Jharkhand" },
      { id: "t-nirmal", name: "Team Nirmal", role: "Student", organisation: "CUJ" },
      { id: "m-01", name: "Ananya Sengupta", role: "Industry", organisation: "Nirvaha Technologies" },
      { id: "m-06", name: "Farah Ansari", role: "Industry", organisation: "Nirvaha Technologies" },
    ],
    messages: [
      { id: "msg-1", threadId: "th-101", authorId: "f-06", at: d(3), body: "All six pods are calibrated against the CUJ bench standard. We would like to start on the Chainpur handpumps first — that is where the 2025 round found the highest readings, and where a false negative would matter most." },
      { id: "msg-2", threadId: "th-101", authorId: "m-01", at: d(3), body: "Agreed. Before you install, move the gateway to the school roof rather than the pump shed — you gain roughly 9 dB and it is the only structure above the tree line on that stretch." },
      { id: "msg-3", threadId: "th-101", authorId: "t-nirmal", at: d(2), body: "Gateway relocated. Packet loss on node 4 went from 12% to 3%. Nodes 1, 2, 3, 5 and 6 are all now under 1%.", attachment: "node4_packet_loss_after.csv" },
      { id: "msg-4", threadId: "th-101", authorId: "p-off", at: h(28), body: "The panchayat has agreed the commissioning date. Please route the field-pass request through the block office at least 48 hours ahead for your technician team." },
      { id: "msg-5", threadId: "th-101", authorId: "t-nirmal", at: h(5), body: "Field-testing evidence uploaded — 14 days of continuous data plus the manual gauge comparison. Requesting review so the next tranche can release the enclosure order.", attachment: "CDP-101_field_test_report.pdf" },
    ],
  },
  {
    id: "th-104",
    projectId: "CDP-104",
    subject: "Tap retrofit — choosing between three designs",
    unread: 1,
    updatedAt: h(52),
    participants: [
      { id: "f-02", name: "Dr. Nilesh Kachhap", role: "Faculty", organisation: "BIT Mesra" },
      { id: "t-saksham", name: "Team Saksham", role: "Student", organisation: "BIT Mesra" },
      { id: "m-02", name: "Vikram Nair", role: "Industry", organisation: "Nirvaha Technologies" },
      { id: "m-04", name: "Deepa Krishnan", role: "Industry", organisation: "Nirvaha Technologies" },
    ],
    messages: [
      { id: "msg-6", threadId: "th-104", authorId: "t-saksham", at: d(5), body: "Three options attached: PVC ferrule, brass ferrule, and a full stainless assembly. Costs are ₹210, ₹250 and ₹640 per tap." },
      { id: "msg-7", threadId: "th-104", authorId: "m-02", at: d(4), body: "Cost per tap is the wrong comparison — the school pays cost per year of service. Brass at ₹250 with a seven-year life beats PVC at ₹210 with a two-year one, and nothing here justifies stainless." },
      { id: "msg-8", threadId: "th-104", authorId: "t-saksham", at: h(52), body: "Is a brass ferrule worth ₹40 a tap over PVC where the groundwater is hard? We do not have corrosion data for this belt." },
    ],
  },
  {
    id: "th-103",
    projectId: "CDP-103",
    subject: "False alarms during ordinary monsoon rain",
    unread: 0,
    updatedAt: d(8),
    participants: [
      { id: "f-07", name: "Dr. Alok Bhengra", role: "Faculty", organisation: "Central University of Jharkhand" },
      { id: "t-tarang", name: "Team Tarang", role: "Student", organisation: "CUJ" },
      { id: "m-05", name: "Rohit Mahato", role: "Industry", organisation: "Nirvaha Technologies" },
    ],
    messages: [
      { id: "msg-9", threadId: "th-103", authorId: "t-tarang", at: d(10), body: "The model fired 31 alerts in the test fortnight. Only 4 were real overflows. Residents had stopped reading them by the second week." },
      { id: "msg-10", threadId: "th-103", authorId: "m-05", at: d(8), body: "That is the right thing to measure and the right conclusion to draw from it. Try requiring a rate-of-rise condition as well as a level threshold — a drain that fills slowly in steady rain is not the failure you are looking for." },
    ],
  },
  {
    id: "th-108",
    projectId: "CDP-108",
    subject: "Load rating after the strain-gauge fortnight",
    unread: 0,
    updatedAt: d(6),
    participants: [
      { id: "p-off2", name: "Assistant Engineer, Rural Works", role: "Government", organisation: "Rural Works Department, Ranchi Block" },
      { id: "f-02b", name: "Dr. Nilesh Kachhap", role: "Faculty", organisation: "BIT Mesra" },
      { id: "t-prahari", name: "Team Prahari", role: "Student", organisation: "BIT Mesra" },
      { id: "m-01b", name: "Ananya Sengupta", role: "Industry", organisation: "Nirvaha Technologies" },
    ],
    messages: [
      { id: "msg-11", threadId: "th-108", authorId: "t-prahari", at: d(9), body: "Fourteen days of strain data across the cracked deck panel. Peak microstrain under a loaded tractor-trailer is 41% above what the 1998 design assumed." },
      { id: "msg-12", threadId: "th-108", authorId: "p-off2", at: d(7), body: "That supports the load restriction the department imposed. Please prepare the rating note in the format the district engineer's office uses so it can go into the repair estimate." },
      { id: "msg-13", threadId: "th-108", authorId: "m-01b", at: d(6), body: "Our instrumentation team can lend you the reference load cell for the calibration check. It is the difference between a rating note the district will accept and one it will query." },
    ],
  },
];

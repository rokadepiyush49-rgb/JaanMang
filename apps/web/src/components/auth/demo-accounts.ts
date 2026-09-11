import type { IconName } from "@/components/icon";

/**
 * The accounts `npm run db:seed` creates.
 *
 * Kept in one module so the sign-in page, the landing page and the README
 * cannot drift apart. Every one uses the password `jansetu-dev`.
 */
export const DEMO_ACCOUNTS = [
  {
    email: "student@jansetu.local",
    password: "jansetu-dev",
    label: "Student · BIT Mesra, 3rd year",
    icon: "graduation" as IconName,
    wash: "bg-tint-mint text-on-tint-mint",
  },
  {
    email: "user-district@jansetu.local",
    password: "jansetu-dev",
    label: "Government · Deputy Commissioner, Ranchi",
    icon: "landmark" as IconName,
    wash: "bg-tint-navy text-on-tint-navy",
  },
  {
    email: "user-block@jansetu.local",
    password: "jansetu-dev",
    label: "Government · Block Development Officer",
    icon: "landmark" as IconName,
    wash: "bg-tint-navy text-on-tint-navy",
  },
  {
    email: "user-gp@jansetu.local",
    password: "jansetu-dev",
    label: "Government · Panchayat Secretary, Nagri",
    icon: "landmark" as IconName,
    wash: "bg-tint-navy text-on-tint-navy",
  },
  {
    email: "institute@jansetu.local",
    password: "jansetu-dev",
    label: "Institute · BIT Mesra registrar",
    icon: "book" as IconName,
    wash: "bg-tint-blue text-on-tint-blue",
  },
  {
    email: "meena.kujur@bitmesra.ac.in",
    password: "jansetu-dev",
    label: "Faculty · guides the Jal Setu team",
    icon: "user" as IconName,
    wash: "bg-tint-blue text-on-tint-blue",
  },
  {
    email: "industry@jansetu.local",
    password: "jansetu-dev",
    label: "Industry · Nirvaha Technologies",
    icon: "factory" as IconName,
    wash: "bg-tint-amber text-on-tint-amber",
  },
  {
    email: "admin@jansetu.local",
    password: "jansetu-dev",
    label: "Platform administrator",
    icon: "shield" as IconName,
    wash: "bg-tint-orchid text-on-tint-orchid",
  },
] as const;

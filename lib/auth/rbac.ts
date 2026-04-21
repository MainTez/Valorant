import type { Role } from "@/types/domain";

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "admin";
}

export function isCoachOrAdmin(role: Role | null | undefined): boolean {
  return role === "coach" || role === "admin";
}

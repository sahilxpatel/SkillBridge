export type Role =
  | "student"
  | "trainer"
  | "institution"
  | "programme_manager"
  | "monitoring_officer";

export const roleToPath: Record<Role, string> = {
  student: "/student",
  trainer: "/trainer",
  institution: "/institution",
  programme_manager: "/programme-manager",
  monitoring_officer: "/monitoring-officer"
};

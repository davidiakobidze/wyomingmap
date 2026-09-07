import raw from "@/data/projects.json";

export type ProjectType =
  | "data-center"
  | "nuclear"
  | "wind"
  | "solar"
  | "transmission"
  | "mining"
  | "uranium"
  | "carbon";

export type ProjectStatus =
  | "exploration"
  | "permitting"
  | "permitted"
  | "construction"
  | "operating";

export interface Project {
  slug: string;
  name: string;
  type: ProjectType;
  developer: string;
  county: string;
  status: ProjectStatus;
  capacity: string;
  lat: number;
  lng: number;
  summary: string;
  updated: string;
  sources: string[];
}

export const projects = raw as Project[];

export const TYPE_LABELS: Record<ProjectType, string> = {
  "data-center": "Data center",
  nuclear: "Nuclear",
  wind: "Wind",
  solar: "Solar",
  transmission: "Transmission",
  mining: "Critical minerals",
  uranium: "Uranium",
  carbon: "Carbon storage",
};

export const TYPE_COLORS: Record<ProjectType, string> = {
  "data-center": "#7B5CD6",
  nuclear: "#D9534F",
  wind: "#2F7FB8",
  solar: "#E0A426",
  transmission: "#6B7A85",
  mining: "#B8622B",
  uranium: "#3F9C5A",
  carbon: "#1F8A8A",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  exploration: "Exploration",
  permitting: "Permitting",
  permitted: "Permitted",
  construction: "Under construction",
  operating: "Operating",
};

export const STATUS_ORDER: ProjectStatus[] = [
  "exploration",
  "permitting",
  "permitted",
  "construction",
  "operating",
];

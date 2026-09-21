import type { ISODateString } from "./common.js";

export interface Milestone {
  id: string;
  projectId: string | null;
  goalId: string | null;
  title: string;
  date: ISODateString;
  createdAt: ISODateString;
}

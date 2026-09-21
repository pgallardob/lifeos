import type { ISODateString } from "./common.js";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: ISODateString;
}

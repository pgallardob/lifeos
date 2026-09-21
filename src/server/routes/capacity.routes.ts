import { Router, type Request, type Response } from "express";
import { ah } from "../lib/async-handler.js";
import { getCapacityReport } from "../services/capacity.service.js";

export const capacityRouter = Router();

capacityRouter.get("/", ah(async (_req: Request, res: Response) => {
  res.json(await getCapacityReport());
}));

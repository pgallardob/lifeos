import { Router, type Request, type Response } from "express";
import { ah } from "../lib/async-handler.js";
import { requireAuth } from "../lib/auth.js";
import { getCapacityReport } from "../services/capacity.service.js";

export const capacityRouter = Router();
capacityRouter.use(requireAuth);

capacityRouter.get("/", ah(async (req: Request, res: Response) => {
  res.json(await getCapacityReport(req.userId));
}));

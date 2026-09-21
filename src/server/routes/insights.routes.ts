import { Router, type Request, type Response } from "express";
import { ah } from "../lib/async-handler.js";
import { getInsights } from "../services/insight.service.js";

export const insightsRouter = Router();

insightsRouter.get("/", ah(async (_req: Request, res: Response) => {
  res.json(await getInsights());
}));

import { Router, type Request, type Response } from "express";
import { ah } from "../lib/async-handler.js";
import { requireAuth } from "../lib/auth.js";
import { getInsights } from "../services/insight.service.js";

export const insightsRouter = Router();
insightsRouter.use(requireAuth);

insightsRouter.get("/", ah(async (req: Request, res: Response) => {
  res.json(await getInsights(req.userId));
}));

import { Router, type Request, type Response } from "express";
import type { ResourceType } from "../../shared/types/index.js";
import { ah } from "../lib/async-handler.js";
import { requireAuth } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { optNumber, optString } from "../lib/validate.js";
import * as resourceService from "../services/resource.service.js";

const TYPES = ["time", "money", "energy", "focus"] as const;

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

resourcesRouter.get("/", ah(async (req: Request, res: Response) => {
  res.json(await resourceService.listResources(req.userId));
}));

resourcesRouter.patch("/:type", ah(async (req: Request, res: Response) => {
  const type = req.params.type as ResourceType;
  if (!(TYPES as readonly string[]).includes(type)) {
    throw HttpError.badRequest(`Tipo de recurso inválido. Debe ser: ${TYPES.join(", ")}.`);
  }
  const body = req.body as Record<string, unknown>;
  const resource = await resourceService.updateResource(req.userId, type, {
    available: optNumber(body, "available", 0),
    capacity: optNumber(body, "capacity", 0),
    unit: optString(body, "unit", 50),
  });
  res.json(resource);
}));

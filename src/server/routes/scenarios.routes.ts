import { Router } from "express";
import * as controller from "../controllers/scenarios.controller.js";
import { ah } from "../lib/async-handler.js";

export const scenariosRouter = Router();

// POST /api/simulations ejecuta una simulación y persiste el escenario
scenariosRouter.post("/", ah(controller.run));
scenariosRouter.get("/", ah(controller.list));
scenariosRouter.get("/:id", ah(controller.get));

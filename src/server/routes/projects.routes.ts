import { Router } from "express";
import * as controller from "../controllers/projects.controller.js";
import { ah } from "../lib/async-handler.js";

export const projectsRouter = Router();

projectsRouter.get("/", ah(controller.list));
projectsRouter.post("/", ah(controller.create));
projectsRouter.get("/:id", ah(controller.get));
projectsRouter.get("/:id/risk", ah(controller.risk));
projectsRouter.patch("/:id", ah(controller.update));
projectsRouter.delete("/:id", ah(controller.remove));

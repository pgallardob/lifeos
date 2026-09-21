import { Router } from "express";
import * as controller from "../controllers/tasks.controller.js";
import { ah } from "../lib/async-handler.js";
import { requireAuth } from "../lib/auth.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get("/", ah(controller.list));
tasksRouter.post("/", ah(controller.create));
tasksRouter.get("/dependencies", ah(controller.listDependencies));
tasksRouter.get("/:id", ah(controller.get));
tasksRouter.patch("/:id", ah(controller.update));
tasksRouter.delete("/:id", ah(controller.remove));
tasksRouter.post("/:id/dependencies", ah(controller.addDependency));
tasksRouter.delete("/:id/dependencies/:dependsOnId", ah(controller.removeDependency));

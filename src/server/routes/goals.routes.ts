import { Router } from "express";
import * as controller from "../controllers/goals.controller.js";
import { ah } from "../lib/async-handler.js";

export const goalsRouter = Router();

goalsRouter.get("/", ah(controller.list));
goalsRouter.post("/", ah(controller.create));
goalsRouter.get("/:id", ah(controller.get));
goalsRouter.patch("/:id", ah(controller.update));
goalsRouter.delete("/:id", ah(controller.remove));

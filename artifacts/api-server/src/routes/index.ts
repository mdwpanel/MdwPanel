import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import keysRouter from "./keys";
import usersRouter from "./users";
import gamesRouter from "./games";
import statsRouter from "./stats";
import settingsRouter from "./settings";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(keysRouter);
router.use(usersRouter);
router.use(gamesRouter);
router.use(statsRouter);
router.use(settingsRouter);
router.use(chatRouter);

export default router;

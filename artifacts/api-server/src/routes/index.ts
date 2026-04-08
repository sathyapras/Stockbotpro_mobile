import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import brokerSummaryRouter from "./brokerSummary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(proxyRouter);
router.use(brokerSummaryRouter);

export default router;

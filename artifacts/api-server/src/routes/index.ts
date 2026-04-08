import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import brokerSummaryRouter from "./brokerSummary";
import globalSentimentRouter from "./globalSentiment";

const router: IRouter = Router();

router.use(healthRouter);
router.use(proxyRouter);
router.use(brokerSummaryRouter);
router.use(globalSentimentRouter);

export default router;

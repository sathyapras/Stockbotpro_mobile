import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import brokerSummaryRouter from "./brokerSummary";
import globalSentimentRouter from "./globalSentiment";
import historicalRouter from "./historical";

const router: IRouter = Router();

router.use(healthRouter);
router.use(proxyRouter);
router.use(brokerSummaryRouter);
router.use(globalSentimentRouter);
router.use(historicalRouter);

export default router;

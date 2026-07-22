import baseConfig from "./playwright.config";
import { withPrognumReport } from "@prognum/playwright-report/config";

export default withPrognumReport(baseConfig);

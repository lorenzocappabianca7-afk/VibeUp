export { fetchDemoResponses } from "@/lib/demo/admin";
export { isDemoMode } from "@/lib/demo/mode";
export { DEMO_PRIVACY_NOTICE } from "@/lib/demo/privacy";
export { parseDemoResponse } from "@/lib/demo/responses";
export { saveDemoSubmission } from "@/lib/demo/submissions";
export {
  clearDemoSession,
  DEMO_PICK_LIMIT,
  readDemoSession,
  writeDemoSession,
} from "@/lib/demo/session";
export type {
  DemoChosenLocation,
  DemoFeedback,
  DemoLandingState,
  DemoResponseRow,
  DemoSession,
  DemoSubmission,
  DemoSubmissionPayload,
} from "@/types/demo";

import { POST as handleProviderWebhook } from "./[provider]/route";

/**
 * Legacy Razorpay webhook path, kept because it may already be registered in
 * the Razorpay dashboard. New endpoints should use /api/billing/webhook/razorpay.
 */
export async function POST(req: Request) {
  return handleProviderWebhook(req, {
    params: Promise.resolve({ provider: "razorpay" }),
  });
}

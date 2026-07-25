import type {
  MakePayClient,
  MakePayPaymentLinkResponse,
  MakePayPaymentLinksResponse,
  MakePayWebhookSubscriptionResponse,
} from "../dist/index.js";

declare const client: MakePayClient;

async function assertPartnerV1ResponseTypes() {
  const detail: MakePayPaymentLinkResponse =
    await client.getPaymentLink("pay_123");
  const updated: MakePayPaymentLinkResponse = await client.updatePaymentLink(
    "pay_123",
    { status: "paused" },
    { idempotencyKey: "order_123:update:v1" },
  );
  const list: MakePayPaymentLinksResponse = await client.listPaymentLinks();

  const companyIds: string[] = [
    detail.companyId,
    updated.companyId,
    list.companyId,
  ];
  const amount: string | number | undefined = detail.paymentLink.payload.amount;
  const fiatCurrency: string | undefined =
    detail.paymentLink.payload.fiatCurrency;
  const metadata: Record<string, unknown> | undefined =
    detail.paymentLink.payload.metadata;
  const normalizedAmount: string | null = detail.paymentLink.amount;
  const normalizedMetadata: Record<string, unknown> =
    detail.paymentLink.metadata;
  const paymentLinkId: string = detail.paymentLink.id;
  const paymentLinkUid: string = detail.paymentLink.uid;
  const paymentLinkStatus: string = detail.paymentLink.status;
  const paymentLinkPublicUrl: string = detail.paymentLink.publicUrl;
  const paymentLinkCreatedAt: string = detail.paymentLink.created_at;
  const listedAmount: string | number | undefined =
    list.paymentLinks[0]?.payload.amount;

  const webhook: MakePayWebhookSubscriptionResponse =
    await client.getCurrentWebhookSubscription();
  const webhookCompanyId: string = webhook.companyId;
  const subscriptionUrl: string | undefined = webhook.subscription?.url;

  return {
    amount,
    companyIds,
    fiatCurrency,
    listedAmount,
    metadata,
    normalizedAmount,
    normalizedMetadata,
    paymentLinkCreatedAt,
    paymentLinkId,
    paymentLinkPublicUrl,
    paymentLinkStatus,
    paymentLinkUid,
    subscriptionUrl,
    webhookCompanyId,
  };
}

void assertPartnerV1ResponseTypes;

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  MakePayClient,
  MakePayError,
  buildMakePayEmbedButtonHtml,
  buildMakePayEmbeddedCheckoutUrl,
  buildMakePayEmbeddedDonationUrl,
  buildMakePayHostedCheckoutUrl,
  buildMakePayHostedDonationUrl,
  buildMakePayIframeHtml,
  buildMakePayModalScriptUrl,
  createAnonymousPaymentLink,
  parseMakePayWebhook,
  verifyMakePayWebhook,
} from "../dist/index.js";

const body = JSON.stringify({ event: { type: "status_changed" } });
const secret = "whsec_test";
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac("sha256", secret)
  .update(`${timestamp}.${body}`)
  .digest("hex");
const header = `t=${timestamp},v1=${signature}`;

assert.equal(verifyMakePayWebhook(body, header, secret), true);
assert.equal(verifyMakePayWebhook(body, header, "wrong"), false);
assert.deepEqual(parseMakePayWebhook(body, header, secret), {
  event: { type: "status_changed" },
});

const requests = [];
const client = new MakePayClient({
  keyId: "mk_test",
  keySecret: "mksec_test",
  fetch: async (url, init) => {
    requests.push({ init, url: String(url) });
    return new Response(
      JSON.stringify({
        ok: true,
        paymentLink: { publicUrl: "https://makepay.io/payment/test" },
      }),
      { headers: { "content-type": "application/json" }, status: 201 },
    );
  },
});

const response = await client.createPaymentLink({
  amount: "12.50",
  currency: "USDT",
});
await client.createDonationLink({
  title: "Spring campaign",
  defaultAmountUsd: "25",
  donationSlug: "spring-campaign",
});
await client.listDonationLinks();
await client.getDonationLink("don_123");
await client.updateDonationLink("don_123", { status: "paused" });
await client.listCustomers();
await client.upsertCustomer({ email: "buyer@example.com", name: "Buyer" });
await client.createCustomerPortal("cus_123", {
  returnUrl: "https://merchant.example",
});
await client.listSubscriptions();
await client.createSubscription({
  amountUsd: "20",
  customerEmail: "buyer@example.com",
});
await client.listDestinationAssets();
await client.listWebhookRequests({ limit: 10 });
await client.listPosTerminals();
await client.createPosTerminal({ name: "Front counter", pin: "1234" });
await client.getPosTerminal("pos_123");
await client.updatePosTerminal("pos_123", {
  name: "Front counter",
  pin: "1234",
});
await client.listProducts();
await client.createProduct({ name: "Sticker", basePriceUsd: "10" });
await client.getProduct("prod_123");
await client.updateProduct("prod_123", { name: "Sticker", status: "active" });
await client.listProductDownloads("prod_123");
await client.createProductDownload("prod_123", { fileName: "guide.pdf" });
await client.getShop();
await client.updateShop({ slug: "demo-shop", displayCurrency: "USD" });
await client.getShopBuilder();
await client.updateShopBuilder({ blocks: [] });
await client.getShopDomain();
await client.updateShopDomain("shop.example.com");
await client.refreshShopDomain();
await client.listShopCoupons();
await client.createShopCoupon({
  code: "SPRING10",
  discountType: "percent",
  value: "10",
});
await client.updateShopCoupon("coupon_123", { status: "archived" });
await client.archiveShopCoupon("coupon_123");
await client.listShopOrders({ limit: 25, status: "paid" });
await client.getBranding();
await client.updateBranding({
  brandName: "Merchant",
  brandingBrandColor: "#101010",
  paymentLinkDomain: "pay.example.com",
});
await client.refreshBrandingDomains("payment-link");
await client.getBookkeepingSummary();
await client.listBookkeepingInvoices();
await client.createBookkeepingInvoice({
  title: "Invoice #1042",
  currency: "USD",
  counterparty: { email: "buyer@example.com", name: "Buyer" },
  lineItems: [
    { description: "Implementation", quantity: "1", unitAmount: "50" },
  ],
});
await client.getBookkeepingInvoice("inv_123");
await client.updateBookkeepingInvoice("inv_123", { status: "open" });
await client.createBookkeepingInvoicePaymentLink("inv_123", {
  sendPaymentRequestEmail: true,
});
await client.listBookkeepingExpenses();
await client.createBookkeepingExpense({
  title: "Hosting",
  amount: "49",
  currency: "USD",
});
await client.createBookkeepingExpenseFromActivity({
  walletActivityEventKey: "chain_event_123",
});
await client.getBookkeepingExpense("exp_123");
await client.updateBookkeepingExpense("exp_123", { status: "approved" });
await client.listBookkeepingDocuments();
await client.uploadBookkeepingDocument({
  file: new Blob(["receipt"], { type: "application/pdf" }),
  fileName: "receipt.pdf",
  documentType: "receipt",
  expenseId: "exp_123",
});
await client.getBookkeepingDocumentDownloadUrl("doc_123");
await client.runBookkeepingDocumentOcr("doc_123");
await client.createBookkeepingReconciliation({
  invoiceId: "inv_123",
  paymentSessionId: "session_123",
  linkType: "payment",
});

assert.equal(response.ok, true);
assert.equal(requests.length, 53);
assert.match(requests[0].url, /\/api\/partner\/v1\/makepay\/payment-links$/);
assert.equal(requests[0].init.method, "POST");
assert.equal(requests[0].init.headers.get("x-makecrypto-key-id"), "mk_test");
assert.equal(
  requests[0].init.headers.get("x-makecrypto-key-secret"),
  "mksec_test",
);
const requestRoutes = requests.map((request) => {
  const url = new URL(request.url);
  return `${request.init.method} ${url.pathname}${url.search}`;
});
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/donations"));
assert.ok(requestRoutes.includes("GET /api/partner/v1/makepay/donations"));
assert.ok(requestRoutes.includes("GET /api/partner/v1/makepay/customers"));
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/subscriptions"));
assert.ok(
  requestRoutes.includes("GET /api/partner/v1/makepay/destination-assets"),
);
assert.ok(
  requestRoutes.includes(
    "GET /api/partner/v1/makepay/webhook-requests?limit=10",
  ),
);
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/pos-terminals"));
assert.ok(
  requestRoutes.includes("PATCH /api/partner/v1/makepay/pos-terminals/pos_123"),
);
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/products"));
assert.ok(
  requestRoutes.includes("PATCH /api/partner/v1/makepay/products/prod_123"),
);
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/shop/products/prod_123/downloads",
  ),
);
assert.ok(requestRoutes.includes("PATCH /api/partner/v1/makepay/shop"));
assert.ok(requestRoutes.includes("PUT /api/partner/v1/makepay/shop/builder"));
assert.ok(requestRoutes.includes("PUT /api/partner/v1/makepay/shop/domains"));
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/shop/domains"));
assert.ok(requestRoutes.includes("POST /api/partner/v1/makepay/shop/coupons"));
assert.ok(
  requestRoutes.includes(
    "DELETE /api/partner/v1/makepay/shop/coupons/coupon_123",
  ),
);
assert.ok(
  requestRoutes.includes(
    "GET /api/partner/v1/makepay/shop/orders?limit=25&status=paid",
  ),
);
assert.ok(requestRoutes.includes("GET /api/partner/v1/makepay/branding"));
assert.ok(requestRoutes.includes("PATCH /api/partner/v1/makepay/branding"));
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/branding/domains/refresh",
  ),
);
assert.ok(requestRoutes.includes("GET /api/partner/v1/makepay/bookkeeping"));
assert.ok(
  requestRoutes.includes("POST /api/partner/v1/makepay/bookkeeping/invoices"),
);
assert.ok(
  requestRoutes.includes(
    "PATCH /api/partner/v1/makepay/bookkeeping/invoices/inv_123",
  ),
);
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/bookkeeping/invoices/inv_123/payment-link",
  ),
);
assert.ok(
  requestRoutes.includes("POST /api/partner/v1/makepay/bookkeeping/expenses"),
);
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/bookkeeping/expenses/from-activity",
  ),
);
assert.ok(
  requestRoutes.includes(
    "PATCH /api/partner/v1/makepay/bookkeeping/expenses/exp_123",
  ),
);
assert.ok(
  requestRoutes.includes("POST /api/partner/v1/makepay/bookkeeping/documents"),
);
assert.ok(
  requestRoutes.includes(
    "GET /api/partner/v1/makepay/bookkeeping/documents/doc_123/download",
  ),
);
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/bookkeeping/documents/doc_123/ocr",
  ),
);
assert.ok(
  requestRoutes.includes(
    "POST /api/partner/v1/makepay/bookkeeping/reconciliation",
  ),
);
const documentUploadRequest = requests.find((request) => {
  const url = new URL(request.url);
  return (
    request.init.method === "POST" &&
    url.pathname === "/api/partner/v1/makepay/bookkeeping/documents"
  );
});
assert.ok(documentUploadRequest);
assert.equal(documentUploadRequest.init.body instanceof FormData, true);
assert.equal(documentUploadRequest.init.headers.has("content-type"), false);
assert.equal(
  client.hostedCheckoutUrl("pay_123"),
  "https://makepay.io/payment/pay_123",
);
assert.equal(
  client.hostedDonationUrl("spring-campaign"),
  "https://makepay.io/donations/spring-campaign",
);
assert.equal(
  client.embeddedCheckoutUrl("pay_123", {
    parentOrigin: "https://merchant.example",
    viewType: "minimal",
  }),
  "https://makepay.io/embed/payment/pay_123?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=minimal",
);
assert.equal(
  client.embeddedDonationUrl("spring-campaign", {
    parentOrigin: "https://merchant.example",
    viewType: "minimal",
  }),
  "https://makepay.io/embed/donations/spring-campaign?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=minimal",
);
assert.equal(client.modalScriptUrl(), "https://makepay.io/modal/makepay.js");
assert.equal(
  buildMakePayHostedCheckoutUrl("pay_123", { baseUrl: "https://pay.example/" }),
  "https://pay.example/payment/pay_123",
);
assert.equal(
  buildMakePayHostedDonationUrl("spring-campaign", {
    baseUrl: "https://pay.example/",
  }),
  "https://pay.example/donations/spring-campaign",
);
assert.equal(
  buildMakePayEmbeddedCheckoutUrl("pay_123", {
    baseUrl: "https://pay.example/",
    parentOrigin: "https://merchant.example",
    viewType: "full",
  }),
  "https://pay.example/embed/payment/pay_123?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=full",
);
assert.equal(
  buildMakePayEmbeddedDonationUrl("spring-campaign", {
    baseUrl: "https://pay.example/",
    parentOrigin: "https://merchant.example",
    viewType: "minimal",
  }),
  "https://pay.example/embed/donations/spring-campaign?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=minimal",
);
assert.equal(
  buildMakePayModalScriptUrl({ baseUrl: "https://pay.example/" }),
  "https://pay.example/modal/makepay.js",
);
assert.match(
  buildMakePayEmbedButtonHtml('pay_"<&', {
    buttonLabel: "Pay <now>",
    viewType: "minimal",
  }),
  /data-makepay-payment-link="pay_&quot;&lt;&amp;"/,
);
assert.match(
  buildMakePayEmbedButtonHtml('pay_"<&', {
    buttonLabel: "Pay <now>",
    viewType: "minimal",
  }),
  /data-makepay-view-type="minimal"/,
);
assert.match(
  buildMakePayIframeHtml("pay_123", {
    iframeTitle: "Secure checkout",
    viewType: "minimal",
  }),
  /src="https:\/\/makepay\.io\/embed\/payment\/pay_123\?viewType=minimal"/,
);

const customCheckoutClient = new MakePayClient({
  keyId: "mk_test",
  keySecret: "mksec_test",
  checkoutBaseUrl: "https://checkout.example/",
  fetch: async () => new Response(JSON.stringify({ ok: true })),
});
assert.equal(
  customCheckoutClient.hostedCheckoutUrl("pay_123"),
  "https://checkout.example/payment/pay_123",
);

let anonymousRequest;
const anonymousResponse = await createAnonymousPaymentLink(
  {
    amount: "5",
    settlement: {
      currency: "USDT",
      priorities: [{ chain: "ETH", address: "0xabc", asset: "ETH.USDT-0xabc" }],
    },
  },
  {
    fetch: async (url, init) => {
      anonymousRequest = { init, url: String(url) };
      return new Response(JSON.stringify({ ok: true, anonymous: true }), {
        headers: { "content-type": "application/json" },
        status: 201,
      });
    },
  },
);
assert.equal(anonymousResponse.anonymous, true);
assert.match(
  anonymousRequest.url,
  /\/api\/partner\/v1\/makepay\/payment-links$/,
);
assert.equal(anonymousRequest.init.method, "POST");
assert.equal(anonymousRequest.init.headers.get("x-makecrypto-key-id"), null);

assert.throws(() => {
  new MakePayClient({
    keyId: "",
    keySecret: "",
  });
}, MakePayError);

console.log("MakePay npm SDK tests passed.");

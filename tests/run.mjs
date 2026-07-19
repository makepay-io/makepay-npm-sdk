import assert from "node:assert/strict";
import {
  createHash,
  createHmac,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";

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
  calculateMakePayDpopJwkThumbprint,
  createMakePayDpopProof,
  createAnonymousPaymentLink,
  generateMakePayDpopKeyPair,
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
        paymentLink: { publicUrl: "https://www.makepay.io/payment/test" },
      }),
      { headers: { "content-type": "application/json" }, status: 201 },
    );
  },
});

const response = await client.createPaymentLink(
  {
    amount: "12.50",
    currency: "USDT",
  },
  { idempotencyKey: "order_123:payment-link:v1" },
);
await client.updatePaymentLink(
  "pay_123",
  {
    metadata: {
      medusaAdminUrl: "https://merchant.example/app/orders/order_123",
      medusaInstallationId: "installation_123",
      medusaOrderDisplayId: "1042",
      medusaOrderId: "order_123",
    },
  },
  { idempotencyKey: "order_123:correlation:v1" },
);
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
await client.getCurrentWebhookSubscription();
await client.upsertCurrentWebhookSubscription(
  { url: "https://merchant.example/webhooks/makepay" },
  { idempotencyKey: "installation_123:webhook:v1" },
);
await client.deleteCurrentWebhookSubscription();
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
assert.equal(requests.length, 57);
assert.match(requests[0].url, /\/api\/partner\/v1\/makepay\/payment-links$/);
assert.equal(requests[0].init.method, "POST");
assert.equal(requests[0].init.redirect, "manual");
assert.equal(requests[0].init.headers.get("x-makecrypto-key-id"), "mk_test");
assert.equal(
  requests[0].init.headers.get("x-makecrypto-key-secret"),
  "mksec_test",
);
assert.equal(
  requests[0].init.headers.get("idempotency-key"),
  "order_123:payment-link:v1",
);
assert.equal(
  requests[1].init.headers.get("idempotency-key"),
  "order_123:correlation:v1",
);
assert.deepEqual(JSON.parse(requests[1].init.body), {
  metadata: {
    medusaAdminUrl: "https://merchant.example/app/orders/order_123",
    medusaInstallationId: "installation_123",
    medusaOrderDisplayId: "1042",
    medusaOrderId: "order_123",
  },
});
const requestRoutes = requests.map((request) => {
  const url = new URL(request.url);
  return `${request.init.method} ${url.pathname}${url.search}`;
});
assert.ok(
  requestRoutes.includes("PATCH /api/partner/v1/makepay/payment-links/pay_123"),
);
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
assert.ok(
  requestRoutes.includes(
    "GET /api/partner/v1/makepay/webhook-subscriptions/current",
  ),
);
assert.ok(
  requestRoutes.includes(
    "PUT /api/partner/v1/makepay/webhook-subscriptions/current",
  ),
);
const webhookSubscriptionPut = requests.find((request) => {
  const url = new URL(request.url);
  return (
    request.init.method === "PUT" &&
    url.pathname === "/api/partner/v1/makepay/webhook-subscriptions/current"
  );
});
assert.equal(
  webhookSubscriptionPut?.init.headers.get("idempotency-key"),
  "installation_123:webhook:v1",
);
assert.ok(
  requestRoutes.includes(
    "DELETE /api/partner/v1/makepay/webhook-subscriptions/current",
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
  "https://www.makepay.io/payment/pay_123",
);
assert.equal(
  client.hostedDonationUrl("spring-campaign"),
  "https://www.makepay.io/donations/spring-campaign",
);
assert.equal(
  client.embeddedCheckoutUrl("pay_123", {
    parentOrigin: "https://merchant.example",
    viewType: "minimal",
  }),
  "https://www.makepay.io/embed/payment/pay_123?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=minimal",
);
assert.equal(
  client.embeddedDonationUrl("spring-campaign", {
    parentOrigin: "https://merchant.example",
    viewType: "minimal",
  }),
  "https://www.makepay.io/embed/donations/spring-campaign?parentOrigin=https%3A%2F%2Fmerchant.example&viewType=minimal",
);
assert.equal(
  client.modalScriptUrl(),
  "https://cdn.makepay.io/modal/makepay.min.js",
);
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
  "https://pay.example/modal/makepay.min.js",
);
assert.match(
  buildMakePayEmbedButtonHtml("pay_123"),
  /src="https:\/\/cdn\.makepay\.io\/modal\/makepay\.min\.js"/,
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
  /src="https:\/\/www\.makepay\.io\/embed\/payment\/pay_123\?viewType=minimal"/,
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
assert.equal(anonymousRequest.init.redirect, "manual");
assert.equal(anonymousRequest.init.headers.get("x-makecrypto-key-id"), null);

const dpopKeyPair = generateMakePayDpopKeyPair();
assert.match(dpopKeyPair.privateKeyPem, /BEGIN PRIVATE KEY/);
assert.equal(dpopKeyPair.publicJwk.kty, "EC");
assert.equal(dpopKeyPair.publicJwk.crv, "P-256");
assert.equal(
  calculateMakePayDpopJwkThumbprint(dpopKeyPair.publicJwk),
  dpopKeyPair.thumbprint,
);

const dpopAccessToken = "mco_access_test";
const dpopProof = createMakePayDpopProof({
  accessToken: dpopAccessToken,
  issuedAt: 1_750_000_000,
  jti: "proof_123",
  method: "get",
  privateKey: dpopKeyPair.privateKeyPem,
  url: "https://www.makecrypto.io/api/partner/v1/makepay/payment-links?limit=10#ignored",
});
const [dpopHeaderPart, dpopPayloadPart, dpopSignaturePart] =
  dpopProof.split(".");
const dpopHeader = JSON.parse(
  Buffer.from(dpopHeaderPart, "base64url").toString("utf8"),
);
const dpopPayload = JSON.parse(
  Buffer.from(dpopPayloadPart, "base64url").toString("utf8"),
);
assert.deepEqual(dpopHeader, {
  typ: "dpop+jwt",
  alg: "ES256",
  jwk: dpopKeyPair.publicJwk,
});
assert.equal(dpopPayload.htm, "GET");
assert.equal(
  dpopPayload.htu,
  "https://www.makecrypto.io/api/partner/v1/makepay/payment-links",
);
assert.equal(dpopPayload.iat, 1_750_000_000);
assert.equal(dpopPayload.jti, "proof_123");
assert.equal(
  dpopPayload.ath,
  createHash("sha256").update(dpopAccessToken).digest("base64url"),
);
assert.equal(
  verifySignature(
    "sha256",
    Buffer.from(`${dpopHeaderPart}.${dpopPayloadPart}`),
    {
      dsaEncoding: "ieee-p1363",
      key: createPublicKey({ key: dpopKeyPair.publicJwk, format: "jwk" }),
    },
    Buffer.from(dpopSignaturePart, "base64url"),
  ),
  true,
);

const oauthRequests = [];
const authRequests = [];
let refreshCalls = 0;
const oauthClient = new MakePayClient({
  authProvider: {
    async getAuthorization(request) {
      authRequests.push(request);
      const accessToken = request.retry ? "access_refreshed" : "access_stale";
      return {
        accessToken,
        tokenType: "DPoP",
        dpopProof: createMakePayDpopProof({
          accessToken,
          method: request.method,
          privateKey: dpopKeyPair.privateKeyPem,
          url: request.url,
        }),
      };
    },
    async refreshAuthorization(request) {
      refreshCalls += 1;
      assert.equal(request.retry, false);
      assert.equal(request.response.status, 401);
    },
  },
  fetch: async (url, init) => {
    oauthRequests.push({ init, url: String(url) });
    if (oauthRequests.length === 1) {
      return new Response(JSON.stringify({ error: "expired" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, paymentLink: { uid: "pay_oauth" } }),
      { headers: { "content-type": "application/json" }, status: 200 },
    );
  },
});
const oauthResponse = await oauthClient.getPaymentLink("pay_oauth");
assert.equal(oauthResponse.paymentLink.uid, "pay_oauth");
assert.equal(oauthRequests.length, 2);
assert.equal(authRequests.length, 2);
assert.deepEqual(
  authRequests.map(({ retry }) => retry),
  [false, true],
);
assert.equal(refreshCalls, 1);
assert.equal(
  oauthRequests[0].init.headers.get("authorization"),
  "DPoP access_stale",
);
assert.equal(
  oauthRequests[1].init.headers.get("authorization"),
  "DPoP access_refreshed",
);
assert.ok(oauthRequests[0].init.headers.get("dpop"));
assert.ok(oauthRequests[1].init.headers.get("dpop"));
assert.notEqual(
  oauthRequests[0].init.headers.get("dpop"),
  oauthRequests[1].init.headers.get("dpop"),
);
assert.equal(oauthRequests[0].init.headers.get("x-makecrypto-key-id"), null);

let persistentUnauthorizedRequests = 0;
let persistentRefreshCalls = 0;
const persistentUnauthorizedClient = new MakePayClient({
  authProvider: {
    async getAuthorization() {
      return { accessToken: "still_expired" };
    },
    async refreshAuthorization() {
      persistentRefreshCalls += 1;
    },
  },
  fetch: async () => {
    persistentUnauthorizedRequests += 1;
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      headers: { "content-type": "application/json" },
      status: 401,
    });
  },
});
await assert.rejects(
  () => persistentUnauthorizedClient.listPaymentLinks(),
  (error) => error instanceof MakePayError && error.status === 401,
);
assert.equal(persistentUnauthorizedRequests, 2);
assert.equal(persistentRefreshCalls, 1);

await assert.rejects(
  () =>
    new MakePayClient({
      authProvider: {
        async getAuthorization() {
          return { accessToken: "bound", tokenType: "DPoP" };
        },
      },
      fetch: async () => {
        throw new Error("fetch must not be reached");
      },
    }).listPaymentLinks(),
  /must return a DPoP proof/,
);

await assert.rejects(
  () =>
    client.createPaymentLink(
      { amount: "5", currency: "USD" },
      { idempotencyKey: "   " },
    ),
  /8 to 200 URL-safe characters/,
);

await assert.rejects(
  () =>
    client.createPaymentLink(
      { amount: "5", currency: "USD" },
      { idempotencyKey: "short" },
    ),
  /8 to 200 URL-safe characters/,
);

let escapedOriginFetches = 0;
const originGuardClient = new MakePayClient({
  keyId: "mk_guard",
  keySecret: "mksec_guard",
  fetch: async () => {
    escapedOriginFetches += 1;
    return new Response("{}", {
      headers: { "content-type": "application/json" },
    });
  },
});
await assert.rejects(
  () => originGuardClient.request("GET", "@attacker.example/credentials"),
  /path must start with '\/'/,
);
assert.equal(escapedOriginFetches, 0);

assert.throws(
  () =>
    new MakePayClient({
      baseUrl: "https://user:password@www.makecrypto.io",
      keyId: "mk_guard",
      keySecret: "mksec_guard",
    }),
  /without credentials, query, or fragment/,
);

assert.throws(
  () =>
    createMakePayDpopProof({
      method: "POST",
      privateKey: "not-a-private-key",
      url: "https://www.makecrypto.io/oauth/token",
    }),
  /Invalid P-256 DPoP private key/,
);

assert.throws(
  () =>
    createMakePayDpopProof({
      method: "POST",
      privateKey: dpopKeyPair.privateKeyPem,
      url: "https://user:password@www.makecrypto.io/oauth/token",
    }),
  /without embedded credentials/,
);

assert.throws(
  () =>
    new MakePayClient({
      authProvider: {
        async getAuthorization() {
          return { accessToken: "token" };
        },
      },
      keyId: "mk_test",
      keySecret: "mksec_test",
    }),
  /either MakePay keyId\/keySecret or authProvider/,
);

assert.throws(() => {
  new MakePayClient({
    keyId: "",
    keySecret: "",
  });
}, MakePayError);

console.log("MakePay npm SDK tests passed.");

# MakePay JavaScript SDK

Official JavaScript and TypeScript SDK for MakePay server-side integrations.
Use it to create crypto payment links, donation pages, invoices, bookkeeping
records, subscriptions, POS terminals, products, Simple Shop storefronts,
customer portals, branded domains, and signed webhook handlers.

Public source: `https://github.com/makepay-io/makepay-npm-sdk`

## Install

```bash
npm install @makecrypto/makepay
```

```bash
pnpm add @makecrypto/makepay
```

The SDK targets Node.js 18 or newer and uses the runtime `fetch`
implementation.

## Configure

Create a MakePay API key in MakeCrypto and keep the secret on your server only.

```ts
import { MakePayClient } from "@makecrypto/makepay";

const makepay = new MakePayClient({
  keyId: process.env.MAKEPAY_KEY_ID!,
  keySecret: process.env.MAKEPAY_KEY_SECRET!,
});
```

The client sends `x-makecrypto-key-id` and `x-makecrypto-key-secret` headers to
the MakePay partner API.

Custom API and checkout base URLs must be origin-only HTTPS URLs. For local
tests, HTTP is accepted only with the exact hosts `localhost`, `127.0.0.1`, or
`[::1]` (an explicit port is allowed). Userinfo, paths, query strings,
fragments, lookalike hostnames, and alternate numeric IP encodings are rejected.
The same policy applies to anonymous requests and every hosted, embedded,
modal-script, button, and iframe URL helper. DPoP proof target URLs use the same
HTTPS-or-exact-loopback transport rule while retaining their required path.
Embedded-checkout `parentOrigin` values are independently validated as strict
merchant origins before being serialized or used as the browser default.

### OAuth and DPoP

Native integrations can instead supply OAuth credentials asynchronously. The
host application remains responsible for encrypting tokens and the DPoP private
key, serializing refreshes, and atomically persisting rotated refresh tokens.

```ts
import {
  MakePayClient,
  createMakePayDpopProof,
  type MakePayAuthProvider,
} from "@makecrypto/makepay";

const authProvider: MakePayAuthProvider = {
  async getAuthorization({ method, url }) {
    const credentials = await tokenStore.load();

    return {
      accessToken: credentials.accessToken,
      tokenType: "DPoP",
      dpopProof: createMakePayDpopProof({
        accessToken: credentials.accessToken,
        method,
        privateKey: credentials.dpopPrivateKeyPem,
        url,
      }),
    };
  },
  async refreshAuthorization() {
    // Refresh once under your application's lock and persist both rotated
    // tokens before this promise resolves.
    await tokenStore.refresh();
  },
};

const makepay = new MakePayClient({ authProvider });
```

On a `401`, the SDK invokes `refreshAuthorization` at most once and rebuilds
authorization (including a fresh DPoP proof) before one retry. It never owns or
persists OAuth tokens. `generateMakePayDpopKeyPair`,
`calculateMakePayDpopJwkThumbprint`, and `createMakePayDpopProof` are available
for native authorization-code integrations.

## Payment Links

```ts
const response = await makepay.createPaymentLink(
  {
    title: "Order #1042",
    description: "Checkout for order #1042",
    amount: "129.99",
    currency: "USDT",
    orderId: "order_1042",
    customerEmail: "buyer@example.com",
    returnUrl: "https://merchant.example/orders/1042",
    successUrl: "https://merchant.example/orders/1042/success",
    failureUrl: "https://merchant.example/orders/1042/pay",
    expirationTime: "12h",
  },
  {
    // Reuse this value while reconciling an ambiguous network outcome.
    idempotencyKey: "order_1042:payment-link:v1",
  },
);

console.log(response.paymentLink);
```

`createPaymentLink`, `updatePaymentLink`, and the current webhook-subscription
mutations accept an `idempotencyKey`. Reuse the same key only for an identical
mutation; MakePay rejects reuse with a different method, path, or body.

Read, update, and email existing links:

```ts
await makepay.listPaymentLinks();
await makepay.getPaymentLink("PAYMENT_LINK_UID");
await makepay.updatePaymentLink("PAYMENT_LINK_UID", { status: "paused" });
await makepay.updatePaymentLink("PAYMENT_LINK_UID", {
  metadata: {
    medusaOrderId: "order_01J...",
    medusaOrderDisplayId: "1042",
    medusaAdminUrl: "https://merchant.example/app/orders/order_01J...",
    medusaInstallationId: "installation_01J...",
  },
});
await makepay.sendPaymentRequestEmail("PAYMENT_LINK_UID", "buyer@example.com");
```

## Donations

Donation pages are flexible-amount payment links with a public donation slug.

```ts
const donation = await makepay.createDonationLink({
  title: "Spring campaign",
  description: "Support the 2026 spring fundraiser.",
  defaultAmountUsd: "25",
  minimumAmountUsd: "5",
  donationSlug: "spring-campaign",
});

console.log(donation.paymentLink.publicUrl);

await makepay.listDonationLinks();
await makepay.getDonationLink("DONATION_UID");
await makepay.updateDonationLink("DONATION_UID", { status: "paused" });
```

## Anonymous Payment Links

Anonymous links do not use a MakePay API key. They require an explicit
settlement route because MakePay cannot read merchant wallet settings.

```ts
import { createAnonymousPaymentLink } from "@makecrypto/makepay";

const response = await createAnonymousPaymentLink({
  amount: "25",
  settlement: {
    currency: "USDT",
    priorities: [
      {
        chain: "ETH",
        address: "0xYourSettlementWallet",
        asset: "ETH.USDT-0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
    ],
  },
  title: "Invoice #1042",
  webhookUrl: "https://merchant.example/webhooks/makepay",
});
```

## Checkout URLs And Embeds

Use hosted checkout for redirects, or the embed helpers when your frontend keeps
the shopper on the merchant site.

```ts
import {
  buildMakePayEmbeddedCheckoutUrl,
  buildMakePayHostedCheckoutUrl,
  mountMakePayCheckout,
  openMakePayCheckout,
} from "@makecrypto/makepay";

const paymentUid = response.paymentLink.uid;

const hostedUrl = buildMakePayHostedCheckoutUrl(paymentUid);
const embedUrl = buildMakePayEmbeddedCheckoutUrl(paymentUid, {
  parentOrigin: "https://merchant.example",
  viewType: "minimal",
});

await openMakePayCheckout({
  paymentUid,
  viewType: "minimal",
  onEvent(event) {
    if (event.type === "makepay.payment.redirect_requested") {
      window.location.assign(String(event.payload?.redirectUrl || hostedUrl));
    }
  },
});

const mounted = mountMakePayCheckout({
  container: "#makepay-checkout",
  paymentUid,
  viewType: "minimal",
});
```

Embedded checkout supports `viewType: "full" | "minimal"`. The default
`"full"` view matches the hosted payment page layout. Use `"minimal"` when the
checkout is already inside your own page or modal and should show only the
compact payment form. The mounted helper accepts checkout events only when both
the configured MakePay origin and the mounted iframe window match.

Donation pages also have URL helpers:

```ts
makepay.hostedDonationUrl("spring-campaign");
makepay.embeddedDonationUrl("spring-campaign", {
  parentOrigin: "https://merchant.example",
  viewType: "minimal",
});
```

For static CMS pages, `buildMakePayEmbedButtonHtml(paymentUid)` returns a button
snippet that loads the MakePay modal script, and `buildMakePayIframeHtml`
returns an iframe snippet. Pass `{ viewType: "minimal" }` to either helper to
request the compact embed.

## Customers And Subscriptions

```ts
await makepay.upsertCustomer({
  email: "buyer@example.com",
  name: "Buyer Example",
  clientId: "crm_123",
});

await makepay.createCustomerPortal("CUSTOMER_ID", {
  returnUrl: "https://merchant.example/account",
});

await makepay.createSubscription({
  amountUsd: "29",
  customerEmail: "buyer@example.com",
  label: "Monthly plan",
  billingIntervalUnit: "month",
  billingIntervalCount: 1,
});
```

## POS Terminals

```ts
const terminal = await makepay.createPosTerminal({
  name: "Front counter",
  pin: "1234",
  allowedAssets: ["ETH.USDT-0xdAC17F958D2ee523a2206206994597C13D831ec7"],
  emailCollectionMode: "optional_after_deposit",
  catalogEnabled: true,
});

await makepay.listPosTerminals();
await makepay.getPosTerminal(String(terminal.terminal.uid));
```

## Products And Simple Shop

```ts
await makepay.createProduct({
  name: "Digital guide",
  productType: "digital",
  basePriceUsd: "19",
  shopSlug: "digital-guide",
  images: [{ url: "https://merchant.example/guide.png", alt: "Guide cover" }],
  variants: [{ name: "PDF", priceUsd: "19" }],
});

await makepay.createProductDownload("PRODUCT_UID", {
  fileName: "guide.pdf",
  contentType: "application/pdf",
  url: "https://merchant.example/downloads/guide.pdf",
});

await makepay.updateShop({
  slug: "merchant-shop",
  displayCurrency: "USD",
  checkoutMode: "hosted",
  branding: { accentColor: "#14b8a6" },
});

await makepay.updateShopDomain("shop.merchant.example");
await makepay.refreshShopDomain();
await makepay.createShopCoupon({
  code: "SPRING10",
  discountType: "percent",
  value: "10",
});
await makepay.listShopOrders({ status: "paid", limit: 25 });
```

## Invoices And Bookkeeping

Bookkeeping APIs manage merchant invoices, expenses, supporting documents, OCR,
and reconciliation links.

```ts
const created = await makepay.createBookkeepingInvoice({
  title: "Invoice #1042",
  currency: "USD",
  issueDate: "2026-05-15",
  dueDate: "2026-05-30",
  counterparty: {
    name: "Buyer Example",
    email: "buyer@example.com",
    clientId: "crm_123",
  },
  lineItems: [
    {
      description: "Implementation services",
      quantity: "1",
      unitAmount: "500",
      taxAmount: "0",
    },
  ],
  metadata: { orderId: "order_1042" },
});

await makepay.createBookkeepingInvoicePaymentLink("INVOICE_UID", {
  sendPaymentRequestEmail: true,
});

await makepay.listBookkeepingInvoices();
await makepay.getBookkeepingInvoice("INVOICE_UID");
await makepay.updateBookkeepingInvoice("INVOICE_UID", { status: "open" });
```

Expenses can be created manually or from wallet activity, then linked back to
payments, transfers, invoices, or uploaded receipts.

```ts
await makepay.createBookkeepingExpense({
  title: "Hosting",
  amount: "49",
  currency: "USD",
  incurredOn: "2026-05-15",
  category: "Infrastructure",
  counterparty: { name: "Vendor Example", type: "vendor" },
});

await makepay.createBookkeepingExpenseFromActivity({
  walletActivityEventKey: "CHAIN_EVENT_KEY",
  category: "Settlement",
});

await makepay.createBookkeepingReconciliation({
  invoiceId: "INVOICE_UID",
  paymentSessionId: "PAYMENT_SESSION_ID",
  linkType: "payment",
});
```

Document uploads use multipart form data through `Blob` or `File`.

```ts
await makepay.uploadBookkeepingDocument({
  file: new Blob([receiptBytes], { type: "application/pdf" }),
  fileName: "receipt.pdf",
  documentType: "receipt",
  expenseId: "EXPENSE_UID",
});

await makepay.listBookkeepingDocuments();
await makepay.getBookkeepingDocumentDownloadUrl("DOCUMENT_UID");
await makepay.runBookkeepingDocumentOcr("DOCUMENT_UID");
await makepay.getBookkeepingSummary();
```

## Branding And Domains

```ts
await makepay.updateBranding({
  brandName: "Merchant",
  supportEmail: "support@merchant.example",
  brandingBrandColor: "#111827",
  brandingAccentColor: "#14b8a6",
  paymentLinkTheme: "system",
  paymentLinkDomain: "pay.merchant.example",
  emailSendingDomain: "mail.merchant.example",
});

await makepay.refreshBrandingDomains("all");
```

## Settings And Operational APIs

```ts
await makepay.getSettings();
await makepay.updateSettings({
  callbackUrl: "https://merchant.example/webhooks/makepay",
});

await makepay.listDestinationAssets();
await makepay.listWebhookRequests({ limit: 25 });
```

OAuth integrations should use a grant-scoped webhook subscription rather than
changing a company-global callback URL. The signing secret is returned only on
creation or explicit rotation, so persist it immediately. PUT and DELETE
require an idempotency key.

```ts
const created = await makepay.upsertCurrentWebhookSubscription(
  {
    url: "https://merchant.example/webhooks/makepay",
    events: ["makepay.payment.status_changed"],
  },
  { idempotencyKey: "installation_123:webhook:v1" },
);

await makepay.getCurrentWebhookSubscription();
await makepay.deleteCurrentWebhookSubscription({
  idempotencyKey: "installation_123:webhook-delete:v1",
});
```

## Webhook Verification

Read the exact raw body before parsing JSON.

```ts
import { parseMakePayWebhook } from "@makecrypto/makepay";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = parseMakePayWebhook(
    rawBody,
    request.headers.get("x-makepay-signature"),
    process.env.MAKEPAY_WEBHOOK_SECRET!,
  );

  if (event.event?.type === "status_changed") {
    // Update your local order status.
  }

  return new Response("ok");
}
```

Use `verifyMakePayWebhook` when you only need a boolean result. Webhook
timestamps use a 300-second freshness window by default. A custom
`toleranceSeconds` must be finite and greater than zero; zero, negative, `NaN`,
and infinite values fail verification.

## Method Coverage

| Area            | SDK methods                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Payment links   | `createPaymentLink`, `listPaymentLinks`, `getPaymentLink`, `updatePaymentLink`, `sendPaymentRequestEmail`                                 |
| Donations       | `createDonationLink`, `listDonationLinks`, `getDonationLink`, `updateDonationLink`                                                        |
| Anonymous links | `createAnonymousPaymentLink`                                                                                                              |
| Checkout        | hosted, embedded, modal, button, and iframe helpers                                                                                       |
| Customers       | `listCustomers`, `upsertCustomer`, `createCustomerPortal`                                                                                 |
| Subscriptions   | `listSubscriptions`, `createSubscription`                                                                                                 |
| POS terminals   | `listPosTerminals`, `createPosTerminal`, `getPosTerminal`, `updatePosTerminal`                                                            |
| Products        | `listProducts`, `createProduct`, `getProduct`, `updateProduct`, `listProductDownloads`, `createProductDownload`                           |
| Simple Shop     | `getShop`, `updateShop`, `getShopBuilder`, `updateShopBuilder`, `getShopDomain`, `updateShopDomain`, `refreshShopDomain`, coupons, orders |
| Bookkeeping     | summary, invoice, expense, document upload/OCR, and reconciliation methods                                                                |
| Branding        | `getBranding`, `updateBranding`, `refreshBrandingDomains`                                                                                 |
| Operations      | `getSettings`, `updateSettings`, `listDestinationAssets`, `listWebhookRequests`, current webhook subscription CRUD                        |
| Webhooks        | `verifyMakePayWebhook`, `parseMakePayWebhook`                                                                                             |

## TypeScript, Data Models, And Response Models

`@makecrypto/makepay` is written in TypeScript and ships declaration files in
the same npm package. You do not need `@types/makecrypto__makepay` or a
secondary SDK package.

```ts
import type {
  MakePayAnonymousPaymentLinkResponse,
  MakePayBookkeepingInvoicePayload,
  MakePayBookkeepingSummaryResponse,
  MakePayAuthProvider,
  MakePayDonationLinksResponse,
  MakePayPaymentLinkPayload,
  MakePayPaymentLinkResponse,
  MakePayPaymentRequestEmailResponse,
  MakePayWebhookSubscriptionResponse,
} from "@makecrypto/makepay";
```

Model conventions:

- SDK payloads use camelCase. Some API routes also accept snake_case for
  compatibility, but new integrations should send camelCase.
- Use strings for decimal money values when precision matters, for example
  `"129.99"` instead of `129.99`.
- Dates are ISO strings. Date-only fields, such as invoice `issueDate`, should
  use `YYYY-MM-DD`.
- IDs are usually public `uid` values. Bookkeeping detail endpoints accept an
  internal UUID or public UID.
- Authenticated partner-v1 payment links retain the original values under
  `paymentLink.payload` and also expose normalized `amount`, `fiatCurrency`,
  `metadata`, correlation fields, latest session, and timeline fields directly
  on `paymentLink`.
- API methods throw `MakePayError` for non-2xx responses. Successful responses
  are typed envelopes with index signatures, so production can add fields
  without breaking TypeScript consumers.

### Accepted Payload Models

| Model                                     | Used by                                                                                        | Required fields                                          | Common optional fields                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `MakePayPaymentLinkPayload`               | `createPaymentLink`                                                                            | `amount`                                                 | `title`, `description`, `currency`, `asset`, `orderId`, `customerEmail`, `clientId`, `returnUrl`, `successUrl`, `metadata`        |
| `MakePayPaymentLinkUpdate`                | `updatePaymentLink`                                                                            | at least one update field                                | status/expiry controls or allowlisted Medusa order-correlation metadata                                                           |
| `MakePayDonationLinkPayload`              | `createDonationLink`                                                                           | none                                                     | `defaultAmountUsd`, `minimumAmountUsd`, `donationSlug`, payment-link display and redirect fields                                  |
| `MakePayAnonymousPaymentLinkPayload`      | `createAnonymousPaymentLink`                                                                   | `amount`, `settlement.currency`, `settlement.priorities` | `title`, `customerEmail`, `orderId`, `metadata`, `branding`, `webhookUrl`, checkout redirect URLs                                 |
| `MakePayCustomerPayload`                  | `upsertCustomer`                                                                               | one of `email`, `customerEmail`, `name`, `clientId`      | `metadata`                                                                                                                        |
| `MakePaySubscriptionPayload`              | `createSubscription`                                                                           | plan amount/customer fields for your billing flow        | `amountUsd`, `customerEmail`, `label`, `billingIntervalUnit`, `billingIntervalCount`, `startAt`, `sendPaymentRequestEmail`        |
| `MakePayPosTerminalPayload`               | `createPosTerminal`, `updatePosTerminal`                                                       | `name`                                                   | `pin`, `status`, `allowedAssets`, `emailCollectionMode`, `catalogEnabled`, `displaySettings`, `metadata`                          |
| `MakePayProductPayload`                   | `createProduct`, `updateProduct`                                                               | `name`                                                   | `description`, `sku`, `status`, `productType`, `basePriceUsd`, `shopSlug`, `images`, `variants`, `taxRates`, `metadata`           |
| `MakePayShopPayload`                      | `updateShop`                                                                                   | none                                                     | `slug`, `status`, `displayCurrency`, `checkoutMode`, `billingDetailsRequired`, shipping fields, links, SEO, tracking, branding    |
| `MakePayBrandingPayload`                  | `updateBranding`                                                                               | none                                                     | brand name, support email, website URL, theme colors, `paymentLinkDomain`, `emailSendingDomain`                                   |
| `MakePayBookkeepingInvoicePayload`        | `createBookkeepingInvoice`, `updateBookkeepingInvoice`                                         | none; blank invoices are allowed as drafts               | `invoiceNumber`, `status`, `paymentStatus`, `currency`, `issueDate`, `dueDate`, `counterparty`, `lineItems`, `documentIds`        |
| `MakePayBookkeepingExpensePayload`        | `createBookkeepingExpense`, `createBookkeepingExpenseFromActivity`, `updateBookkeepingExpense` | none; amount defaults to zero if no activity is used     | `amount`, `currency`, `category`, `incurredOn`, `walletActivityEventId`, `walletActivityEventKey`, `counterparty`, `metadata`     |
| `MakePayBookkeepingDocumentUpload`        | `uploadBookkeepingDocument`                                                                    | `file`                                                   | `fileName`, `documentType`, `invoiceId`, `expenseId`                                                                              |
| `MakePayBookkeepingReconciliationPayload` | `createBookkeepingReconciliation`                                                              | one target and one source                                | target: `invoiceId` or `expenseId`; source: payment link/session, subscription cycle, or wallet activity; `amount`, `assetSymbol` |
| `Record<string, unknown>`                 | product downloads, shop builder, coupons, settings, customer portal                            | route-specific                                           | these advanced surfaces stay open-ended while their server schemas evolve                                                         |

### Response Models By Function

| Functions                                                                                                                | Resolves to                                                                              | Key fields                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `createPaymentLink`, `getPaymentLink`, `updatePaymentLink`, donation create/detail/update                                | `MakePayPaymentLinkResponse`                                                             | required `companyId`; normalized `paymentLink` plus retained `paymentLink.payload`                           |
| `listPaymentLinks`                                                                                                       | `MakePayPaymentLinksResponse`                                                            | required `companyId`; `paymentLinks[]` uses the same canonical partner-v1 link shape                        |
| `listDonationLinks`                                                                                                      | `MakePayDonationLinksResponse`                                                           | required `companyId`, `donations`                                                                           |
| `sendPaymentRequestEmail`                                                                                                | `MakePayPaymentRequestEmailResponse`                                                     | `ok`, `email`, and the updated payment-link email payload                                                   |
| `createAnonymousPaymentLink`                                                                                             | `MakePayAnonymousPaymentLinkResponse`                                                    | `anonymous`, `requestId`, public `paymentLink`, and optional one-time webhook secret                        |
| `listCustomers`, `upsertCustomer`, `createCustomerPortal`                                                                | `MakePayCustomersResponse` or `MakePayCustomerResponse`                                  | `customers`, `customer`, `portalUrl` or `url`                                                               |
| `listSubscriptions`, `createSubscription`                                                                                | `MakePaySubscriptionsResponse` or `MakePaySubscriptionResponse`                          | `subscriptions`, `subscription`                                                                             |
| `listPosTerminals`, `createPosTerminal`, `getPosTerminal`, `updatePosTerminal`                                           | `MakePayPosTerminalsResponse` or `MakePayPosTerminalResponse`                            | `terminals`/`posTerminals`, `terminal`/`posTerminal`                                                        |
| `listProducts`, `createProduct`, `getProduct`, `updateProduct`, `listProductDownloads`, `createProductDownload`          | product and download response types                                                      | `products`, `product`, `downloads`                                                                          |
| `getShop`, `updateShop`, `getShopBuilder`, `updateShopBuilder`, `getShopDomain`, `updateShopDomain`, `refreshShopDomain` | shop, builder, and domain response types                                                 | `shop`, `blocks`, `builder`, `domain`, `status`, `verification`                                             |
| `listShopCoupons`, `createShopCoupon`, `updateShopCoupon`, `archiveShopCoupon`, `listShopOrders`                         | coupon and order response types                                                          | `coupons`, `coupon`, `orders`                                                                               |
| `getBranding`, `updateBranding`, `refreshBrandingDomains`, `getSettings`, `updateSettings`                               | `MakePayBrandingResponse`, `MakePaySettingsResponse`, or `MakePaySettingsUpdateResponse` | `company`, `settings`, `ok`                                                                                 |
| `listDestinationAssets`, `listWebhookRequests`, current webhook subscription methods                                     | operational response types                                                               | assets, webhook request logs, subscription metadata, and one-time `signingSecret`                           |
| `getBookkeepingSummary`, invoice, expense, document, OCR, and reconciliation methods                                     | bookkeeping response types                                                               | `summary`, `invoices`, `invoice`, `expenses`, `expense`, `documents`, `url`, `reconciliationLinks`, `stats` |
| `verifyMakePayWebhook`, `parseMakePayWebhook`                                                                            | boolean or parsed event                                                                  | `parseMakePayWebhook<T>()` returns your supplied event type after signature verification                    |

Bookkeeping mutation methods return a fresh
`MakePayBookkeepingSummaryResponse`, so dashboards can update invoice, expense,
document, reconciliation, and stat views from a single response.

## Errors

API calls throw `MakePayError` with a numeric HTTP `status`. Remote error
bodies are intentionally not attached or reflected in the message, so the
error is safe to pass through normal application logging boundaries. The
deprecated `responseBody` property remains for source compatibility but is
always `undefined`.

```ts
import { MakePayError } from "@makecrypto/makepay";

try {
  await makepay.getPaymentLink("PAYMENT_LINK_UID");
} catch (error) {
  if (error instanceof MakePayError) {
    console.error(error.status, error.message);
  }
}
```

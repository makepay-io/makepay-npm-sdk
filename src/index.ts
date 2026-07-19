import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
  timingSafeEqual,
} from "node:crypto";

export type MakePayClientBaseOptions = {
  /** Origin-only HTTPS URL; exact loopback hosts may use HTTP for local tests. */
  baseUrl?: string;
  /** Origin-only HTTPS URL; exact loopback hosts may use HTTP for local tests. */
  checkoutBaseUrl?: string;
  fetch?: typeof fetch;
};

export type MakePayApiKeyClientOptions = MakePayClientBaseOptions & {
  keyId: string;
  keySecret: string;
  authProvider?: never;
};

export type MakePayOAuthClientOptions = MakePayClientBaseOptions & {
  authProvider: MakePayAuthProvider;
  keyId?: never;
  keySecret?: never;
};

/**
 * Configure the client with either a MakePay API key or an asynchronous OAuth
 * provider. Authentication credentials are intentionally mutually exclusive.
 */
export type MakePayClientOptions =
  | MakePayApiKeyClientOptions
  | MakePayOAuthClientOptions;

export type MakePayHttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type MakePayAuthRequest = Readonly<{
  method: MakePayHttpMethod;
  retry: boolean;
  url: string;
}>;

export type MakePayAuthRefreshRequest = MakePayAuthRequest &
  Readonly<{
    response: Response;
  }>;

export type MakePayOAuthAuthorization = Readonly<{
  accessToken: string;
  tokenType?: "Bearer" | "DPoP";
  dpopProof?: string;
}>;

/**
 * Supplies current OAuth credentials for each request. The host owns token
 * storage, refresh locking, and persistence of rotated refresh tokens.
 */
export interface MakePayAuthProvider {
  getAuthorization(
    request: MakePayAuthRequest,
  ): Promise<MakePayOAuthAuthorization>;
  refreshAuthorization?(request: MakePayAuthRefreshRequest): Promise<void>;
}

export type MakePayOAuthAuthProvider = MakePayAuthProvider;

export type MakePayDpopPublicJwk = Readonly<{
  crv: "P-256";
  kty: "EC";
  x: string;
  y: string;
}>;

export type MakePayDpopKeyPair = Readonly<{
  privateKeyPem: string;
  publicJwk: MakePayDpopPublicJwk;
  thumbprint: string;
}>;

export type MakePayDpopProofOptions = Readonly<{
  accessToken?: string;
  issuedAt?: number;
  jti?: string;
  method: string;
  privateKey: string;
  url: string;
}>;

const MAKEPAY_MODAL_SCRIPT_CDN_URL =
  "https://cdn.makepay.io/modal/makepay.min.js";

export type MakePayPaymentLinkPayload = {
  title?: string;
  description?: string;
  amount: string | number;
  fiatCurrency?: string;
  currency?: string;
  asset?: string;
  orderId?: string;
  customerEmail?: string;
  clientId?: string;
  returnUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  expirationTime?: "15m" | "1h" | "12h" | "24h" | "72h" | "never" | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayDonationLinkPayload = Omit<
  MakePayPaymentLinkPayload,
  "amount"
> & {
  amount?: string | number;
  defaultAmountUsd?: string | number;
  minimumAmountUsd?: string | number;
  donationSlug?: string;
};

export type MakePayBrandingPayload = {
  name?: string;
  brandName?: string | null;
  businessDescription?: string | null;
  websiteUrl?: string | null;
  supportEmail?: string | null;
  brandingPreferLogoOverIcon?: boolean;
  brandingBrandColor?: string | null;
  brandingBrandTextColor?: string | null;
  brandingAccentColor?: string | null;
  brandingAccentTextColor?: string | null;
  paymentLinkTheme?: "light" | "dark" | "system";
  paymentLinkDomain?: string | null;
  emailSendingDomain?: string | null;
  [key: string]: unknown;
};

export type MakePayDomainRefreshKind = "payment-link" | "email-sending" | "all";

export type MakePayCustomerPayload = {
  email?: string;
  customerEmail?: string;
  name?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePaySubscriptionPayload = {
  amountUsd?: string | number;
  customerEmail?: string;
  label?: string;
  description?: string;
  cadence?: string;
  billingIntervalUnit?: "day" | "week" | "month" | "year" | string;
  billingIntervalCount?: number;
  startAt?: string;
  timezone?: string;
  sendPaymentRequestEmail?: boolean;
  clientId?: string;
  [key: string]: unknown;
};

export type MakePayPosTerminalPayload = {
  name: string;
  pin?: string;
  status?: "active" | "paused" | "archived";
  allowedAssets?: string[];
  emailCollectionMode?:
    | "disabled"
    | "optional_after_deposit"
    | "required_after_deposit";
  catalogEnabled?: boolean;
  displaySettings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayProductPayload = {
  name: string;
  description?: string | null;
  sku?: string | null;
  status?: "active" | "draft" | "archived";
  productType?: "physical" | "digital";
  shopSlug?: string;
  category?: string;
  categoryName?: string;
  basePriceUsd?: string | number;
  priceUsd?: string | number;
  trackInventory?: boolean;
  inventoryQuantity?: string | number;
  digitalDeliveryInstructions?: string | null;
  deliveryDetailsPrompt?: string | null;
  images?: Array<string | Record<string, unknown>>;
  variants?: Array<Record<string, unknown>>;
  taxRates?: Array<Record<string, unknown>>;
  discounts?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayShopPayload = {
  slug?: string;
  status?: "active" | "draft" | "archived" | string;
  displayCurrency?: string;
  checkoutMode?: string;
  billingDetailsRequired?: boolean;
  flatShippingFeeUsd?: string | number;
  freeShippingThresholdUsd?: string | number | null;
  menuLinks?: Array<Record<string, unknown>>;
  footerLinks?: Array<Record<string, unknown>>;
  socialLinks?: Record<string, unknown>;
  contactDetails?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  navigationStyle?: string;
  pageSettings?: Record<string, unknown>;
  tracking?: Record<string, unknown>;
  emailTemplates?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayAnonymousSettlementRoute = {
  chain: string;
  address: string;
  asset?: string;
  assetIdentifier?: string;
};

export type MakePayAnonymousPaymentLinkPayload = {
  amount: string | number;
  settlement: {
    currency: string;
    priorities: MakePayAnonymousSettlementRoute[];
    sourceAddresses?:
      | Array<{ chain: string; address: string }>
      | Record<string, string | { address?: string; sourceAddress?: string }>;
    [key: string]: unknown;
  };
  title?: string;
  description?: string;
  fiatCurrency?: string;
  customerEmail?: string;
  orderId?: string;
  clientId?: string;
  returnUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  expirationTime?: "15m" | "1h" | "12h" | "24h" | "72h";
  metadata?: Record<string, string | number | boolean>;
  branding?: {
    name?: string;
    logoUrl?: string;
    brandColor?: string;
    accentColor?: string;
    theme?: "light" | "dark" | "system";
  };
  webhookUrl?: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingCounterpartyPayload = {
  type?: "customer" | "vendor" | "both" | string;
  name?: string;
  email?: string;
  clientId?: string;
  taxId?: string;
  address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoiceLineItemPayload = {
  description: string;
  quantity?: string | number;
  unitAmount?: string | number;
  taxAmount?: string | number;
  totalAmount?: string | number;
  sortOrder?: number;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoicePayload = {
  invoiceNumber?: string;
  status?:
    | "draft"
    | "open"
    | "paid"
    | "partially_paid"
    | "overdue"
    | "void"
    | "uncollectible"
    | string;
  paymentStatus?:
    | "unpaid"
    | "pending"
    | "paid"
    | "partially_paid"
    | "overpaid"
    | string;
  currency?: string;
  issueDate?: string;
  dueDate?: string | null;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  counterparty?: MakePayBookkeepingCounterpartyPayload | null;
  lineItems?: MakePayBookkeepingInvoiceLineItemPayload[];
  documentIds?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoicePaymentLinkOptions = {
  sendEmail?: boolean;
  sendPaymentRequestEmail?: boolean;
};

export type MakePayBookkeepingExpensePayload = {
  expenseNumber?: string;
  status?:
    | "draft"
    | "needs_review"
    | "approved"
    | "paid"
    | "reimbursed"
    | "ignored"
    | string;
  currency?: string;
  amount?: string | number;
  totalAmount?: string | number;
  category?: string | null;
  incurredOn?: string;
  title?: string | null;
  notes?: string | null;
  walletActivityEventId?: string;
  walletActivityEventKey?: string;
  counterparty?: MakePayBookkeepingCounterpartyPayload | null;
  documentIds?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayBookkeepingDocumentUpload = {
  file: Blob;
  fileName?: string;
  documentType?:
    | "invoice"
    | "receipt"
    | "statement"
    | "contract"
    | "other"
    | string;
  invoiceId?: string;
  expenseId?: string;
};

export type MakePayBookkeepingReconciliationPayload = {
  invoiceId?: string;
  expenseId?: string;
  paymentLinkId?: string;
  paymentSessionId?: string;
  subscriptionCycleId?: string;
  walletActivityEventId?: string;
  linkType?: "payment" | "chain_transfer" | "subscription" | "manual" | string;
  amount?: string | number;
  assetSymbol?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayApiErrorBody = {
  error: string;
  errorCode?: string;
  [key: string]: unknown;
};

export type MakePayCompanyReference = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  pictureUrl?: string | null;
  [key: string]: unknown;
};

/** The original merchant payload retained by the partner-v1 serializer. */
export type MakePayPaymentLinkResponsePayload = {
  amount?: string | number;
  fiatCurrency?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Canonical authenticated partner-v1 payment-link shape. The API retains the
 * original payload and also exposes normalized correlation fields at the link
 * level for back-office consumers.
 */
export type MakePayPaymentLink = {
  id: string;
  uid: string;
  publicUrl: string;
  checkoutUrl?: string;
  status: string;
  type?: string;
  donation_slug: string | null;
  link_type: string | null;
  source: string | null;
  title: string | null;
  label: string | null;
  description: string | null;
  amount: string | null;
  fiatAmount: string | null;
  fiatCurrency: string | null;
  amountUsd?: string | number | null;
  currency: string | null;
  asset: string | null;
  orderId: string | null;
  clientId: string | null;
  customerEmail: string | null;
  donationSlug?: string | null;
  metadata: Record<string, unknown>;
  payload: MakePayPaymentLinkResponsePayload;
  latestSession: Record<string, unknown> | null;
  timelineEvents: unknown[];
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type MakePayPaymentLinkResponse = {
  ok?: boolean;
  companyId: string;
  paymentLink: MakePayPaymentLink;
  paymentRequestEmailSent?: boolean;
  paymentRequestEmailError?: string | null;
  [key: string]: unknown;
};

export type MakePayPaymentLinksResponse = {
  companyId: string;
  paymentLinks: MakePayPaymentLink[];
  [key: string]: unknown;
};

export type MakePayDonationLinksResponse = {
  companyId: string;
  donations: MakePayPaymentLink[];
  [key: string]: unknown;
};

export type MakePayPaymentRequestEmailResponse = {
  ok: boolean;
  email: string;
  paymentLink: {
    id: string;
    uid: string;
    donation_slug: string | null;
    link_type: string;
    status: string;
    payload: MakePayPaymentLinkResponsePayload;
    publicUrl: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type MakePayAnonymousPaymentLinkResponse = {
  ok: boolean;
  anonymous: true;
  paymentRequestEmailSent: false;
  paymentRequestEmailError: null;
  paymentLink: {
    id: string;
    uid: string;
    status: string;
    link_type: "one_time";
    payload: MakePayPaymentLinkResponsePayload;
    settlement: Record<string, unknown>;
    branding: Record<string, unknown>;
    publicUrl: string;
    expiresAt: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
    webhook: {
      url: string;
      secret: string;
      secretLast4: string;
    } | null;
    [key: string]: unknown;
  };
  requestId: string;
  [key: string]: unknown;
};

export type MakePayCustomer = {
  id?: string;
  uid?: string;
  email?: string | null;
  name?: string | null;
  clientId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type MakePayCustomersResponse = {
  customers: MakePayCustomer[];
  [key: string]: unknown;
};

export type MakePayCustomerResponse = {
  ok?: boolean;
  customer?: MakePayCustomer;
  portalUrl?: string;
  url?: string;
  [key: string]: unknown;
};

export type MakePaySubscription = {
  id?: string;
  uid?: string;
  status?: string;
  customerEmail?: string | null;
  amountUsd?: string | number | null;
  cadence?: string | null;
  billingIntervalUnit?: string | null;
  billingIntervalCount?: number | null;
  nextBillingAt?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePaySubscriptionsResponse = {
  subscriptions: MakePaySubscription[];
  [key: string]: unknown;
};

export type MakePaySubscriptionResponse = {
  ok?: boolean;
  subscription?: MakePaySubscription;
  [key: string]: unknown;
};

export type MakePayDestinationAssetsResponse = {
  assets?: Array<Record<string, unknown>>;
  destinationAssets?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MakePayWebhookRequestsResponse = {
  webhookRequests?: Array<Record<string, unknown>>;
  requests?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MakePayWebhookSubscriptionEvent =
  | "makepay.payment.*"
  | `makepay.payment.${string}`;

export type MakePayWebhookSubscriptionPayload = {
  url: string;
  events?: MakePayWebhookSubscriptionEvent[];
  active?: boolean;
  description?: string | null;
  metadata?: Record<string, unknown>;
  rotateSecret?: boolean;
  [key: string]: unknown;
};

export type MakePayWebhookSubscription = {
  id: string;
  oauthGrantId: string;
  companyId: string;
  url: string;
  events: MakePayWebhookSubscriptionEvent[];
  active: boolean;
  status: "active" | "disabled";
  description: string | null;
  metadata: Record<string, unknown>;
  secretLast4: string | null;
  secretCreatedAt: string | null;
  secretUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MakePayWebhookSubscriptionResponse = {
  companyId: string;
  ok?: boolean;
  created?: boolean;
  rotated?: boolean;
  subscription: MakePayWebhookSubscription | null;
  /** Returned only when a subscription is created or its secret is rotated. */
  signingSecret?: string;
  [key: string]: unknown;
};

export type MakePayPosTerminal = {
  id?: string;
  uid?: string;
  name?: string;
  status?: string;
  allowedAssets?: string[];
  emailCollectionMode?: string;
  catalogEnabled?: boolean;
  displaySettings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type MakePayPosTerminalsResponse = {
  terminals?: MakePayPosTerminal[];
  posTerminals?: MakePayPosTerminal[];
  [key: string]: unknown;
};

export type MakePayPosTerminalResponse = {
  ok?: boolean;
  terminal?: MakePayPosTerminal;
  posTerminal?: MakePayPosTerminal;
  [key: string]: unknown;
};

export type MakePayProduct = {
  id?: string;
  uid?: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  status?: string;
  productType?: string;
  basePriceUsd?: string | number | null;
  shopSlug?: string | null;
  images?: Array<string | Record<string, unknown>>;
  variants?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type MakePayProductsResponse = {
  products: MakePayProduct[];
  [key: string]: unknown;
};

export type MakePayProductResponse = {
  ok?: boolean;
  product?: MakePayProduct;
  [key: string]: unknown;
};

export type MakePayProductDownloadsResponse = {
  downloads?: Array<Record<string, unknown>>;
  productDownloads?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MakePayShop = {
  id?: string;
  uid?: string;
  slug?: string;
  status?: string;
  displayCurrency?: string;
  checkoutMode?: string;
  branding?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type MakePayShopResponse = {
  ok?: boolean;
  shop: MakePayShop;
  [key: string]: unknown;
};

export type MakePayShopBuilderResponse = {
  blocks?: unknown[];
  builder?: Record<string, unknown>;
  shop?: MakePayShop;
  [key: string]: unknown;
};

export type MakePayDomainResponse = {
  ok?: boolean;
  domain?: string | null;
  status?: string | null;
  verification?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type MakePayShopCouponsResponse = {
  coupons?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MakePayShopCouponResponse = {
  ok?: boolean;
  coupon?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayShopOrdersResponse = {
  orders?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type MakePayBrandingResponse = {
  companyId?: string;
  company?: MakePayCompanyReference | null;
  settings: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePaySettingsResponse = MakePayBrandingResponse;

export type MakePaySettingsUpdateResponse = {
  ok?: boolean;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MakePayBookkeepingCounterparty = {
  id: string;
  uid: string;
  type: string;
  name: string;
  email: string | null;
  clientId: string | null;
  taxId: string | null;
  address: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoiceLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
  taxAmount: string;
  totalAmount: string;
  sortOrder: number;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoice = {
  id: string;
  uid: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  issueDate: string;
  dueDate: string | null;
  title: string | null;
  description: string | null;
  notes: string | null;
  counterparty: MakePayBookkeepingCounterparty | null;
  paymentLinkId: string | null;
  paymentLinkUid: string | null;
  sentAt: string | null;
  paidAt: string | null;
  lineItems: MakePayBookkeepingInvoiceLineItem[];
  documentIds: string[];
  reconciliationIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingExpense = {
  id: string;
  uid: string;
  expenseNumber: string | null;
  status: string;
  currency: string;
  amount: string;
  category: string | null;
  incurredOn: string;
  title: string | null;
  notes: string | null;
  counterparty: MakePayBookkeepingCounterparty | null;
  walletActivityEventId: string | null;
  documentIds: string[];
  reconciliationIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingDocument = {
  id: string;
  uid: string;
  fileName: string;
  contentType: string | null;
  byteSize: number;
  documentType: string;
  ocrStatus: string;
  ocrProvider: string | null;
  ocrModel: string | null;
  ocrResult: Record<string, unknown>;
  ocrError: string | null;
  linkedInvoiceIds: string[];
  linkedExpenseIds: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingReconciliationLink = {
  id: string;
  invoiceId: string | null;
  expenseId: string | null;
  paymentLinkId: string | null;
  paymentSessionId: string | null;
  subscriptionCycleId: string | null;
  walletActivityEventId: string | null;
  linkType: string;
  amount: string | null;
  assetSymbol: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
};

export type MakePayBookkeepingSummary = {
  integrations: string[];
  canOcr: boolean;
  invoices: MakePayBookkeepingInvoice[];
  expenses: MakePayBookkeepingExpense[];
  documents: MakePayBookkeepingDocument[];
  counterparties: MakePayBookkeepingCounterparty[];
  reconciliationLinks: MakePayBookkeepingReconciliationLink[];
  reconciliationQueue: {
    chainTransfers: Array<Record<string, unknown>>;
    completedPayments: Array<Record<string, unknown>>;
  };
  stats: {
    openInvoices: number;
    overdueInvoices: number;
    unreconciledExpenses: number;
    pendingDocuments: number;
  };
  [key: string]: unknown;
};

export type MakePayBookkeepingSummaryResponse = {
  ok?: boolean;
  summary: MakePayBookkeepingSummary;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoicesResponse = {
  invoices: MakePayBookkeepingInvoice[];
  summary: MakePayBookkeepingSummary;
  [key: string]: unknown;
};

export type MakePayBookkeepingInvoiceResponse = {
  invoice: MakePayBookkeepingInvoice;
  [key: string]: unknown;
};

export type MakePayBookkeepingExpensesResponse = {
  expenses: MakePayBookkeepingExpense[];
  summary: MakePayBookkeepingSummary;
  [key: string]: unknown;
};

export type MakePayBookkeepingExpenseResponse = {
  expense: MakePayBookkeepingExpense;
  [key: string]: unknown;
};

export type MakePayBookkeepingDocumentsResponse = {
  documents: MakePayBookkeepingDocument[];
  summary: MakePayBookkeepingSummary;
  [key: string]: unknown;
};

export type MakePayBookkeepingDocumentDownloadResponse = {
  url: string;
  [key: string]: unknown;
};

export type MakePayPublicRequestOptions = {
  /** Origin-only HTTPS URL; exact loopback hosts may use HTTP for local tests. */
  baseUrl?: string;
  fetch?: typeof fetch;
};

export type MakePayIdempotencyOptions = {
  /** 8-200 URL-safe characters; reuse only for an identical mutation. */
  idempotencyKey?: string;
};

export type MakePayRequiredIdempotencyOptions = {
  /** 8-200 URL-safe characters; reuse only for an identical mutation. */
  idempotencyKey: string;
};

export type CreatePaymentLinkOptions = MakePayIdempotencyOptions & {
  status?: "active" | "paused" | "archived";
  sendPaymentRequestEmail?: boolean;
};

export type CreateDonationLinkOptions = Omit<
  CreatePaymentLinkOptions,
  "idempotencyKey"
>;

export type PaymentLinkStatusUpdate = {
  status: "active" | "paused" | "archived";
};

export type MakePayMedusaCorrelationMetadata = {
  medusaOrderId?: string;
  medusaOrderDisplayId?: string;
  medusaAdminUrl?: string;
  medusaInstallationId?: string;
};

export type MakePayPaymentLinkUpdate = {
  status?: PaymentLinkStatusUpdate["status"];
  extendExpirationTime?: "15m" | "1h" | "12h" | "24h" | "72h" | "never";
  invoicePdfUrl?: string;
  skipQuoteAcceptance?: boolean;
  metadata?: MakePayMedusaCorrelationMetadata;
};

export type MakePayRequestOptions = MakePayIdempotencyOptions & {
  query?: Record<string, string | number | boolean | null | undefined>;
};

export type MakePayWebhookVerificationOptions = {
  /** Finite positive freshness window in seconds. Defaults to 300. */
  toleranceSeconds?: number;
};

export type MakePayEmbedViewType = "full" | "minimal";

export type MakePayCheckoutUrlOptions = {
  /** Origin-only HTTPS URL; exact loopback hosts may use HTTP for local tests. */
  baseUrl?: string;
  /** Embedding merchant origin; follows the same HTTPS/loopback policy. */
  parentOrigin?: string;
  viewType?: MakePayEmbedViewType;
};

export type MakePayEmbedSnippetOptions = MakePayCheckoutUrlOptions & {
  buttonLabel?: string;
  iframeTitle?: string;
};

export type MakePayCheckoutEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

export type OpenMakePayCheckoutOptions = MakePayCheckoutUrlOptions & {
  paymentUid: string;
  onEvent?: (event: MakePayCheckoutEvent) => void;
};

export type MountMakePayCheckoutOptions = MakePayCheckoutUrlOptions & {
  container: HTMLElement | string;
  paymentUid: string;
  iframeTitle?: string;
  onEvent?: (event: MakePayCheckoutEvent) => void;
};

export type MountedMakePayCheckout = {
  iframe: HTMLIFrameElement;
  unmount(): void;
};

type MakePayBrowserWindow = Window & {
  makepay?: {
    showPayment?: (
      paymentUid: string,
      options?: {
        onEvent?: (event: MakePayCheckoutEvent) => void;
        viewType?: MakePayEmbedViewType;
      },
    ) => void;
  };
};

export class MakePayError extends Error {
  readonly status: number;
  readonly responseBody: unknown;

  constructor(
    message: string,
    options: { status?: number; responseBody?: unknown } = {},
  ) {
    super(message);
    this.name = "MakePayError";
    this.status = options.status ?? 0;
    this.responseBody = options.responseBody;
  }
}

export class MakePayClient {
  static readonly defaultBaseUrl = "https://www.makecrypto.io";
  static readonly defaultCheckoutBaseUrl = "https://www.makepay.io";
  static readonly version = "0.4.0";

  private readonly baseUrl: string;
  private readonly baseOrigin: string;
  private readonly checkoutBaseUrl: string;
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly authProvider?: MakePayAuthProvider;
  private readonly fetchImpl: typeof fetch;

  constructor(options: MakePayClientOptions) {
    const parsedBaseUrl = parseMakePayApiBaseUrl(
      options.baseUrl ?? MakePayClient.defaultBaseUrl,
    );
    const parsedCheckoutBaseUrl = parseMakePayCheckoutBaseUrl(
      options.checkoutBaseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
    );
    this.baseUrl = parsedBaseUrl.origin;
    this.baseOrigin = parsedBaseUrl.origin;
    this.checkoutBaseUrl = parsedCheckoutBaseUrl.origin;
    this.keyId = options.keyId;
    this.keySecret = options.keySecret;
    this.authProvider = options.authProvider;
    this.fetchImpl = options.fetch ?? globalThis.fetch;

    if (!this.fetchImpl) {
      throw new MakePayError("A fetch implementation is required.");
    }
    const hasApiKey = Boolean(this.keyId && this.keySecret);
    const hasOAuthProvider = Boolean(this.authProvider);
    if (hasApiKey === hasOAuthProvider) {
      throw new MakePayError(
        "Configure either MakePay keyId/keySecret or authProvider.",
      );
    }
  }

  createPaymentLink(
    payload: MakePayPaymentLinkPayload,
    options: CreatePaymentLinkOptions = {},
  ): Promise<MakePayPaymentLinkResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/payment-links",
      {
        status: options.status ?? "active",
        sendPaymentRequestEmail: options.sendPaymentRequestEmail ?? false,
        payload,
      },
      { idempotencyKey: options.idempotencyKey },
    );
  }

  listPaymentLinks(
    query: MakePayRequestOptions["query"] = {},
  ): Promise<MakePayPaymentLinksResponse> {
    return this.request(
      "GET",
      "/api/partner/v1/makepay/payment-links",
      undefined,
      {
        query,
      },
    );
  }

  getPaymentLink(uid: string): Promise<MakePayPaymentLinkResponse> {
    assertNonEmpty(uid, "Payment link UID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/payment-links/${encodeURIComponent(uid)}`,
    );
  }

  updatePaymentLink(
    uid: string,
    updates: MakePayPaymentLinkUpdate,
    options: MakePayIdempotencyOptions = {},
  ): Promise<MakePayPaymentLinkResponse> {
    assertNonEmpty(uid, "Payment link UID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/payment-links/${encodeURIComponent(uid)}`,
      updates,
      options,
    );
  }

  sendPaymentRequestEmail(
    uid: string,
    email?: string,
  ): Promise<MakePayPaymentRequestEmailResponse> {
    assertNonEmpty(uid, "Payment link UID is required.");

    return this.request(
      "POST",
      `/api/partner/v1/makepay/payment-links/${encodeURIComponent(uid)}/send-request-email`,
      email ? { email } : {},
    );
  }

  createDonationLink(
    payload: MakePayDonationLinkPayload,
    options: CreateDonationLinkOptions = {},
  ): Promise<MakePayPaymentLinkResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/donations",
      {
        status: options.status ?? "active",
        sendPaymentRequestEmail: options.sendPaymentRequestEmail ?? false,
        payload: {
          ...payload,
          type: "donation",
        },
      },
    );
  }

  listDonationLinks(): Promise<MakePayDonationLinksResponse> {
    return this.request("GET", "/api/partner/v1/makepay/donations");
  }

  getDonationLink(uid: string): Promise<MakePayPaymentLinkResponse> {
    assertNonEmpty(uid, "Donation link UID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/donations/${encodeURIComponent(uid)}`,
    );
  }

  updateDonationLink(
    uid: string,
    updates: PaymentLinkStatusUpdate,
  ): Promise<MakePayPaymentLinkResponse> {
    assertNonEmpty(uid, "Donation link UID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/donations/${encodeURIComponent(uid)}`,
      updates,
    );
  }

  listCustomers(): Promise<MakePayCustomersResponse> {
    return this.request("GET", "/api/partner/v1/makepay/customers");
  }

  upsertCustomer(
    payload: MakePayCustomerPayload,
  ): Promise<MakePayCustomerResponse> {
    return this.request("POST", "/api/partner/v1/makepay/customers", payload);
  }

  createCustomerPortal(
    customerId: string,
    payload: Record<string, unknown> = {},
  ): Promise<MakePayCustomerResponse> {
    assertNonEmpty(customerId, "Customer ID is required.");

    return this.request(
      "POST",
      `/api/partner/v1/makepay/customers/${encodeURIComponent(customerId)}/portal`,
      payload,
    );
  }

  listSubscriptions(): Promise<MakePaySubscriptionsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/subscriptions");
  }

  createSubscription(
    payload: MakePaySubscriptionPayload,
  ): Promise<MakePaySubscriptionResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/subscriptions",
      payload,
    );
  }

  listDestinationAssets(): Promise<MakePayDestinationAssetsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/destination-assets");
  }

  listWebhookRequests(
    query: MakePayRequestOptions["query"] = {},
  ): Promise<MakePayWebhookRequestsResponse> {
    return this.request(
      "GET",
      "/api/partner/v1/makepay/webhook-requests",
      undefined,
      {
        query,
      },
    );
  }

  getCurrentWebhookSubscription(): Promise<MakePayWebhookSubscriptionResponse> {
    return this.request(
      "GET",
      "/api/partner/v1/makepay/webhook-subscriptions/current",
    );
  }

  upsertCurrentWebhookSubscription(
    payload: MakePayWebhookSubscriptionPayload,
    options: MakePayRequiredIdempotencyOptions,
  ): Promise<MakePayWebhookSubscriptionResponse> {
    assertNonEmpty(payload.url, "Webhook subscription URL is required.");

    return this.request(
      "PUT",
      "/api/partner/v1/makepay/webhook-subscriptions/current",
      payload,
      options,
    );
  }

  deleteCurrentWebhookSubscription(
    options: MakePayRequiredIdempotencyOptions,
  ): Promise<MakePayWebhookSubscriptionResponse> {
    return this.request(
      "DELETE",
      "/api/partner/v1/makepay/webhook-subscriptions/current",
      undefined,
      options,
    );
  }

  listPosTerminals(): Promise<MakePayPosTerminalsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/pos-terminals");
  }

  createPosTerminal(
    payload: MakePayPosTerminalPayload,
  ): Promise<MakePayPosTerminalResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/pos-terminals",
      payload,
    );
  }

  getPosTerminal(terminalId: string): Promise<MakePayPosTerminalResponse> {
    assertNonEmpty(terminalId, "POS terminal ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/pos-terminals/${encodeURIComponent(terminalId)}`,
    );
  }

  updatePosTerminal(
    terminalId: string,
    payload: MakePayPosTerminalPayload,
  ): Promise<MakePayPosTerminalResponse> {
    assertNonEmpty(terminalId, "POS terminal ID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/pos-terminals/${encodeURIComponent(terminalId)}`,
      payload,
    );
  }

  listProducts(): Promise<MakePayProductsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/products");
  }

  createProduct(
    payload: MakePayProductPayload,
  ): Promise<MakePayProductResponse> {
    return this.request("POST", "/api/partner/v1/makepay/products", payload);
  }

  getProduct(productId: string): Promise<MakePayProductResponse> {
    assertNonEmpty(productId, "Product ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/products/${encodeURIComponent(productId)}`,
    );
  }

  updateProduct(
    productId: string,
    payload: MakePayProductPayload,
  ): Promise<MakePayProductResponse> {
    assertNonEmpty(productId, "Product ID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/products/${encodeURIComponent(productId)}`,
      payload,
    );
  }

  listProductDownloads(
    productId: string,
  ): Promise<MakePayProductDownloadsResponse> {
    assertNonEmpty(productId, "Product ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/shop/products/${encodeURIComponent(productId)}/downloads`,
    );
  }

  createProductDownload(
    productId: string,
    payload: Record<string, unknown>,
  ): Promise<MakePayProductDownloadsResponse> {
    assertNonEmpty(productId, "Product ID is required.");

    return this.request(
      "POST",
      `/api/partner/v1/makepay/shop/products/${encodeURIComponent(productId)}/downloads`,
      payload,
    );
  }

  getShop(): Promise<MakePayShopResponse> {
    return this.request("GET", "/api/partner/v1/makepay/shop");
  }

  updateShop(payload: MakePayShopPayload): Promise<MakePayShopResponse> {
    return this.request("PATCH", "/api/partner/v1/makepay/shop", payload);
  }

  getShopBuilder(): Promise<MakePayShopBuilderResponse> {
    return this.request("GET", "/api/partner/v1/makepay/shop/builder");
  }

  updateShopBuilder(payload: {
    blocks?: unknown[];
    [key: string]: unknown;
  }): Promise<MakePayShopBuilderResponse> {
    return this.request("PUT", "/api/partner/v1/makepay/shop/builder", payload);
  }

  getShopDomain(): Promise<MakePayDomainResponse> {
    return this.request("GET", "/api/partner/v1/makepay/shop/domains");
  }

  updateShopDomain(
    input: string | null | { domain?: string | null; [key: string]: unknown },
  ): Promise<MakePayDomainResponse> {
    return this.request(
      "PUT",
      "/api/partner/v1/makepay/shop/domains",
      typeof input === "string" || input === null ? { domain: input } : input,
    );
  }

  refreshShopDomain(
    input: string | { domain?: string | null; [key: string]: unknown } = {},
  ): Promise<MakePayDomainResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/shop/domains",
      typeof input === "string" ? { domain: input } : input,
    );
  }

  listShopCoupons(): Promise<MakePayShopCouponsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/shop/coupons");
  }

  createShopCoupon(
    payload: Record<string, unknown>,
  ): Promise<MakePayShopCouponResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/shop/coupons",
      payload,
    );
  }

  updateShopCoupon(
    couponUid: string,
    payload: Record<string, unknown>,
  ): Promise<MakePayShopCouponResponse> {
    assertNonEmpty(couponUid, "Shop coupon UID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/shop/coupons/${encodeURIComponent(couponUid)}`,
      payload,
    );
  }

  archiveShopCoupon(couponUid: string): Promise<MakePayShopCouponResponse> {
    assertNonEmpty(couponUid, "Shop coupon UID is required.");

    return this.request(
      "DELETE",
      `/api/partner/v1/makepay/shop/coupons/${encodeURIComponent(couponUid)}`,
    );
  }

  listShopOrders(
    query: MakePayRequestOptions["query"] = {},
  ): Promise<MakePayShopOrdersResponse> {
    return this.request(
      "GET",
      "/api/partner/v1/makepay/shop/orders",
      undefined,
      {
        query,
      },
    );
  }

  getBranding(): Promise<MakePayBrandingResponse> {
    return this.request("GET", "/api/partner/v1/makepay/branding");
  }

  updateBranding(
    payload: MakePayBrandingPayload,
  ): Promise<MakePaySettingsUpdateResponse> {
    return this.request("PATCH", "/api/partner/v1/makepay/branding", payload);
  }

  refreshBrandingDomains(
    kind: MakePayDomainRefreshKind = "all",
  ): Promise<MakePaySettingsUpdateResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/branding/domains/refresh",
      {
        kind,
      },
    );
  }

  getBookkeepingSummary(): Promise<MakePayBookkeepingSummaryResponse> {
    return this.request("GET", "/api/partner/v1/makepay/bookkeeping");
  }

  listBookkeepingInvoices(): Promise<MakePayBookkeepingInvoicesResponse> {
    return this.request("GET", "/api/partner/v1/makepay/bookkeeping/invoices");
  }

  createBookkeepingInvoice(
    payload: MakePayBookkeepingInvoicePayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/bookkeeping/invoices",
      payload,
    );
  }

  getBookkeepingInvoice(
    invoiceId: string,
  ): Promise<MakePayBookkeepingInvoiceResponse> {
    assertNonEmpty(invoiceId, "Bookkeeping invoice ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/bookkeeping/invoices/${encodeURIComponent(invoiceId)}`,
    );
  }

  updateBookkeepingInvoice(
    invoiceId: string,
    payload: MakePayBookkeepingInvoicePayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    assertNonEmpty(invoiceId, "Bookkeeping invoice ID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/bookkeeping/invoices/${encodeURIComponent(invoiceId)}`,
      payload,
    );
  }

  createBookkeepingInvoicePaymentLink(
    invoiceId: string,
    options: MakePayBookkeepingInvoicePaymentLinkOptions = {},
  ): Promise<MakePayBookkeepingSummaryResponse> {
    assertNonEmpty(invoiceId, "Bookkeeping invoice ID is required.");

    return this.request(
      "POST",
      `/api/partner/v1/makepay/bookkeeping/invoices/${encodeURIComponent(invoiceId)}/payment-link`,
      options,
    );
  }

  listBookkeepingExpenses(): Promise<MakePayBookkeepingExpensesResponse> {
    return this.request("GET", "/api/partner/v1/makepay/bookkeeping/expenses");
  }

  createBookkeepingExpense(
    payload: MakePayBookkeepingExpensePayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/bookkeeping/expenses",
      payload,
    );
  }

  createBookkeepingExpenseFromActivity(
    payload: MakePayBookkeepingExpensePayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/bookkeeping/expenses/from-activity",
      payload,
    );
  }

  getBookkeepingExpense(
    expenseId: string,
  ): Promise<MakePayBookkeepingExpenseResponse> {
    assertNonEmpty(expenseId, "Bookkeeping expense ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/bookkeeping/expenses/${encodeURIComponent(expenseId)}`,
    );
  }

  updateBookkeepingExpense(
    expenseId: string,
    payload: MakePayBookkeepingExpensePayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    assertNonEmpty(expenseId, "Bookkeeping expense ID is required.");

    return this.request(
      "PATCH",
      `/api/partner/v1/makepay/bookkeeping/expenses/${encodeURIComponent(expenseId)}`,
      payload,
    );
  }

  listBookkeepingDocuments(): Promise<MakePayBookkeepingDocumentsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/bookkeeping/documents");
  }

  uploadBookkeepingDocument(
    input: MakePayBookkeepingDocumentUpload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    const formData = new FormData();
    if (input.fileName) {
      formData.set("file", input.file, input.fileName);
    } else {
      formData.set("file", input.file);
    }

    if (input.documentType) {
      formData.set("documentType", input.documentType);
    }
    if (input.invoiceId) {
      formData.set("invoiceId", input.invoiceId);
    }
    if (input.expenseId) {
      formData.set("expenseId", input.expenseId);
    }

    return this.requestFormData(
      "POST",
      "/api/partner/v1/makepay/bookkeeping/documents",
      formData,
    );
  }

  getBookkeepingDocumentDownloadUrl(
    documentId: string,
  ): Promise<MakePayBookkeepingDocumentDownloadResponse> {
    assertNonEmpty(documentId, "Bookkeeping document ID is required.");

    return this.request(
      "GET",
      `/api/partner/v1/makepay/bookkeeping/documents/${encodeURIComponent(documentId)}/download`,
    );
  }

  runBookkeepingDocumentOcr(
    documentId: string,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    assertNonEmpty(documentId, "Bookkeeping document ID is required.");

    return this.request(
      "POST",
      `/api/partner/v1/makepay/bookkeeping/documents/${encodeURIComponent(documentId)}/ocr`,
      {},
    );
  }

  createBookkeepingReconciliation(
    payload: MakePayBookkeepingReconciliationPayload,
  ): Promise<MakePayBookkeepingSummaryResponse> {
    return this.request(
      "POST",
      "/api/partner/v1/makepay/bookkeeping/reconciliation",
      payload,
    );
  }

  getSettings(): Promise<MakePaySettingsResponse> {
    return this.request("GET", "/api/partner/v1/makepay/settings");
  }

  updateSettings(
    settings: Record<string, unknown>,
  ): Promise<MakePaySettingsUpdateResponse> {
    return this.request("PUT", "/api/partner/v1/makepay/settings", settings);
  }

  hostedCheckoutUrl(paymentUid: string): string {
    return buildMakePayHostedCheckoutUrl(paymentUid, {
      baseUrl: this.checkoutBaseUrl,
    });
  }

  hostedDonationUrl(donationSlug: string): string {
    return buildMakePayHostedDonationUrl(donationSlug, {
      baseUrl: this.checkoutBaseUrl,
    });
  }

  embeddedCheckoutUrl(
    paymentUid: string,
    options: Omit<MakePayCheckoutUrlOptions, "baseUrl"> = {},
  ): string {
    return buildMakePayEmbeddedCheckoutUrl(paymentUid, {
      ...options,
      baseUrl: this.checkoutBaseUrl,
    });
  }

  embeddedDonationUrl(
    donationSlug: string,
    options: Omit<MakePayCheckoutUrlOptions, "baseUrl"> = {},
  ): string {
    return buildMakePayEmbeddedDonationUrl(donationSlug, {
      ...options,
      baseUrl: this.checkoutBaseUrl,
    });
  }

  modalScriptUrl(): string {
    return buildMakePayModalScriptUrl({ baseUrl: this.checkoutBaseUrl });
  }

  embedButtonHtml(
    paymentUid: string,
    options: Omit<MakePayEmbedSnippetOptions, "baseUrl"> = {},
  ): string {
    return buildMakePayEmbedButtonHtml(paymentUid, {
      ...options,
      baseUrl: this.checkoutBaseUrl,
    });
  }

  iframeHtml(
    paymentUid: string,
    options: Omit<MakePayEmbedSnippetOptions, "baseUrl"> = {},
  ): string {
    return buildMakePayIframeHtml(paymentUid, {
      ...options,
      baseUrl: this.checkoutBaseUrl,
    });
  }

  async request(
    method: MakePayHttpMethod,
    path: string,
    body?: unknown,
    options: MakePayRequestOptions = {},
  ): Promise<any> {
    const url = this.buildApiUrl(path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const requestBody =
      body !== undefined && method !== "GET" ? JSON.stringify(body) : undefined;
    const response = await this.authenticatedFetch(
      method,
      url,
      requestBody,
      requestBody === undefined ? undefined : "application/json",
      options,
    );
    return decodeMakePayResponse(response);
  }

  async requestFormData(
    method: "POST" | "PATCH" | "PUT",
    path: string,
    body: FormData,
    options: MakePayRequestOptions = {},
  ): Promise<any> {
    const url = this.buildApiUrl(path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await this.authenticatedFetch(
      method,
      url,
      body,
      undefined,
      options,
    );

    return decodeMakePayResponse(response);
  }

  private buildApiUrl(path: string): URL {
    if (!path.startsWith("/")) {
      throw new MakePayError("MakePay API path must start with '/'.");
    }

    const url = new URL(`${this.baseUrl}${path}`);
    if (
      url.origin !== this.baseOrigin ||
      Boolean(url.username) ||
      Boolean(url.password)
    ) {
      throw new MakePayError("MakePay API path must remain on the base origin.");
    }

    return url;
  }

  private async authenticatedFetch(
    method: MakePayHttpMethod,
    url: URL,
    body: BodyInit | undefined,
    contentType: string | undefined,
    options: MakePayRequestOptions,
  ): Promise<Response> {
    const idempotencyKey = options.idempotencyKey?.trim();
    if (
      options.idempotencyKey !== undefined &&
      (!idempotencyKey || !MAKEPAY_IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey))
    ) {
      throw new MakePayError(
        "Idempotency key must contain 8 to 200 URL-safe characters.",
        { status: 400 },
      );
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const retry = attempt === 1;
      const requestContext: MakePayAuthRequest = {
        method,
        retry,
        url: url.toString(),
      };
      const headers = new Headers({
        accept: "application/json",
        "user-agent": `MakePayJS/${MakePayClient.version}`,
      });

      if (contentType) {
        headers.set("content-type", contentType);
      }
      if (idempotencyKey) {
        headers.set("idempotency-key", idempotencyKey);
      }

      if (this.authProvider) {
        const authorization =
          await this.authProvider.getAuthorization(requestContext);
        const accessToken = authorization.accessToken?.trim();
        if (!accessToken) {
          throw new MakePayError(
            "OAuth authProvider returned an empty access token.",
          );
        }

        const tokenType = authorization.tokenType ?? "Bearer";
        if (tokenType === "DPoP" && !authorization.dpopProof?.trim()) {
          throw new MakePayError(
            "OAuth authProvider must return a DPoP proof for DPoP tokens.",
          );
        }

        headers.set("authorization", `${tokenType} ${accessToken}`);
        if (authorization.dpopProof) {
          headers.set("dpop", authorization.dpopProof);
        }
      } else {
        headers.set("x-makecrypto-key-id", this.keyId!);
        headers.set("x-makecrypto-key-secret", this.keySecret!);
      }

      const response = await this.fetchImpl(url, {
        body,
        headers,
        method,
        // Custom API-key and DPoP headers are not guaranteed to be stripped
        // by every fetch implementation when following a cross-origin redirect.
        redirect: "manual",
      });

      if (
        response.status === 401 &&
        attempt === 0 &&
        this.authProvider?.refreshAuthorization
      ) {
        await this.authProvider.refreshAuthorization({
          ...requestContext,
          response,
        });
        continue;
      }

      return response;
    }

    throw new MakePayError("MakePay authentication retry failed.");
  }
}

export async function createAnonymousPaymentLink(
  payload: MakePayAnonymousPaymentLinkPayload,
  options: MakePayPublicRequestOptions = {},
): Promise<MakePayAnonymousPaymentLinkResponse> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new MakePayError("A fetch implementation is required.");
  }

  const baseUrl = parseMakePayApiBaseUrl(
    options.baseUrl ?? MakePayClient.defaultBaseUrl,
  );
  const url = new URL(
    "/api/partner/v1/makepay/payment-links",
    `${baseUrl.origin}/`,
  );
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
  });
  const response = await fetchImpl(url, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
    redirect: "manual",
  });

  return decodeMakePayResponse(
    response,
  ) as Promise<MakePayAnonymousPaymentLinkResponse>;
}

export const createAnonymousMakePayPaymentLink = createAnonymousPaymentLink;

/** Generate a P-256 key pair suitable for MakeCrypto native OAuth DPoP. */
export function generateMakePayDpopKeyPair(): MakePayDpopKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const publicJwk = normalizeMakePayDpopPublicJwk(
    publicKey.export({ format: "jwk" }),
  );

  return {
    privateKeyPem: privateKey
      .export({ format: "pem", type: "pkcs8" })
      .toString(),
    publicJwk,
    thumbprint: calculateMakePayDpopJwkThumbprint(publicJwk),
  };
}

/** Calculate the RFC 7638 SHA-256 thumbprint used as the DPoP `jkt`. */
export function calculateMakePayDpopJwkThumbprint(
  publicJwk: MakePayDpopPublicJwk,
): string {
  const jwk = normalizeMakePayDpopPublicJwk(publicJwk);
  const canonicalJwk = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });

  return createHash("sha256").update(canonicalJwk).digest("base64url");
}

/** Create a fresh ES256 DPoP proof for an API or OAuth token request. */
export function createMakePayDpopProof(
  options: MakePayDpopProofOptions,
): string {
  const method = options.method.trim().toUpperCase();
  assertNonEmpty(method, "DPoP HTTP method is required.");
  assertNonEmpty(options.privateKey, "DPoP private key is required.");

  let url: URL;
  try {
    url = new URL(options.url);
  } catch {
    throw new MakePayError("DPoP URL must be an absolute URL.");
  }
  if (!isMakePaySecureTransportUrl(options.url, url)) {
    throw new MakePayError(
      "DPoP URL must be an HTTPS URL without embedded credentials; HTTP is allowed only for exact loopback hosts localhost, 127.0.0.1, or [::1].",
    );
  }
  // RFC 9449 section 4.2 defines `htu` without query and fragment parts.
  url.search = "";
  url.hash = "";

  let privateKey: ReturnType<typeof createPrivateKey>;
  let publicJwk: MakePayDpopPublicJwk;
  try {
    privateKey = createPrivateKey(options.privateKey);
    publicJwk = normalizeMakePayDpopPublicJwk(
      createPublicKey(privateKey).export({ format: "jwk" }),
    );
  } catch {
    throw new MakePayError("Invalid P-256 DPoP private key.");
  }

  const header = {
    typ: "dpop+jwt",
    alg: "ES256",
    jwk: publicJwk,
  };
  const payload: Record<string, string | number> = {
    htu: url.toString(),
    htm: method,
    iat: options.issuedAt ?? Math.floor(Date.now() / 1000),
    jti: options.jti ?? randomUUID(),
  };
  if (options.accessToken) {
    payload.ath = createHash("sha256")
      .update(options.accessToken)
      .digest("base64url");
  }

  const signingInput = `${encodeBase64UrlJson(header)}.${encodeBase64UrlJson(payload)}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    dsaEncoding: "ieee-p1363",
    key: privateKey,
  });

  return `${signingInput}.${signature.toString("base64url")}`;
}

export function buildMakePayHostedCheckoutUrl(
  paymentUid: string,
  options: MakePayCheckoutUrlOptions = {},
): string {
  assertNonEmpty(paymentUid, "Payment link UID is required.");

  const baseUrl = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  );
  return new URL(
    `/payment/${encodeURIComponent(paymentUid)}`,
    `${baseUrl.origin}/`,
  ).toString();
}

export function buildMakePayHostedDonationUrl(
  donationSlug: string,
  options: MakePayCheckoutUrlOptions = {},
): string {
  assertNonEmpty(donationSlug, "Donation slug is required.");

  const baseUrl = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  );
  return new URL(
    `/donations/${encodeURIComponent(donationSlug)}`,
    `${baseUrl.origin}/`,
  ).toString();
}

export function buildMakePayEmbeddedCheckoutUrl(
  paymentUid: string,
  options: MakePayCheckoutUrlOptions = {},
): string {
  assertNonEmpty(paymentUid, "Payment link UID is required.");

  const baseUrl = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  );
  const url = new URL(
    `/embed/payment/${encodeURIComponent(paymentUid)}`,
    `${baseUrl.origin}/`,
  );

  if (options.parentOrigin !== undefined) {
    url.searchParams.set(
      "parentOrigin",
      parseMakePayParentOrigin(options.parentOrigin).origin,
    );
  }
  appendMakePayEmbedViewType(url, options.viewType);

  return url.toString();
}

export function buildMakePayEmbeddedDonationUrl(
  donationSlug: string,
  options: MakePayCheckoutUrlOptions = {},
): string {
  assertNonEmpty(donationSlug, "Donation slug is required.");

  const baseUrl = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  );
  const url = new URL(
    `/embed/donations/${encodeURIComponent(donationSlug)}`,
    `${baseUrl.origin}/`,
  );

  if (options.parentOrigin !== undefined) {
    url.searchParams.set(
      "parentOrigin",
      parseMakePayParentOrigin(options.parentOrigin).origin,
    );
  }
  appendMakePayEmbedViewType(url, options.viewType);

  return url.toString();
}

export function buildMakePayModalScriptUrl(
  options: Pick<MakePayCheckoutUrlOptions, "baseUrl"> = {},
): string {
  const baseUrl = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  );

  if (
    baseUrl.origin === MakePayClient.defaultCheckoutBaseUrl ||
    baseUrl.origin === "https://makepay.io"
  ) {
    return MAKEPAY_MODAL_SCRIPT_CDN_URL;
  }

  return new URL("/modal/makepay.min.js", `${baseUrl.origin}/`).toString();
}

export function buildMakePayEmbedButtonHtml(
  paymentUid: string,
  options: MakePayEmbedSnippetOptions = {},
): string {
  assertNonEmpty(paymentUid, "Payment link UID is required.");

  const buttonLabel = options.buttonLabel ?? "Pay with crypto";

  return [
    `<script src="${escapeHtmlAttribute(buildMakePayModalScriptUrl(options))}"></script>`,
    `<button type="button" data-makepay-payment-link="${escapeHtmlAttribute(paymentUid)}"${makePayViewTypeAttribute(options.viewType)}>`,
    `  ${escapeHtmlText(buttonLabel)}`,
    `</button>`,
  ].join("\n");
}

export function buildMakePayIframeHtml(
  paymentUid: string,
  options: MakePayEmbedSnippetOptions = {},
): string {
  return [
    `<iframe`,
    `  title="${escapeHtmlAttribute(options.iframeTitle ?? "MakePay checkout")}"`,
    `  src="${escapeHtmlAttribute(buildMakePayEmbeddedCheckoutUrl(paymentUid, options))}"`,
    `  style="width:100%;min-height:720px;border:0;border-radius:12px;"`,
    `  allow="clipboard-read; clipboard-write"`,
    `></iframe>`,
  ].join("\n");
}

export function loadMakePayModalScript(
  options: Pick<MakePayCheckoutUrlOptions, "baseUrl"> & {
    document?: Document;
  } = {},
): Promise<void> {
  const doc = options.document ?? globalThis.document;
  if (!doc) {
    return Promise.reject(new MakePayError("A browser document is required."));
  }

  const src = buildMakePayModalScriptUrl(options);
  const existing = doc.querySelector<HTMLScriptElement>(
    `script[src="${cssEscape(src)}"]`,
  );
  if (existing) {
    return existing.dataset.makepayLoaded === "true"
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () =>
              reject(new MakePayError("Failed to load MakePay modal script.")),
            { once: true },
          );
        });
  }

  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.makepayLoaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new MakePayError("Failed to load MakePay modal script.")),
      { once: true },
    );
    doc.head.append(script);
  });
}

export async function openMakePayCheckout(
  options: OpenMakePayCheckoutOptions,
): Promise<void> {
  const win = globalThis.window as MakePayBrowserWindow | undefined;
  if (!win) {
    throw new MakePayError("A browser window is required.");
  }

  await loadMakePayModalScript({
    baseUrl: options.baseUrl,
    document: win.document,
  });
  if (!win.makepay?.showPayment) {
    throw new MakePayError(
      "MakePay modal script did not expose window.makepay.showPayment.",
    );
  }

  win.makepay.showPayment(options.paymentUid, {
    onEvent: options.onEvent,
    viewType: options.viewType,
  });
}

export function mountMakePayCheckout(
  options: MountMakePayCheckoutOptions,
): MountedMakePayCheckout {
  const parentOrigin = options.parentOrigin ?? globalThis.location?.origin;
  const normalizedParentOrigin =
    parentOrigin === undefined
      ? undefined
      : parseMakePayParentOrigin(parentOrigin).origin;
  const container = resolveContainer(options.container);
  const allowedOrigin = parseMakePayCheckoutBaseUrl(
    options.baseUrl ?? MakePayClient.defaultCheckoutBaseUrl,
  ).origin;
  const iframe = document.createElement("iframe");
  iframe.title = options.iframeTitle ?? "MakePay checkout";
  iframe.src = buildMakePayEmbeddedCheckoutUrl(options.paymentUid, {
    baseUrl: options.baseUrl,
    parentOrigin: normalizedParentOrigin,
    viewType: options.viewType,
  });
  iframe.style.width = "100%";
  iframe.style.minHeight = "720px";
  iframe.style.border = "0";
  iframe.style.borderRadius = "12px";
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");

  const handleMessage = (event: MessageEvent<MakePayCheckoutEvent>) => {
    if (
      event.origin !== allowedOrigin ||
      !event.data ||
      typeof event.data.type !== "string"
    ) {
      return;
    }

    options.onEvent?.(event.data);
  };

  window.addEventListener("message", handleMessage);
  container.append(iframe);

  return {
    iframe,
    unmount() {
      window.removeEventListener("message", handleMessage);
      iframe.remove();
    },
  };
}

export function verifyMakePayWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
  options: MakePayWebhookVerificationOptions = {},
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = parseSignatureHeader(signatureHeader);
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (
    !Number.isFinite(timestamp) ||
    !signature ||
    !/^[a-f0-9]+$/i.test(signature)
  ) {
    return false;
  }

  const toleranceSeconds = options.toleranceSeconds ?? 300;
  if (
    !Number.isFinite(toleranceSeconds) ||
    toleranceSeconds <= 0 ||
    Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");

  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function parseMakePayWebhook<T = Record<string, unknown>>(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
  options: MakePayWebhookVerificationOptions = {},
): T {
  if (!verifyMakePayWebhook(rawBody, signatureHeader, secret, options)) {
    throw new MakePayError("Invalid MakePay webhook signature.", {
      status: 401,
    });
  }

  const parsed = safeJsonParse(
    Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody,
  );
  if (!isRecord(parsed)) {
    throw new MakePayError("Invalid MakePay webhook JSON body.", {
      status: 400,
    });
  }

  return parsed as T;
}

function parseSignatureHeader(header: string): Record<string, string> {
  return Object.fromEntries(
    header
      .split(",")
      .map((part) => part.trim().split("=", 2))
      .filter(
        (part): part is [string, string] => part.length === 2 && part[0] !== "",
      ),
  );
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function decodeMakePayResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  const decoded = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    throw new MakePayError(readErrorMessage(decoded, response.status), {
      responseBody: decoded,
      status: response.status,
    });
  }

  return isRecord(decoded) ? decoded : {};
}

function readErrorMessage(decoded: unknown, status: number): string {
  if (isRecord(decoded) && typeof decoded.error === "string") {
    return decoded.error;
  }

  return `MakePay API request failed with HTTP ${status}.`;
}

function assertNonEmpty(value: string, message: string): void {
  if (!value.trim()) {
    throw new MakePayError(message, { status: 400 });
  }
}

const MAKEPAY_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~:+\/=\-]{8,200}$/;
const MAKEPAY_NETWORK_ORIGIN_PATTERN =
  /^([a-z][a-z\d+.-]*):\/\/(\[[^\]]+\]|[^:/?#]+)(?::[0-9]+)?\/?$/i;
const MAKEPAY_URL_AUTHORITY_PATTERN =
  /^[a-z][a-z\d+.-]*:\/\/(\[[^\]]+\]|[^:/?#@]+)(?::[0-9]+)?(?=\/|[?#]|$)/i;
const MAKEPAY_HTTP_LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);

function parseMakePayApiBaseUrl(value: string): URL {
  return parseMakePayNetworkOrigin(value, "MakePay baseUrl");
}

function parseMakePayCheckoutBaseUrl(value: string): URL {
  return parseMakePayNetworkOrigin(value, "MakePay checkout baseUrl");
}

function parseMakePayParentOrigin(value: string): URL {
  return parseMakePayNetworkOrigin(value, "MakePay parentOrigin");
}

function parseMakePayNetworkOrigin(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidMakePayNetworkOrigin(label);
  }

  if (
    !MAKEPAY_NETWORK_ORIGIN_PATTERN.test(value) ||
    !isMakePaySecureTransportUrl(value, url) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw invalidMakePayNetworkOrigin(label);
  }

  return url;
}

function isMakePaySecureTransportUrl(value: string, url: URL): boolean {
  const rawHostname =
    MAKEPAY_URL_AUTHORITY_PATTERN.exec(value)?.[1]?.toLowerCase();
  return Boolean(
    rawHostname &&
      !/\s/.test(value) &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          MAKEPAY_HTTP_LOOPBACK_HOSTS.has(rawHostname))) &&
      !url.username &&
      !url.password,
  );
}

function invalidMakePayNetworkOrigin(label: string): MakePayError {
  return new MakePayError(
    `${label} must be an HTTPS origin without credentials, path, query, or fragment; HTTP is allowed only for exact loopback hosts localhost, 127.0.0.1, or [::1].`,
  );
}

function normalizeMakePayDpopPublicJwk(
  value: JsonWebKey | MakePayDpopPublicJwk,
): MakePayDpopPublicJwk {
  if (
    value.kty !== "EC" ||
    value.crv !== "P-256" ||
    typeof value.x !== "string" ||
    !value.x ||
    typeof value.y !== "string" ||
    !value.y
  ) {
    throw new MakePayError("DPoP key must be an EC P-256 key.");
  }

  return {
    crv: "P-256",
    kty: "EC",
    x: value.x,
    y: value.y,
  };
}

function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function normalizeMakePayEmbedViewType(
  viewType: MakePayEmbedViewType | undefined,
): MakePayEmbedViewType | null {
  return viewType === "minimal" || viewType === "full" ? viewType : null;
}

function appendMakePayEmbedViewType(
  url: URL,
  viewType: MakePayEmbedViewType | undefined,
): void {
  const normalized = normalizeMakePayEmbedViewType(viewType);
  if (normalized) {
    url.searchParams.set("viewType", normalized);
  }
}

function makePayViewTypeAttribute(
  viewType: MakePayEmbedViewType | undefined,
): string {
  const normalized = normalizeMakePayEmbedViewType(viewType);
  return normalized
    ? ` data-makepay-view-type="${escapeHtmlAttribute(normalized)}"`
    : "";
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(value)
    : value.replaceAll('"', '\\"');
}

function resolveContainer(container: HTMLElement | string): HTMLElement {
  if (typeof container !== "string") {
    return container;
  }

  const element = document.querySelector<HTMLElement>(container);
  if (!element) {
    throw new MakePayError(`Container not found for selector: ${container}`);
  }

  return element;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const MakePay = MakePayClient;

import crypto from "node:crypto";
import { withDbContext } from "../db/context.js";
import { createAuditLog } from "../db/queries/auditLogs.js";
import { findInvoiceById, markInvoicePaid } from "../db/queries/invoices.js";
import {
  capturePayment,
  createPayment,
  findOpenCashfreePaymentForInvoice,
  findPaymentByOrderId,
  findPaymentByPaymentId,
} from "../db/queries/payments.js";
import { findResidentById } from "../db/queries/residents.js";
import { findSocietyById } from "../db/queries/societies.js";
import { findUserById } from "../db/queries/users.js";

const API_VERSION = "2023-08-01";

function getCashfreeConfig() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  const env =
    process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  const baseUrl =
    env === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";
  return { clientId, clientSecret, env, baseUrl };
}

function paiseToRupees(paise) {
  return Number((paise / 100).toFixed(2));
}

function customerPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return "9999999999";
}

async function cashfreeRequest(config, method, path, body) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      "x-api-version": API_VERSION,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      `Cashfree request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Cashfree: HMAC-SHA256(timestamp + rawBody) as base64, using client secret.
 */
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  const config = getCashfreeConfig();
  if (!config || !signature || !timestamp) {
    return false;
  }
  const raw =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", config.clientSecret)
    .update(timestamp + raw)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(String(signature)),
    );
  } catch {
    return false;
  }
}

export async function createResidentPaymentOrder(
  userId,
  societyId,
  invoiceId,
) {
  const config = getCashfreeConfig();
  if (!config) {
    return { error: "cashfree_not_configured" };
  }

  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

  return withDbContext({ societyId }, async (tx) => {
    const user = await findUserById(tx, userId);
    if (!user || !user.residentId) {
      return { error: "no_resident_profile" };
    }

    const society = await findSocietyById(tx, societyId);
    if (!society?.cashfreeVendorId) {
      return { error: "vendor_missing" };
    }

    const invoice = await findInvoiceById(tx, invoiceId);
    if (!invoice || invoice.societyId !== societyId) {
      return { error: "not_found" };
    }
    if (invoice.billedResidentId !== user.residentId) {
      return { error: "forbidden" };
    }
    if (invoice.status !== "pending") {
      return { error: "not_pending" };
    }

    const resident = await findResidentById(tx, user.residentId);
    const amountRupees = paiseToRupees(invoice.amountPaise);

    const existing = await findOpenCashfreePaymentForInvoice(tx, invoiceId);
    if (existing?.cashfreeOrderId) {
      try {
        const order = await cashfreeRequest(
          config,
          "GET",
          `/orders/${encodeURIComponent(existing.cashfreeOrderId)}`,
        );
        if (order?.payment_session_id) {
          return {
            paymentSessionId: order.payment_session_id,
            orderId: existing.cashfreeOrderId,
            amountPaise: existing.amountPaise,
            currency: "INR",
            environment: config.env,
            invoiceId: invoice.id,
            paymentId: existing.id,
          };
        }
      } catch {
        // Fall through and create a fresh order.
      }
    }

    const orderId = `ams_${invoice.id.replace(/-/g, "").slice(0, 20)}_${Date.now().toString(36)}`;
    const returnUrl = `${clientOrigin}/${society.slug}/resident?payment=return`;

    let order;
    try {
      order = await cashfreeRequest(config, "POST", "/orders", {
        order_id: orderId,
        order_amount: amountRupees,
        order_currency: "INR",
        customer_details: {
          customer_id: user.residentId.replace(/-/g, "").slice(0, 50),
          customer_phone: customerPhone(resident?.phone),
          customer_email: resident?.email || user.email || undefined,
          customer_name: resident?.name || undefined,
        },
        order_meta: {
          return_url: returnUrl,
        },
        order_note: `Maintenance ${invoice.billingPeriod}`,
        order_tags: {
          invoice_id: invoice.id,
          society_id: societyId,
          flat_id: invoice.flatId,
        },
        order_splits: [
          {
            vendor_id: society.cashfreeVendorId,
            amount: amountRupees,
          },
        ],
      });
    } catch (err) {
      return {
        error: "cashfree_order_failed",
        message: err.message || "Cashfree order failed",
      };
    }

    const payment = await createPayment(tx, {
      societyId,
      invoiceId: invoice.id,
      amountPaise: invoice.amountPaise,
      method: "cashfree",
      status: "created",
      cashfreeOrderId: order.order_id || orderId,
    });

    await createAuditLog(tx, {
      societyId,
      actorUserId: userId,
      action: "payment.order_created",
      entityType: "payment",
      entityId: payment.id,
      meta: {
        invoiceId: invoice.id,
        cashfreeOrderId: payment.cashfreeOrderId,
        amountPaise: invoice.amountPaise,
        vendorId: society.cashfreeVendorId,
      },
    });

    return {
      paymentSessionId: order.payment_session_id,
      orderId: payment.cashfreeOrderId,
      amountPaise: invoice.amountPaise,
      currency: "INR",
      environment: config.env,
      invoiceId: invoice.id,
      paymentId: payment.id,
    };
  });
}

/**
 * Handle PAYMENT_SUCCESS. Idempotent on cashfree_payment_id.
 */
export async function handleCashfreeWebhook(event) {
  const eventType = event?.type || event?.event;
  if (eventType !== "PAYMENT_SUCCESS") {
    return { ok: true, ignored: true, eventType };
  }

  const data = event.data ?? event;
  const orderId =
    data?.order?.order_id ||
    data?.order_id ||
    event.order?.order_id;
  const cashfreePaymentId = String(
    data?.payment?.cf_payment_id ||
      data?.payment?.payment_id ||
      data?.cf_payment_id ||
      "",
  );

  if (!orderId) {
    return { ok: false, error: "missing_ids" };
  }

  return settleByOrderId(orderId, cashfreePaymentId || null);
}

async function settleByOrderId(orderId, cashfreePaymentId) {
  return withDbContext({ isPlatformSuperadmin: true }, async (tx) => {
    if (cashfreePaymentId) {
      const already = await findPaymentByPaymentId(tx, cashfreePaymentId);
      if (already && already.status === "captured") {
        return { ok: true, duplicate: true };
      }
    }

    const payment = await findPaymentByOrderId(tx, orderId);
    if (!payment) {
      return { ok: false, error: "payment_not_found" };
    }

    if (payment.status === "captured") {
      return { ok: true, duplicate: true };
    }

    await capturePayment(tx, payment.id, {
      cashfreePaymentId,
      status: "captured",
    });

    await markInvoicePaid(tx, payment.invoiceId);

    await createAuditLog(tx, {
      societyId: payment.societyId,
      actorUserId: null,
      action: "payment.webhook_captured",
      entityType: "payment",
      entityId: payment.id,
      meta: {
        cashfreeOrderId: orderId,
        cashfreePaymentId,
        invoiceId: payment.invoiceId,
      },
    });

    return {
      ok: true,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
    };
  });
}

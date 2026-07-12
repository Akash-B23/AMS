function loadCashfreeScript(environment) {
  const mode = environment === "production" ? "production" : "sandbox";
  const existing = document.querySelector(
    `script[data-ams-cashfree="${mode}"]`,
  );
  if (existing && window.Cashfree) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://sdk.cashfree.com/js/v3/cashfree.js`;
    script.dataset.amsCashfree = mode;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Cashfree Checkout"));
    document.body.appendChild(script);
  });
}

/**
 * Open Cashfree Checkout. Resolves when the modal closes.
 * Invoice paid state is confirmed server-side via webhook — do not treat this as final.
 */
export async function openCashfreeCheckout({
  paymentSessionId,
  environment = "sandbox",
}) {
  await loadCashfreeScript(environment);
  const mode = environment === "production" ? "production" : "sandbox";
  const cashfree = window.Cashfree({ mode });

  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_modal",
  });

  return {
    closed: true,
    successCallback: result?.paymentDetails != null,
    result,
  };
}

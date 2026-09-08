import OrderThanksClient from "./order-thanks-client";

/** Return URL after product checkout — paid status still comes from capture/webhook. */
export default async function OrderThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string; psp?: string }>;
}) {
  const { order, token, psp } = await searchParams;
  return <OrderThanksClient orderId={order} paypalToken={token} psp={psp} />;
}

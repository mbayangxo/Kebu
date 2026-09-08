/** Shipping carriers for shop fulfillment + public tracking links. */
export const SHOP_CARRIERS = [
  { id: "dhl", label: "DHL" },
  { id: "fedex", label: "FedEx" },
  { id: "ups", label: "UPS" },
  { id: "usps", label: "USPS" },
  { id: "chronopost", label: "Chronopost" },
  { id: "colissimo", label: "Colissimo" },
  { id: "laposte", label: "La Poste" },
  { id: "dpd", label: "DPD" },
  { id: "gls", label: "GLS" },
  { id: "aramex", label: "Aramex" },
  { id: "jt", label: "J&T Express" },
  { id: "yango", label: "Yango Delivery" },
  { id: "local", label: "Local courier" },
  { id: "pickup", label: "Pickup / in person" },
  { id: "other", label: "Other" },
] as const;

export type ShopCarrierId = (typeof SHOP_CARRIERS)[number]["id"];

export const SHOP_CARRIER_IDS = SHOP_CARRIERS.map((c) => c.id) as [
  ShopCarrierId,
  ...ShopCarrierId[],
];

export function isShopCarrierId(v: string): v is ShopCarrierId {
  return SHOP_CARRIERS.some((c) => c.id === v);
}

export function carrierLabel(id: string | null | undefined): string {
  const found = SHOP_CARRIERS.find((c) => c.id === id);
  return found?.label ?? (id?.trim() || "Carrier");
}

/** Build a public tracking URL when the carrier supports it. */
export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  const tn = trackingNumber?.trim();
  if (!tn) return null;
  const enc = encodeURIComponent(tn);
  switch (carrier) {
    case "dhl":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${enc}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${enc}`;
    case "ups":
      return `https://www.ups.com/track?tracknum=${enc}`;
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${enc}`;
    case "chronopost":
      return `https://www.chronopost.fr/tracking-no-locale?listeNumerosLT=${enc}`;
    case "colissimo":
    case "laposte":
      return `https://www.laposte.fr/outils/suivre-vos-envois?code=${enc}`;
    case "dpd":
      return `https://www.dpdgroup.com/nl/mydpd/my-parcels/incoming?parcelNumber=${enc}`;
    case "gls":
      return `https://gls-group.com/GROUP/en/parcel-tracking?match=${enc}`;
    case "aramex":
      return `https://www.aramex.com/track/results?ShipmentNumber=${enc}`;
    case "jt":
      return `https://www.jtexpress.sg/trajectory?billcode=${enc}`;
    case "pickup":
    case "local":
    case "yango":
    case "other":
    default:
      return null;
  }
}

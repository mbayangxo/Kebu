/**
 * Real, genuinely useful default content for the policy/FAQ pages every
 * Shop-capable theme needs (Shopify parity) — not placeholder lorem ipsum.
 * Each page is a starting template the merchant edits with their own real
 * terms (shipping windows, return window, actual business name); the body
 * text says so explicitly rather than pretending to be finished legal
 * copy. Section shape matches lib/create/section-defaults.ts's "text" and
 * "faq" defaults exactly, so these render with the theme's own styling.
 */

export type ShopPolicySeed = {
  slug: string;
  title: string;
  sectionType: "text" | "faq";
  props: Record<string, unknown>;
};

export const SHOP_POLICY_PAGE_SEEDS: ShopPolicySeed[] = [
  {
    slug: "faq",
    title: "FAQ",
    sectionType: "faq",
    props: {
      heading: "Frequently asked questions",
      items: [
        {
          question: "How long does delivery take?",
          answer: "Edit this with your real delivery window — most Kebu shops quote 2-5 business days in-country, longer for cross-border orders.",
        },
        {
          question: "What payment methods do you accept?",
          answer: "List the pay methods you've turned on in Shop → Payments (Wave, Orange Money, cash on delivery, card, etc.).",
        },
        {
          question: "Can I return or exchange an item?",
          answer: "See our Returns policy for the window and condition requirements, or contact us directly.",
        },
        {
          question: "How do I track my order?",
          answer: "We'll message you on WhatsApp or email with updates. Contact us any time with your order number.",
        },
        {
          question: "Do you ship outside the country?",
          answer: "Edit this with your real shipping zones — turn them on in Shop → Shipping.",
        },
      ],
    },
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    sectionType: "text",
    props: {
      heading: "Shipping policy",
      body:
        "This is a starting template — replace the bracketed parts with your real shipping details before publishing.\n\n" +
        "Processing time: Orders are prepared within [1-2] business days of payment confirmation.\n\n" +
        "Delivery time: [2-5] business days within [your country]; [7-14] business days for cross-border orders.\n\n" +
        "Shipping cost: Calculated at checkout based on your location, or a flat rate of [amount] — set this in Shop → Shipping.\n\n" +
        "Order tracking: We'll message you on WhatsApp or email with delivery updates and a tracking reference where available.\n\n" +
        "Questions about an order already placed? Contact us with your order number.",
    },
  },
  {
    slug: "returns-policy",
    title: "Returns & Refunds",
    sectionType: "text",
    props: {
      heading: "Returns & refunds",
      body:
        "This is a starting template — replace the bracketed parts with your real return terms before publishing.\n\n" +
        "Return window: Items can be returned within [7-14] days of delivery, unused and in original packaging.\n\n" +
        "How to start a return: Contact us with your order number and reason for return — we'll confirm next steps on WhatsApp or email.\n\n" +
        "Refunds: Once we receive and inspect the returned item, we'll process your refund to the original payment method within [5-10] business days.\n\n" +
        "Non-returnable items: [perishables / custom orders / final-sale items] cannot be returned — list your exceptions here.\n\n" +
        "Damaged or incorrect items: Contact us within [48 hours] of delivery with photos, and we'll make it right at no extra cost.",
    },
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    sectionType: "text",
    props: {
      heading: "Privacy policy",
      body:
        "This is a starting template — replace the bracketed parts with your real business details and have it reviewed before publishing; this is not legal advice.\n\n" +
        "What we collect: your name, phone number, email, delivery address, and order details — only what's needed to process your order and contact you about it.\n\n" +
        "How we use it: to fulfil orders, send delivery updates, and respond to your messages. We do not sell your information to third parties.\n\n" +
        "Payment information: payments are processed by [Wave / Orange Money / Paystack / PayPal] directly — we do not store your card or mobile money PIN.\n\n" +
        "Your rights: you can ask us to see, correct, or delete the personal information we hold about you by contacting us directly.\n\n" +
        "Contact: [your business name], [your contact email/phone].",
    },
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    sectionType: "text",
    props: {
      heading: "Terms of service",
      body:
        "This is a starting template — replace the bracketed parts with your real business details and have it reviewed before publishing; this is not legal advice.\n\n" +
        "About this shop: [your business name] operates this online shop. By placing an order, you agree to these terms.\n\n" +
        "Pricing & availability: prices are shown in [XOF/USD] and may change without notice. We'll contact you if an item you ordered becomes unavailable.\n\n" +
        "Orders & payment: an order is confirmed once payment is received or, for pay-on-delivery, once we confirm it with you directly.\n\n" +
        "Shipping & returns: see our Shipping and Returns & Refunds pages for full details.\n\n" +
        "Contact: questions about these terms can be sent to [your contact email/phone].",
    },
  },
];

export function shopPolicySeedBySlug(slug: string): ShopPolicySeed | undefined {
  return SHOP_POLICY_PAGE_SEEDS.find((s) => s.slug === slug);
}

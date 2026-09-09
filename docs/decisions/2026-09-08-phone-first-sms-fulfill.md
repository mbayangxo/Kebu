# ADR: Phone-first shop — SMS on deliver · email OTP optional

## Decision

Buyers in Africa primarily use **phone**. Checkout stays **phone-required**; email is optional (required only for card/PayPal).

On fulfill / mark delivered, default notify channel is **SMS** (Africa’s Talking: `AT_API_KEY` + `AT_USERNAME`, optional `AT_SENDER_ID`). WhatsApp deep-link and email remain optional.

Checkout **email OTP** APIs (082) stay in the repo but are **not required** to place an order.

## Website caps (unchanged)

| Plan | maxWebsites |
|------|-------------|
| Free / Student / Starter / Shop | **1** |
| Business | **5** |
| Pro | **20** |

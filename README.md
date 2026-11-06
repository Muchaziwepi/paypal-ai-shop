# Glow & Care — Personal Care & Beauty Shop

A small AI-assisted personal care and beauty storefront with PayPal sandbox checkout.

## What's included

- 31 products across skincare, hair care, cosmetics, underarm care, sunscreen and hygiene.
- USD pricing and a server-side catalog so shoppers cannot change prices in the browser.
- Category filters, product search, product cards and a shopping bag.
- AI shopping assistant with a keyword fallback when `AI_API_KEY` is not configured.
- PayPal sandbox checkout and order storage.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and fill in the values:
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: PayPal Developer Dashboard > Apps & Credentials > Sandbox.
   - `AI_API_KEY` (optional): an Anthropic API key.
   - `MONGODB_URI` (optional): a MongoDB Atlas connection string.
   - `ADMIN_KEY`: a password for `/orders.html`.
4. Run `npm start` and open http://localhost:3000.

## Product images and pricing

The catalog uses direct brand/retailer product imagery where a clear asset was verified. Items without a confirmed direct image use a clean catalog-style fallback visual rather than a misleading unrelated photo. Product/price reference links are shown on product cards when available.

Prices are displayed in USD. Some prices were confirmed against current US retailer or brand listings during the catalog update; other prices are retained from the supplied reference list or are USD display estimates for products originally priced in INR. Retail prices can change and should be rechecked before enabling live payments or publishing the shop as a real retailer.

## Payments

Checkout is connected to PayPal's sandbox. No real money moves in sandbox mode. Before any live launch, verify inventory, product authenticity, shipping, taxes, returns, legal requirements, product images and every price, then configure live PayPal credentials separately.

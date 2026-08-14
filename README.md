# NRS DigitalOcean Connectivity Probe v0.2.0

This is a **read-only infrastructure test** for the Manager.io Nigeria E-Invoicing project.

It does not contain or require:
- NRS API key
- NRS client secret
- public/private keys
- Manager.io credentials
- tenant records
- invoice data
- Cloudflare D1

It sends only one strict HTTPS GET request to the official NRS Production currency resource:

`https://einvoice1.nrs.gov.ng/api/v1/invoice/resources/currencies`

## Deploy on DigitalOcean App Platform

1. Create a new GitHub repository, for example:
   `nrs-digitalocean-connectivity-probe`

2. Upload these files to the repository root:
   - `server.mjs`
   - `package.json`
   - `.gitignore`
   - `README.md`

3. In DigitalOcean:
   - Go to **Apps**
   - Choose **Create App**
   - Select **GitHub**
   - Select the repository
   - Choose a **Web Service**
   - Region: **London (LON)** is recommended for this test
   - Build command: leave automatic/default (or `npm install`)
   - Run command: `npm start`
   - The app already listens on the platform-provided `PORT`
   - Health check path: `/healthz`

4. Start with the smallest paid App Platform service for this probe. No database is needed.

5. Do **not** add any NRS credentials or application secrets.

## Test

After deployment, DigitalOcean gives the app an `ondigitalocean.app` address.

Open:

`https://YOUR-APP.ondigitalocean.app/healthz`

Expected:

```json
{
  "ok": true
}
```

Then open:

`https://YOUR-APP.ondigitalocean.app/probe`

### Success result

The key fields should be similar to:

```json
{
  "ok": true,
  "http": {
    "status": 200
  },
  "bodyEvidence": {
    "xmlCode": "200"
  },
  "interpretation": "DIGITALOCEAN_CAN_REACH_NRS_PRODUCTION"
}
```

If this succeeds while the Cloudflare Worker continues to return 526, stop here and preserve the result. It proves that the NRS Production endpoint is reachable from DigitalOcean with strict TLS verification.

## Important

This package is **not** a relay and is **not** the migrated production application.

It is only the go/no-go infrastructure test before any full migration work.

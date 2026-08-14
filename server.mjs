import http from "node:http";
import https from "node:https";

const VERSION = "0.2.1";
const PORT = Number(process.env.PORT || 8080);
const TARGET_HOST = "einvoice1.nrs.gov.ng";
const TARGET_PATH = "/api/v1/invoice/resources/currencies";

function jsonResponse(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  res.end(body);
}

function safeCert(cert) {
  if (!cert || typeof cert !== "object") return null;
  return {
    subject: cert.subject || null,
    issuer: cert.issuer || null,
    valid_from: cert.valid_from || null,
    valid_to: cert.valid_to || null,
    fingerprint256: cert.fingerprint256 || null,
    serialNumber: cert.serialNumber || null,
  };
}

function runProbe() {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();

    let tls = {
      authorized: null,
      authorizationError: null,
      protocol: null,
      cipher: null,
      remoteAddress: null,
      remotePort: null,
      peerCertificate: null,
    };

    const req = https.request(
      {
        hostname: TARGET_HOST,
        port: 443,
        path: TARGET_PATH + "?do_probe=" + Date.now(),
        method: "GET",
        family: 4,
        servername: TARGET_HOST,
        rejectUnauthorized: true,
        timeout: 15000,
        headers: {
          "User-Agent": `Manager-NRS-Connectivity-Probe/${VERSION}`,
          "Accept": "application/xml,text/xml,*/*",
          "Cache-Control": "no-cache",
          "Connection": "close",
        },
      },
      (upstream) => {
        const chunks = [];
        let total = 0;
        const MAX_BODY = 256 * 1024;

        upstream.on("data", (chunk) => {
          if (total < MAX_BODY) {
            const remaining = MAX_BODY - total;
            chunks.push(chunk.subarray(0, remaining));
            total += Math.min(chunk.length, remaining);
          }
        });

        upstream.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const xmlCode =
            body.match(/<Code>\s*([^<]+)\s*<\/Code>/i)?.[1]?.trim() || null;
          const dataCount = (body.match(/<Data>/gi) || []).length;
          const success =
            upstream.statusCode === 200 &&
            (xmlCode === "200" || dataCount > 0);

          resolve({
            probeSucceeded: success,
            version: VERSION,
            startedAt,
            durationMs: Date.now() - startedMs,
            target: {
              scheme: "https",
              host: TARGET_HOST,
              path: TARGET_PATH,
              dnsFamilyForced: "IPv4",
              tlsVerification: "STRICT",
            },
            upstreamHttp: {
              status: upstream.statusCode || null,
              statusMessage: upstream.statusMessage || null,
              contentType: upstream.headers["content-type"] || null,
              server: upstream.headers["server"] || null,
              cfRay: upstream.headers["cf-ray"] || null,
              location: upstream.headers["location"] || null,
            },
            tls,
            bodyEvidence: {
              xmlCode,
              dataElementCount: dataCount,
              excerpt: body.slice(0, 800),
            },
            interpretation: success
              ? "DIGITALOCEAN_CAN_REACH_NRS_PRODUCTION"
              : `NRS_RESPONDED_HTTP_${upstream.statusCode || "UNKNOWN"}`,
          });
        });
      }
    );

    req.on("socket", (socket) => {
      socket.once("secureConnect", () => {
        try {
          tls = {
            authorized: socket.authorized,
            authorizationError: socket.authorizationError || null,
            protocol: socket.getProtocol?.() || null,
            cipher: socket.getCipher?.() || null,
            remoteAddress: socket.remoteAddress || null,
            remotePort: socket.remotePort || null,
            peerCertificate: safeCert(socket.getPeerCertificate?.()),
          };
        } catch {
          // Optional TLS metadata only.
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("UPSTREAM_TIMEOUT_AFTER_15000MS"));
    });

    req.on("error", (error) => {
      resolve({
        probeSucceeded: false,
        version: VERSION,
        startedAt,
        durationMs: Date.now() - startedMs,
        target: {
          scheme: "https",
          host: TARGET_HOST,
          path: TARGET_PATH,
          dnsFamilyForced: "IPv4",
          tlsVerification: "STRICT",
        },
        upstreamHttp: null,
        tls,
        connectionError: {
          name: error.name || "Error",
          code: error.code || null,
          message: error.message || String(error),
        },
        interpretation: "DIGITALOCEAN_TO_NRS_CONNECTION_FAILED",
      });
    });

    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`
  );

  if (req.method === "GET" && url.pathname === "/healthz") {
    return jsonResponse(res, 200, {
      ok: true,
      service: "nrs-digitalocean-connectivity-probe",
      version: VERSION,
      note: "No NRS credentials or invoice data are stored by this probe.",
    });
  }

  if (req.method === "GET" && url.pathname === "/probe") {
    const result = await runProbe();

    // Important: always return HTTP 200 to the browser so DigitalOcean's
    // proxy does not replace our diagnostic body with a generic 502 page.
    console.log("NRS_PROBE_RESULT", JSON.stringify(result));

    return jsonResponse(
      res,
      200,
      {
        diagnosticPageOk: true,
        note:
          "This page intentionally returns HTTP 200 so the real upstream NRS/TLS result remains visible.",
        ...result,
      },
      {
        "x-nrs-probe-outcome": result.probeSucceeded ? "pass" : "fail",
      }
    );
  }

  return jsonResponse(res, 200, {
    service: "NRS Production Connectivity Probe",
    version: VERSION,
    purpose:
      "Read-only connectivity test from DigitalOcean App Platform to NRS Production.",
    endpoints: {
      health: "/healthz",
      probe: "/probe",
    },
    security: [
      "No NRS API key",
      "No NRS client secret",
      "No Manager.io credentials",
      "No tenant records",
      "No invoice validation/signing/submission",
    ],
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `NRS DigitalOcean connectivity probe v${VERSION} listening on 0.0.0.0:${PORT}`
  );
});

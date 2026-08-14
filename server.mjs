import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import crypto from "node:crypto";

const VERSION = "0.2.2";
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

function safeCertificateSummary(cert, index) {
  if (!cert || typeof cert !== "object" || Object.keys(cert).length === 0) {
    return null;
  }

  let sha256FromRaw = null;
  try {
    if (cert.raw) {
      sha256FromRaw = crypto.createHash("sha256").update(cert.raw).digest("hex").match(/.{1,2}/g)?.join(":").toUpperCase() || null;
    }
  } catch {
    // Optional diagnostic only.
  }

  return {
    index,
    subject: cert.subject || null,
    issuer: cert.issuer || null,
    subjectAltName: cert.subjectaltname || null,
    serialNumber: cert.serialNumber || null,
    validFrom: cert.valid_from || null,
    validTo: cert.valid_to || null,
    fingerprint: cert.fingerprint || null,
    fingerprint256: cert.fingerprint256 || sha256FromRaw,
    fingerprint512: cert.fingerprint512 || null,
    ca: typeof cert.ca === "boolean" ? cert.ca : null,
    bits: cert.bits || null,
    modulus: cert.modulus || null,
    exponent: cert.exponent || null,
    pubkeyType: cert.asn1Curve || cert.nistCurve || null,
    infoAccess: cert.infoAccess || null,
    extKeyUsage: cert.ext_key_usage || null,
  };
}

function extractPresentedChain(peer) {
  const chain = [];
  const seen = new Set();
  let current = peer;

  for (let index = 0; index < 10; index += 1) {
    if (!current || typeof current !== "object" || Object.keys(current).length === 0) break;

    const key = current.fingerprint256 || current.fingerprint || current.serialNumber || `index-${index}`;
    if (seen.has(key)) break;
    seen.add(key);

    const summary = safeCertificateSummary(current, index);
    if (summary) chain.push(summary);

    const issuer = current.issuerCertificate;
    if (!issuer || issuer === current) break;

    const issuerKey = issuer.fingerprint256 || issuer.fingerprint || issuer.serialNumber || null;
    if (issuerKey && seen.has(issuerKey)) break;
    current = issuer;
  }

  return chain;
}

function runCertificateInspection() {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    let settled = false;

    const socket = tls.connect({
      host: TARGET_HOST,
      port: 443,
      servername: TARGET_HOST,
      family: 4,
      rejectUnauthorized: false,
      timeout: 15000,
      ALPNProtocols: ["http/1.1"],
    });

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve({
        diagnosticPageOk: true,
        diagnosticOnly: true,
        warning: "TLS verification is disabled only for this certificate-inspection handshake so the NRS-presented certificate chain can be observed. Do not use this mode for API traffic.",
        version: VERSION,
        startedAt,
        durationMs: Date.now() - startedMs,
        target: {
          scheme: "tls",
          host: TARGET_HOST,
          port: 443,
          servername: TARGET_HOST,
          dnsFamilyForced: "IPv4",
          tlsVerificationForThisInspectionOnly: "DISABLED_TO_INSPECT_PRESENTED_CHAIN",
        },
        ...payload,
      });
    };

    socket.once("secureConnect", () => {
      try {
        const peer = socket.getPeerCertificate(true);
        const presentedChain = extractPresentedChain(peer);

        finish({
          handshakeCompleted: true,
          tls: {
            authorizedAccordingToNodeTrustStore: socket.authorized,
            authorizationError: socket.authorizationError || null,
            protocol: socket.getProtocol?.() || null,
            cipher: socket.getCipher?.() || null,
            alpnProtocol: socket.alpnProtocol || null,
            remoteAddress: socket.remoteAddress || null,
            remotePort: socket.remotePort || null,
          },
          presentedCertificateCount: presentedChain.length,
          presentedChain,
          interpretation:
            presentedChain.length <= 1
              ? "NRS_PRESENTED_LEAF_ONLY_OR_CHAIN_NOT_EXPOSED"
              : "NRS_CERTIFICATE_CHAIN_CAPTURED",
        });
      } catch (error) {
        finish({
          handshakeCompleted: true,
          inspectionError: {
            name: error.name || "Error",
            code: error.code || null,
            message: error.message || String(error),
          },
          interpretation: "TLS_HANDSHAKE_COMPLETED_BUT_CERTIFICATE_INSPECTION_FAILED",
        });
      }
    });

    socket.once("timeout", () => {
      finish({
        handshakeCompleted: false,
        connectionError: {
          name: "Error",
          code: "TLS_INSPECTION_TIMEOUT",
          message: "TLS certificate-inspection handshake timed out after 15000ms",
        },
        interpretation: "DIGITALOCEAN_TO_NRS_TLS_INSPECTION_TIMEOUT",
      });
    });

    socket.once("error", (error) => {
      finish({
        handshakeCompleted: false,
        connectionError: {
          name: error.name || "Error",
          code: error.code || null,
          message: error.message || String(error),
        },
        interpretation: "DIGITALOCEAN_TO_NRS_TLS_INSPECTION_FAILED",
      });
    });
  });
}

function runStrictProbe() {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();

    let tlsInfo = {
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
          Accept: "application/xml,text/xml,*/*",
          "Cache-Control": "no-cache",
          Connection: "close",
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
          const xmlCode = body.match(/<Code>\s*([^<]+)\s*<\/Code>/i)?.[1]?.trim() || null;
          const dataCount = (body.match(/<Data>/gi) || []).length;
          const success = upstream.statusCode === 200 && (xmlCode === "200" || dataCount > 0);

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
            tls: tlsInfo,
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
          tlsInfo = {
            authorized: socket.authorized,
            authorizationError: socket.authorizationError || null,
            protocol: socket.getProtocol?.() || null,
            cipher: socket.getCipher?.() || null,
            remoteAddress: socket.remoteAddress || null,
            remotePort: socket.remotePort || null,
            peerCertificate: safeCertificateSummary(socket.getPeerCertificate?.(), 0),
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
        tls: tlsInfo,
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
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    return jsonResponse(res, 200, {
      ok: true,
      service: "nrs-digitalocean-connectivity-probe",
      version: VERSION,
      note: "No NRS credentials or invoice data are stored by this probe.",
    });
  }

  if (req.method === "GET" && url.pathname === "/probe") {
    const result = await runStrictProbe();
    console.log("NRS_STRICT_PROBE_RESULT", JSON.stringify(result));
    return jsonResponse(res, 200, {
      diagnosticPageOk: true,
      note: "This page intentionally returns HTTP 200 so the real strict upstream NRS/TLS result remains visible.",
      ...result,
    }, {
      "x-nrs-probe-outcome": result.probeSucceeded ? "pass" : "fail",
    });
  }

  if (req.method === "GET" && (url.pathname === "/certificate-chain" || url.pathname === "/inspect-cert")) {
    const result = await runCertificateInspection();
    console.log("NRS_CERTIFICATE_CHAIN_RESULT", JSON.stringify(result));
    return jsonResponse(res, 200, result);
  }

  return jsonResponse(res, 200, {
    service: "NRS Production Connectivity Probe",
    version: VERSION,
    purpose: "Read-only connectivity and certificate-chain diagnostics from DigitalOcean App Platform to NRS Production.",
    endpoints: {
      health: "/healthz",
      strictProbe: "/probe",
      certificateChainInspector: "/certificate-chain",
    },
    security: [
      "No NRS API key",
      "No NRS client secret",
      "No Manager.io credentials",
      "No tenant records",
      "No invoice validation/signing/submission",
      "Certificate verification is disabled only inside /certificate-chain for a handshake-only inspection; /probe remains strict.",
    ],
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NRS DigitalOcean connectivity probe v${VERSION} listening on 0.0.0.0:${PORT}`);
});

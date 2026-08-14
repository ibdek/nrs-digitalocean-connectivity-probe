import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import crypto from "node:crypto";

const VERSION = "0.2.3";
const PORT = Number(process.env.PORT || 8080);
const TARGET_HOST = "einvoice1.nrs.gov.ng";
const TARGET_PATH = "/api/v1/invoice/resources/currencies";

const CERTUM_DV_TLS_G2_R39_CA_PEM = `-----BEGIN CERTIFICATE-----
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
8FpPkganuCwy++7umTkM7+Q=
-----END CERTIFICATE-----`;
const CERTUM_TRUSTED_ROOT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIFwDCCA6igAwIBAgIQHr9ZULjJgDdMBvfrVU+17TANBgkqhkiG9w0BAQ0FADB6
MQswCQYDVQQGEwJQTDEhMB8GA1UEChMYQXNzZWNvIERhdGEgU3lzdGVtcyBTLkEu
MScwJQYDVQQLEx5DZXJ0dW0gQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxHzAdBgNV
BAMTFkNlcnR1bSBUcnVzdGVkIFJvb3QgQ0EwHhcNMTgwMzE2MTIxMDEzWhcNNDMw
MzE2MTIxMDEzWjB6MQswCQYDVQQGEwJQTDEhMB8GA1UEChMYQXNzZWNvIERhdGEg
U3lzdGVtcyBTLkEuMScwJQYDVQQLEx5DZXJ0dW0gQ2VydGlmaWNhdGlvbiBBdXRo
b3JpdHkxHzAdBgNVBAMTFkNlcnR1bSBUcnVzdGVkIFJvb3QgQ0EwggIiMA0GCSqG
SIb3DQEBAQUAA4ICDwAwggIKAoICAQDRLY67tzbqbTeRn06TpwXkKQMlzhyC93yZ
n0EGze2jusDbCSzBfN8pfktlL5On1AFrAygYo9idBcEq2EXxkd7fO9CAAozPOA/q
p1x4EaTByIVcJdPTsuclzxFUl6s1wB52HO8AU5853BSlLCIls3Jy/I2z5T4IHhQq
NwuIPMqw9MjCoa68wb4pZ1Xi/K1ZXP69VyywkI3C7Te2fJmItdUDmj0VDT06qKhF
8JVOJVkdzZhpu9PMMsmN74H+rX2Ju7pgE8pllWeg8xn2A1bUatMn4qGtg/BKEiJ3
HAVz4hlxQsDsdUaakFjgao4rpUYwBI4Zshfjvqm6f1bxJAPXsiEodg42MEx51UGa
mqi4NboMOvJEGyCI98Ul1z3G4z5D3Yf+xOr1Uz5MZf87Sst4WmsXXw3Hw09Omiqi
7VdNIuJGmj8PkTQkfVXjjJU30xrwCSss0smNtA0Aq2cpKNgB9RkEth2+dv5yXMSF
ytKAQd8FqKPVhJBPC/PgP5sZ0jeJP/J7UhyM9uH3PAeXjA6iWYEMspA90+NZRu0P
qafegGtaqge2Gcu8V/OXIXoMsSt0Puvap2ctTMSYnjYJdmZm/Bo/6khUHL4wvYBQ
v3y1zgD2DGHZ5yQD4OMBgQ692IU0iL2yNqh7XAjlRICMb/gv1SHKHRzQ+8S1h9E6
Tsd2tTVItQIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSM+xx1
vALTn04uSNn5YFSqxLNP+jAOBgNVHQ8BAf8EBAMCAQYwDQYJKoZIhvcNAQENBQAD
ggIBAEii1QALLtA/vBzVtVRJHlpr9OTy4EA34MwUe7nJ+jW1dReTagVphZzNTxl4
WxmB82M+w85bj/UvXgF2Ez8sALnNllI5SW0ETsXpD4YN4fqzX4IS8TrOZgYkNCvo
zMrnadyHncI013nR03e4qllY/p0m+jiGPp2Kh2RX5Rc64vmNueMzeMGQ2Ljdt4NR
5MTMI9UGfOZR0800McD2RrsLrfw9EAUqO0qRJe6M1ISHgCq8CYyqOhNf6DR5UMEQ
GfnTKB7U0VEwKbOukGfWHwpjscWpxkIxYxeU72nLL/qMFH3EQxiJ2fAyQOaA4kZf
5ePBAFmo+eggvIksDkc0C+pXwlM2/KfUrzHN/gLldfq5Jwn58/U7yn2fqSLLiMmq
0Uc9NneoWWRrJ8/vJ8HjJLWG965+Mk2weWjROeiQWMODvA8s1pfrzgzhIMfatz7D
P78v3DSk+yshzWePS/Tj6tQ/50+6uaWTRRxmHyH6ZF5v4HaUMst19W7l9o/HuKTM
qJZ9ZPskWkoDbGs4xugDQ5r3V7mzKWmTOPQD8rv7gmsHINFSH5pkAnuYZttcTVoP
0ISVoDwUQwbKytu4QTbaakRnh6+v40URFWkIsr4WOZckbxJF0WddCajJFdr60qZf
E2Efv4WstK2tBZQIgx51F9NxO5NQI1mg7TyRVJ12AMXDuDjb
-----END CERTIFICATE-----`;
const EXPECTED_CERTUM_INTERMEDIATE_SHA256 = "83C0A5A76844C840DFAF820FFD02ADF6573A26823EF6AF758A3384A0AC044083";
const EXPECTED_CERTUM_ROOT_SHA256 = "FE7696573855773E37A95E7AD4D9CC96C30157C15D31765BA9B15704E1AE78FD";

function pemSha256(pem) {
  const cert = new crypto.X509Certificate(pem);
  return crypto.createHash("sha256").update(cert.raw).digest("hex").toUpperCase();
}

function certumBundleStatus() {
  const intermediateSha256 = pemSha256(CERTUM_DV_TLS_G2_R39_CA_PEM);
  const rootSha256 = pemSha256(CERTUM_TRUSTED_ROOT_CA_PEM);
  return {
    intermediate: {
      name: "Certum DV TLS G2 R39 CA",
      sha256: intermediateSha256,
      expectedSha256: EXPECTED_CERTUM_INTERMEDIATE_SHA256,
      hashMatchesOfficialRepository: intermediateSha256 === EXPECTED_CERTUM_INTERMEDIATE_SHA256,
    },
    root: {
      name: "Certum Trusted Root CA",
      sha256: rootSha256,
      expectedSha256: EXPECTED_CERTUM_ROOT_SHA256,
      hashMatchesOfficialRepository: rootSha256 === EXPECTED_CERTUM_ROOT_SHA256,
    },
  };
}

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


function runStrictProbeWithCertumChain() {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const bundle = certumBundleStatus();

    if (!bundle.intermediate.hashMatchesOfficialRepository || !bundle.root.hashMatchesOfficialRepository) {
      return resolve({
        probeSucceeded: false,
        version: VERSION,
        startedAt,
        durationMs: Date.now() - startedMs,
        interpretation: "LOCAL_CERTUM_BUNDLE_HASH_MISMATCH_ABORTED",
        certumBundle: bundle,
      });
    }

    let tlsInfo = {
      authorized: null,
      authorizationError: null,
      protocol: null,
      cipher: null,
      remoteAddress: null,
      remotePort: null,
      peerCertificate: null,
    };

    // Keep Node's normal trusted roots and add only the official Certum
    // intermediate + root needed to complete the chain omitted by NRS.
    const trustedCAs = [
      ...tls.rootCertificates,
      CERTUM_TRUSTED_ROOT_CA_PEM,
      CERTUM_DV_TLS_G2_R39_CA_PEM,
    ];

    const req = https.request(
      {
        hostname: TARGET_HOST,
        port: 443,
        path: TARGET_PATH + "?do_certum_strict_probe=" + Date.now(),
        method: "GET",
        family: 4,
        servername: TARGET_HOST,
        rejectUnauthorized: true,
        ca: trustedCAs,
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
              customTrustAction: "NODE_DEFAULT_ROOTS_PLUS_OFFICIAL_CERTUM_CHAIN",
            },
            certumBundle: bundle,
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
              ? "STRICT_TLS_SUCCEEDED_WITH_OFFICIAL_CERTUM_CHAIN"
              : `STRICT_TLS_CONNECTED_BUT_NRS_RESPONDED_HTTP_${upstream.statusCode || "UNKNOWN"}`,
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
          tlsVerification: "STRICT",
          customTrustAction: "NODE_DEFAULT_ROOTS_PLUS_OFFICIAL_CERTUM_CHAIN",
        },
        certumBundle: bundle,
        upstreamHttp: null,
        tls: tlsInfo,
        connectionError: {
          name: error.name || "Error",
          code: error.code || null,
          message: error.message || String(error),
        },
        interpretation: "STRICT_TLS_WITH_OFFICIAL_CERTUM_CHAIN_FAILED",
      });
    });

    req.end();
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

  if (req.method === "GET" && (url.pathname === "/strict-with-certum-chain" || url.pathname === "/certum-fix-test")) {
    const result = await runStrictProbeWithCertumChain();
    console.log("NRS_CERTUM_STRICT_PROBE_RESULT", JSON.stringify(result));
    return jsonResponse(res, 200, {
      diagnosticPageOk: true,
      note: "TLS verification remains strict. This test adds only the official Certum CA chain to Node's normal trust list.",
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
      strictWithOfficialCertumChain: "/strict-with-certum-chain",
    },
    security: [
      "No NRS API key",
      "No NRS client secret",
      "No Manager.io credentials",
      "No tenant records",
      "No invoice validation/signing/submission",
      "Certificate verification is disabled only inside /certificate-chain for a handshake-only inspection; /probe remains strict.",
      "/strict-with-certum-chain also remains strict and extends Node trust only with official Certum CA certificates whose SHA-256 hashes are verified before use.",
    ],
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NRS DigitalOcean connectivity probe v${VERSION} listening on 0.0.0.0:${PORT}`);
});

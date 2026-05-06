/**
 * graphClient.js ÔÇö Autenticaci├│n y helpers para Microsoft Graph API
 * 
 * Usa Client Credentials flow (app-only) para obtener tokens.
 * Cachea el token, Site ID y Drive ID para evitar llamadas repetidas.
 * 
 * NOTA: Las variables de entorno (GRAPH_TENANT_ID, GRAPH_CLIENT_ID, etc.)
 * deben estar definidas en la Azure Static Web App > Configuration > Application Settings.
 * Este archivo solo las LEE de process.env, no las define.
 */

const https = require("https");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// ÔöÇÔöÇ Cache en memoria (vive durante el ciclo de vida de la Function App) ÔöÇÔöÇ
let _cachedToken   = null;
let _tokenExpiry   = 0;
let _cachedSiteId  = null;
let _cachedDriveId = null;

// ÔöÇÔöÇ Leer y validar configuraci├│n desde variables de entorno ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function getConfig() {
    const config = {
        tenantId:     process.env.GRAPH_TENANT_ID,
        clientId:     process.env.GRAPH_CLIENT_ID,
        clientSecret: process.env.GRAPH_CLIENT_SECRET,
        spSiteHost:   process.env.SP_SITE_HOST,
        spSitePath:   process.env.SP_SITE_PATH,
        spLibrary:    process.env.SP_LIBRARY
    };

    const missing = Object.entries(config)
        .filter(([, v]) => !v)
        .map(([k]) => k);

    if (missing.length > 0) {
        throw new Error(
            `Faltan variables de entorno: ${missing.join(", ")}. ` +
            `Config├║ralas en Azure SWA > Configuration > Application Settings.`
        );
    }

    return config;
}

// ÔöÇÔöÇ Helper: HTTPS request gen├®rico (compatible con Node 14/16/18+) ÔöÇÔöÇÔöÇÔöÇ
function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            path:     parsedUrl.pathname + parsedUrl.search,
            method:   options.method || "GET",
            headers:  options.headers || {}
        };

        const req = https.request(reqOptions, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    ok:     res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    headers: res.headers,
                    buffer: () => buffer,
                    text:   () => buffer.toString("utf-8"),
                    json:   () => JSON.parse(buffer.toString("utf-8")),
                    arrayBuffer: () => buffer
                });
            });
        });

        req.on("error", reject);

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// ÔöÇÔöÇ Obtener Access Token (Client Credentials) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function getAccessToken(context) {
    // Devolver token cacheado si a├║n es v├ílido (con 5 min de margen)
    if (_cachedToken && Date.now() < _tokenExpiry - 300000) {
        if (context) context.log("graphClient: using cached token");
        return _cachedToken;
    }

    const cfg = getConfig();

    const tokenUrl = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     cfg.clientId,
        client_secret: cfg.clientSecret,
        scope:         "https://graph.microsoft.com/.default"
    }).toString();

    if (context) context.log(`graphClient: requesting token for tenant ${cfg.tenantId}`);

    const resp = await httpsRequest(tokenUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!resp.ok) {
        const errText = resp.text();
        throw new Error(`Token request failed (${resp.status}): ${errText}`);
    }

    const data = resp.json();

    if (!data.access_token) {
        throw new Error(`Token response missing access_token: ${JSON.stringify(data)}`);
    }

    _cachedToken  = data.access_token;
    _tokenExpiry  = Date.now() + (data.expires_in * 1000);

    if (context) context.log("graphClient: token acquired successfully");
    return _cachedToken;
}

// ÔöÇÔöÇ Fetch autenticado contra Graph ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function graphFetch(url, context, options = {}) {
    const token = await getAccessToken(context);
    const resp = await httpsRequest(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    return resp;
}

// ÔöÇÔöÇ Resolver Site ID ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function getSiteId(context) {
    if (_cachedSiteId) return _cachedSiteId;

    const cfg = getConfig();

    // Sanitize variables to prevent malformed Graph API URLs
    let cleanHost = cfg.spSiteHost.replace("https://", "").replace("http://", "").split("/")[0];
    let cleanPath = cfg.spSitePath.startsWith("/") ? cfg.spSitePath : "/" + cfg.spSitePath;
    if (cleanPath.endsWith("/")) cleanPath = cleanPath.slice(0, -1);

    // GET /sites/{hostname}:{serverRelativePath}
    const url = `${GRAPH_BASE}/sites/${cleanHost}:${cleanPath}`;
    if (context) context.log(`graphClient: resolving Site ID from ${url}`);

    const resp = await graphFetch(url, context);

    if (!resp.ok) {
        const errText = resp.text();
        throw new Error(`Failed to resolve Site ID (${resp.status}): ${errText}`);
    }

    const data = resp.json();
    _cachedSiteId = data.id;
    if (context) context.log(`graphClient: Site ID = ${_cachedSiteId}`);
    return _cachedSiteId;
}

// ÔöÇÔöÇ Resolver Drive ID (biblioteca de documentos) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function getDriveId(context) {
    if (_cachedDriveId) return _cachedDriveId;

    const cfg = getConfig();
    const siteId = await getSiteId(context);
    const url = `${GRAPH_BASE}/sites/${siteId}/drives`;
    if (context) context.log(`graphClient: listing drives for site ${siteId}`);

    const resp = await graphFetch(url, context);

    if (!resp.ok) {
        const errText = resp.text();
        throw new Error(`Failed to list drives (${resp.status}): ${errText}`);
    }

    const data = resp.json();
    const drive = data.value.find(d =>
        d.name.toLowerCase() === cfg.spLibrary.toLowerCase()
    );

    if (!drive) {
        const available = data.value.map(d => d.name).join(", ");
        throw new Error(
            `Library "${cfg.spLibrary}" not found. Available drives: ${available}`
        );
    }

    _cachedDriveId = drive.id;
    if (context) context.log(`graphClient: Drive ID = ${_cachedDriveId}`);
    return _cachedDriveId;
}

// ÔöÇÔöÇ Listar hijos (carpetas/archivos) de una ruta en el Drive ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function listDriveChildren(path, context) {
    const driveId = await getDriveId(context);

    let url;
    if (!path || path === "/" || path === "") {
        url = `${GRAPH_BASE}/drives/${driveId}/root/children`;
    } else {
        const cleanPath = path.replace(/^\/+/, "");
        url = `${GRAPH_BASE}/drives/${driveId}/root:/${encodeURIComponent(cleanPath)}:/children`;
    }

    if (context) context.log(`graphClient: listing children at ${url}`);
    const resp = await graphFetch(url, context);

    if (!resp.ok) {
        const errText = resp.text();
        throw new Error(`Failed to list children at "${path}" (${resp.status}): ${errText}`);
    }

    const data = resp.json();
    return data.value;
}

// ÔöÇÔöÇ Descargar contenido binario de un archivo por Item ID ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
async function downloadDriveItem(itemId, context) {
    const driveId = await getDriveId(context);
    const url = `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content`;

    if (context) context.log(`graphClient: downloading item ${itemId}`);

    // Graph devuelve 302 redirect al blob. https.request no sigue redirects,
    // as├¡ que lo manejamos manualmente.
    const resp = await graphFetch(url, context);

    // Si Graph devuelve 302, seguir el redirect
    if (resp.status === 302 && resp.headers.location) {
        if (context) context.log(`graphClient: following redirect to blob storage`);
        const blobResp = await httpsRequest(resp.headers.location);
        if (!blobResp.ok) {
            throw new Error(`Failed to download from blob (${blobResp.status})`);
        }
        return blobResp.buffer();
    }

    if (!resp.ok) {
        throw new Error(`Failed to download item ${itemId} (${resp.status})`);
    }

    return resp.buffer();
}

module.exports = {
    getAccessToken,
    graphFetch,
    getSiteId,
    getDriveId,
    listDriveChildren,
    downloadDriveItem,
    GRAPH_BASE
};
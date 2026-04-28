/**
 * graphClient.js — Autenticación y helpers para Microsoft Graph API
 * 
 * Usa Client Credentials flow (app-only) para obtener tokens.
 * Cachea el token, Site ID y Drive ID para evitar llamadas repetidas.
 */

// ── Configuración desde variables de entorno ──────────────────────────
const TENANT_ID     = process.env.GRAPH_TENANT_ID;
const CLIENT_ID     = process.env.GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET;
const SP_SITE_HOST  = process.env.SP_SITE_HOST;   // gtmgrupo.sharepoint.com
const SP_SITE_PATH  = process.env.SP_SITE_PATH;   // /sites/GTM-IT_Pruebas_agentes_copilot
const SP_LIBRARY    = process.env.SP_LIBRARY;      // Seguimiento Presupuesto

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_URL  = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

// ── Cache en memoria (vive durante el ciclo de vida de la Function App) ──
let _cachedToken   = null;
let _tokenExpiry   = 0;
let _cachedSiteId  = null;
let _cachedDriveId = null;

// ── Obtener Access Token (Client Credentials) ────────────────────────
async function getAccessToken() {
    // Devolver token cacheado si aún es válido (con 5 min de margen)
    if (_cachedToken && Date.now() < _tokenExpiry - 300000) {
        return _cachedToken;
    }

    const body = new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         "https://graph.microsoft.com/.default"
    });

    const resp = await fetch(TOKEN_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    body.toString()
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Token request failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    _cachedToken  = data.access_token;
    _tokenExpiry  = Date.now() + (data.expires_in * 1000);

    return _cachedToken;
}

// ── Fetch autenticado contra Graph ────────────────────────────────────
async function graphFetch(url, options = {}) {
    const token = await getAccessToken();
    const resp = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }
    });
    return resp;
}

// ── Resolver Site ID ──────────────────────────────────────────────────
async function getSiteId() {
    if (_cachedSiteId) return _cachedSiteId;

    // GET /sites/{hostname}:{serverRelativePath}
    const url = `${GRAPH_BASE}/sites/${SP_SITE_HOST}:${SP_SITE_PATH}`;
    const resp = await graphFetch(url);

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to resolve Site ID (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    _cachedSiteId = data.id;
    return _cachedSiteId;
}

// ── Resolver Drive ID (biblioteca de documentos) ──────────────────────
async function getDriveId() {
    if (_cachedDriveId) return _cachedDriveId;

    const siteId = await getSiteId();
    const url = `${GRAPH_BASE}/sites/${siteId}/drives`;
    const resp = await graphFetch(url);

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to list drives (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    const drive = data.value.find(d =>
        d.name.toLowerCase() === SP_LIBRARY.toLowerCase()
    );

    if (!drive) {
        const available = data.value.map(d => d.name).join(", ");
        throw new Error(
            `Library "${SP_LIBRARY}" not found. Available drives: ${available}`
        );
    }

    _cachedDriveId = drive.id;
    return _cachedDriveId;
}

// ── Listar hijos (carpetas/archivos) de una ruta en el Drive ──────────
async function listDriveChildren(path) {
    const driveId = await getDriveId();

    let url;
    if (!path || path === "/" || path === "") {
        url = `${GRAPH_BASE}/drives/${driveId}/root/children`;
    } else {
        // Asegurarse de que la ruta NO empiece con /
        const cleanPath = path.replace(/^\/+/, "");
        url = `${GRAPH_BASE}/drives/${driveId}/root:/${encodeURIComponent(cleanPath)}:/children`;
    }

    const resp = await graphFetch(url);

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to list children at "${path}" (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return data.value; // Array de DriveItem objects
}

// ── Descargar contenido binario de un archivo por Item ID ──────────────
async function downloadDriveItem(itemId) {
    const driveId = await getDriveId();
    const url = `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content`;

    const resp = await graphFetch(url);

    if (!resp.ok) {
        throw new Error(`Failed to download item ${itemId} (${resp.status})`);
    }

    // Graph devuelve 302 redirect al blob, pero fetch lo sigue automáticamente
    const buffer = await resp.arrayBuffer();
    return Buffer.from(buffer);
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

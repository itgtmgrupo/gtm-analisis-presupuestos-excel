import fetch from "node-fetch";
import { getGraphToken } from "../_graph.js";

export default async function (context, req) {
  
console.log({
  tenant: process.env.GRAPH_TENANT_ID,
  clientId: process.env.GRAPH_CLIENT_ID ? "OK" : "MISSING",
  secret: process.env.GRAPH_CLIENT_SECRET ? "OK" : "MISSING"
});

  const token = await getGraphToken();

  // 1. Resolver siteId
  const siteRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${process.env.SP_SITE_HOST}:${process.env.SP_SITE_PATH}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const site = await siteRes.json();

  // 2. Obtener drives
  const drivesRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${site.id}/drives`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const drives = await drivesRes.json();

  const drive = drives.value.find(d => d.name === process.env.SP_LIBRARY);

  // 3. Listar carpetas
  const foldersRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const folders = (await foldersRes.json()).value
    .filter(i => i.folder)
    .map(i => i.name);

  context.res = { body: folders };
}
import fetch from "node-fetch";
import { getGraphToken } from "../_graph.js";

export default async function (context, req) {
  
console.log({
  tenant: process.env.GRAPH_TENANT_ID,
  clientId: process.env.GRAPH_CLIENT_ID ? "OK" : "MISSING",
  secret: process.env.GRAPH_CLIENT_SECRET ? "OK" : "MISSING"
});

  const { year } = req.query;
  const token = await getGraphToken();

  // Resolver site y drive igual que antes...
  // Buscar archivo Excel dentro de la carpeta year
  // Obtener itemId
  // Descargar /content y devolver buffer

  context.res = {
    headers: { "Content-Type": "application/octet-stream" },
    body: excelBuffer
  };
}
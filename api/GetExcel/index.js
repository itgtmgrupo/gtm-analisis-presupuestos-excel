import fetch from "node-fetch";
import { getGraphToken } from "../_graph.js";

export default async function (context, req) {
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
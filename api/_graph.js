import fetch from "node-fetch";

export async function getGraphToken() {
  const url = `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  const res = await fetch(url, {
    method: "POST",
    body
  });

  const json = await res.json();
  return json.access_token;
}
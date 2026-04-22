export async function getCurrentUser() {
  const res = await fetch("/.auth/me");
  const data = await res.json();
  return data?.clientPrincipal || null;
}
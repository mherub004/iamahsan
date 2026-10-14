// Secrets — set in Cloudflare dashboard → Settings → Variables and secrets
//   ADMIN_PASSWORD  – your admin login password
//   JWT_SECRET      – random string used to sign session tokens
//   GITHUB_TOKEN    – fine-grained PAT with Contents: read & write on mherub004/iamahsan

const OWNER  = "mherub004";
const REPO   = "iamahsan";
const BRANCH = "main";

async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function signToken(payload, secret) {
  const key = await importKey(secret);
  const sig  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(payload) + "." + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyToken(token, secret) {
  const dot = token.indexOf(".");
  if (dot === -1) throw new Error("malformed token");
  const payload = atob(token.slice(0, dot));
  const sigB64  = token.slice(dot + 1);
  const key     = await importKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  if (sigB64 !== btoa(String.fromCharCode(...new Uint8Array(expected)))) throw new Error("invalid signature");
  const parsed = JSON.parse(payload);
  if (Date.now() > parsed.exp) throw new Error("token expired");
  return parsed;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });
}

async function requireAuth(request, env) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return "Missing token";
  try { await verifyToken(token, env.JWT_SECRET); return null; }
  catch (e) { return e.message; }
}

async function ghGet(path, env) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    headers: {
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
}

async function getSha(filePath, env) {
  const r = await ghGet(`contents/${filePath}?ref=${BRANCH}`, env);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status} reading ${filePath}`);
  return (await r.json()).sha;
}

async function putFile(filePath, b64Content, message, env) {
  const sha  = await getSha(filePath, env);
  const body = { message, content: b64Content, branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    let msg = ""; try { msg = (await r.json()).message; } catch {}
    throw new Error(`GitHub ${r.status}${msg ? ": " + msg : ""}`);
  }
  return r.json();
}

async function deleteFile(filePath, message, env) {
  const sha = await getSha(filePath, env);
  if (!sha) return;
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, sha, branch: BRANCH })
  });
  if (!r.ok) {
    let msg = ""; try { msg = (await r.json()).message; } catch {}
    throw new Error(`GitHub ${r.status}${msg ? ": " + msg : ""}`);
  }
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

async function bufferToB64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

async function handleAuth(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return json({ error: "Invalid password" }, 401);
  }
  const payload = JSON.stringify({ sub: "admin", exp: Date.now() + 8 * 3600 * 1000 });
  const token   = await signToken(payload, env.JWT_SECRET);
  return json({ token });
}

async function handleSaveContent(request, env) {
  const err = await requireAuth(request, env);
  if (err) return json({ error: err }, 401);
  let data;
  try { data = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const b64 = utf8ToB64(JSON.stringify(data, null, 2) + "\n");
  await putFile("content.json", b64, "Admin: update site content", env);
  return json({ ok: true });
}

async function handleUploadCv(request, env) {
  const err = await requireAuth(request, env);
  if (err) return json({ error: err }, 401);
  let formData;
  try { formData = await request.formData(); } catch { return json({ error: "Invalid form data" }, 400); }
  const file = formData.get("file");
  if (!file) return json({ error: "No file provided" }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: "File too large (max 10 MB)" }, 400);
  const b64 = await bufferToB64(await file.arrayBuffer());
  await putFile("cv/Mherub_Ahsan_CV.pdf", b64, "Admin: replace CV", env);
  return json({ ok: true });
}

async function handleDeleteCv(request, env) {
  const err = await requireAuth(request, env);
  if (err) return json({ error: err }, 401);
  await deleteFile("cv/Mherub_Ahsan_CV.pdf", "Admin: delete CV", env);
  return json({ ok: true });
}

async function handleCvStatus(request, env) {
  const sha = await getSha("cv/Mherub_Ahsan_CV.pdf", env);
  return json({ exists: sha !== null });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { status: 204 });

    if (pathname === "/admin/auth"         && method === "POST")   return handleAuth(request, env);
    if (pathname === "/admin/save-content" && method === "POST")   return handleSaveContent(request, env);
    if (pathname === "/admin/upload-cv"    && method === "POST")   return handleUploadCv(request, env);
    if (pathname === "/admin/delete-cv"    && method === "DELETE") return handleDeleteCv(request, env);
    if (pathname === "/admin/cv-status"    && method === "GET")    return handleCvStatus(request, env);

    return env.ASSETS.fetch(request);
  }
};

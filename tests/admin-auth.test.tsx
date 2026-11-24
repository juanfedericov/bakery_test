import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_SESSION_COOKIE, createAdminSession, verifyAdminSession } from "../lib/admin-auth";
import { DELETE, GET, POST } from "../app/api/admin/session/route";

function setEnvironment(name: string, value: string | undefined): () => void {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return () => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

function loginRequest(password: string): Request {
  return new Request("http://localhost/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

test("inicia sesión con credenciales válidas y verifica el acceso en el servidor", async (t) => {
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "test-password");
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", "test-session-secret");
  const restoreNodeEnv = setEnvironment("NODE_ENV", "production");
  t.after(() => {
    restorePassword();
    restoreSecret();
    restoreNodeEnv();
  });

  const response = await POST(loginRequest("test-password"));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=3600/);

  const token = cookie.split(";")[0].slice(`${ADMIN_SESSION_COOKIE}=`.length);
  const sessionCheck = await GET(new Request("http://localhost/api/admin/session", {
    headers: { Cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
  }));
  assert.equal(sessionCheck.status, 200);
  assert.deepEqual(await sessionCheck.json(), { authenticated: true });
});

test("rechaza credenciales incorrectas y niega acceso sin sesión válida", async (t) => {
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "test-password");
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", "test-session-secret");
  t.after(() => {
    restorePassword();
    restoreSecret();
  });

  const response = await POST(loginRequest("wrong-password"));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await GET(new Request("http://localhost/api/admin/session"))).status, 401);
});

test("las sesiones vencen y el cierre invalida la cookie del navegador", async (t) => {
  const restorePassword = setEnvironment("ADMIN_PASSWORD", "test-password");
  const restoreSecret = setEnvironment("ADMIN_SESSION_SECRET", "test-session-secret");
  const restoreNodeEnv = setEnvironment("NODE_ENV", "development");
  t.after(() => {
    restorePassword();
    restoreSecret();
    restoreNodeEnv();
  });

  const now = 1_800_000_000_000;
  const token = createAdminSession("test-session-secret", now);
  assert.ok(token);
  assert.equal(verifyAdminSession(token, "test-session-secret", now), true);
  assert.equal(verifyAdminSession(token, "test-session-secret", now + 60 * 60 * 1000), false);
  assert.equal(verifyAdminSession(token, "different-secret", now), false);

  const response = await DELETE();
  assert.equal(response.status, 204);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=;`));
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /; Secure/);
});

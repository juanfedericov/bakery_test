import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/admin-auth";

function getCookie(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length);
}

function cookieAttributes(): string {
  return `Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function hasPassword(value: unknown): value is { password: string } {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && "password" in value
    && typeof value.password === "string";
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return Response.json({ error: "La autenticación administrativa no está configurada." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no contiene JSON válido." }, { status: 400 });
  }
  if (!hasPassword(body)) {
    return Response.json({ error: "La contraseña es obligatoria." }, { status: 400 });
  }
  if (!verifyAdminPassword(body.password)) {
    return Response.json({ error: "Las credenciales no son válidas." }, { status: 401 });
  }

  const token = createAdminSession();
  if (!token) {
    return Response.json({ error: "La autenticación administrativa no está configurada." }, { status: 503 });
  }

  return Response.json(
    { authenticated: true },
    {
      headers: {
        "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${token}; ${cookieAttributes()}; Max-Age=${ADMIN_SESSION_TTL_SECONDS}`,
      },
    },
  );
}

export async function GET(request: Request) {
  if (!isAdminAuthConfigured()) {
    return Response.json({ error: "La autenticación administrativa no está configurada." }, { status: 503 });
  }
  if (!verifyAdminSession(getCookie(request, ADMIN_SESSION_COOKIE))) {
    return Response.json({ error: "La sesión administrativa no es válida." }, { status: 401 });
  }
  return Response.json({ authenticated: true });
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; ${cookieAttributes()}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    },
  });
}

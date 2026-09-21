/** Test end-to-end de autenticación multi-usuario. Uso: node scripts/test-auth.mjs */
const base = "http://127.0.0.1:4780";
const ts = Date.now();
const emailA = `pedro${ts}@test.cl`;
const emailB = `maria${ts}@test.cl`;

let cookieA = "";
let cookieB = "";

async function req(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data, setCookie };
}

function check(name, cond, extra = "") {
  console.log(`${cond ? "OK " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) process.exitCode = 1;
}

// 1. Sin sesión → 401
const noAuth = await req("/api/goals");
check("sin sesión → 401", noAuth.status === 401, `got ${noAuth.status}`);

// 2. Registrar usuario A
const regA = await req("/api/auth/register", {
  method: "POST",
  body: { name: "Pedro", email: emailA, password: "Secret123" },
});
check("register A", regA.status === 201, `${regA.status} ${JSON.stringify(regA.data)}`);
cookieA = regA.setCookie?.split(";")[0] ?? "";

// 3. /me
const me = await req("/api/auth/me", { cookie: cookieA });
check("me", me.status === 200 && me.data?.user?.email === emailA, me.data?.user?.name);

// 4. Recursos sembrados con CLP
const res = await req("/api/resources", { cookie: cookieA });
const money = res.data?.find((r) => r.type === "money");
check("recursos sembrados", res.status === 200 && res.data?.length === 4, `${res.data?.length} recursos`);
check("money en CLP", money?.unit === "CLP", money?.unit);

// 5. Crear goal como A
const g = await req("/api/goals", {
  method: "POST",
  cookie: cookieA,
  body: { title: "Ahorrar para el depa", targetValue: 5000000, unit: "CLP" },
});
check("goal A creado", g.status === 201, g.data?.title);

// 6. Registrar usuario B → ve 0 goals
const regB = await req("/api/auth/register", {
  method: "POST",
  body: { name: "María", email: emailB, password: "Secret456" },
});
cookieB = regB.setCookie?.split(";")[0] ?? "";
const goalsB = await req("/api/goals", { cookie: cookieB });
check("aislamiento: B ve 0 goals", goalsB.status === 200 && goalsB.data?.length === 0, `${goalsB.data?.length}`);

// 7. B no puede ver el goal de A
const stolen = await req(`/api/goals/${g.data.id}`, { cookie: cookieB });
check("B no ve goal de A → 404", stolen.status === 404, `got ${stolen.status}`);

// 8. Login con password incorrecta (formato válido) → 401
const badLogin = await req("/api/auth/login", {
  method: "POST",
  body: { email: emailA, password: "wrongpass" },
});
check("login incorrecto → 401", badLogin.status === 401, `got ${badLogin.status}`);

// 9. Login correcto → A ve su goal
const loginA = await req("/api/auth/login", {
  method: "POST",
  body: { email: emailA, password: "Secret123" },
});
const cookieA2 = loginA.setCookie?.split(";")[0] ?? "";
const goalsA = await req("/api/goals", { cookie: cookieA2 });
check("login: A ve 1 goal", goalsA.status === 200 && goalsA.data?.length === 1, `${goalsA.data?.length}`);

// 10. Logout → sesión muere
await req("/api/auth/logout", { method: "POST", cookie: cookieA2, body: {} });
const afterLogout = await req("/api/goals", { cookie: cookieA2 });
check("logout → 401", afterLogout.status === 401, `got ${afterLogout.status}`);

// 11. Email duplicado → 409
const dup = await req("/api/auth/register", {
  method: "POST",
  body: { name: "Otro", email: emailA, password: "Secret123" },
});
check("email duplicado → 409", dup.status === 409, `got ${dup.status}`);

// 12. Contraseña débil → 400
const weak = await req("/api/auth/register", {
  method: "POST",
  body: { name: "Débil", email: `debil${ts}@test.cl`, password: "abc" },
});
check("contraseña débil → 400", weak.status === 400, `got ${weak.status}`);

console.log(process.exitCode ? "\n❌ Hay fallos" : "\n✅ Todo OK");

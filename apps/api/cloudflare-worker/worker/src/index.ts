import { Hono } from 'hono';
import { jwtVerify, SignJWT } from 'jose';
// bcryptjs is ESM-friendly when imported as default
import bcrypt from 'bcryptjs';

export type Env = {
  DB: D1Database;
  R2: R2Bucket;
  SESSIONS: KVNamespace;
  CLIENT_URL: string;
  JWT_ISSUER: string;
  JWT_SECRET: string;
  CF_CRON_TOKEN: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// --- CORS for dev and simple prod usage ---
app.use('/*', async (c, next) => {
  const origin = c.req.header('origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-CF-Cron-Token');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  return next();
});

// --- JD Templates ---
app.get('/api/jd-templates', async (c) => {
  await ensureTables(c.env.DB);
  const user = c.get('user');
  if (!user?.company_id) return c.json({ success: false, message: 'No company bound to user' }, 400);
  const items = await d1All<any>(c.env.DB,
    'SELECT id, domain, title, department, role, salary, location, experience_level as experienceLevel, skills, summary, responsibilities_json, qualifications_json, notes, created_at as createdAt FROM jd_templates WHERE company_id = ? ORDER BY created_at DESC LIMIT 100',
    [user.company_id]
  );
  const data = items.map((t) => ({
    ...t,
    responsibilities: safeJSON<string[]>(t.responsibilities_json, []),
    qualifications: safeJSON<string[]>(t.qualifications_json, [])
  }));
  return c.json({ success: true, data });
});

app.post('/api/jd-templates', async (c) => {
  await ensureTables(c.env.DB);
  const user = c.get('user');
  if (!user?.company_id) return c.json({ success: false, message: 'No company bound to user' }, 400);
  const body = await c.req.json<any>().catch(() => ({}));
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await d1Run(c.env.DB,
    `INSERT INTO jd_templates (id, company_id, domain, title, department, role, salary, location, experience_level, skills, summary, responsibilities_json, qualifications_json, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user.company_id,
      body.domain || '',
      body.title || '',
      body.department || '',
      body.role || '',
      body.salary || '',
      body.location || '',
      body.experienceLevel || '',
      body.skills || '',
      body.summary || '',
      JSON.stringify(body.responsibilities || []),
      JSON.stringify(body.qualifications || []),
      body.notes || '',
      now
    ]
  );
  return c.json({ success: true, message: 'Template saved', data: { id } }, 201);
});

app.delete('/api/jd-templates/:id', async (c) => {
  await ensureTables(c.env.DB);
  const user = c.get('user');
  if (!user?.company_id) return c.json({ success: false, message: 'No company bound to user' }, 400);
  const id = c.req.param('id');
  await d1Run(c.env.DB, 'DELETE FROM jd_templates WHERE id = ? AND company_id = ?', [id, user.company_id]);
  return c.json({ success: true, message: 'Template deleted' });
});

// AI-like JD generator (rule-based, no external API)
app.post('/api/ai/generate-jd', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const title = String(body.title || '').trim();
  const department = String(body.department || '').trim();
  const role = String(body.role || '').trim();
  const salary = String(body.salary || '').trim();

  if (!title) return c.json({ success: false, message: 'title is required' }, 400);

  // Infer skills by simple heuristics from role/title/department
  const seeds = `${title} ${role} ${department}`.toLowerCase();
  const skillsSet = new Set<string>();
  const add = (s: string) => skillsSet.add(s);
  if (/react|frontend|ui|web/.test(seeds)) { add('React'); add('TypeScript'); add('HTML/CSS'); add('Redux'); }
  if (/node|backend|api|server/.test(seeds)) { add('Node.js'); add('Express'); add('REST APIs'); add('SQL/NoSQL'); }
  if (/full.?stack/.test(seeds)) { add('React'); add('Node.js'); add('TypeScript'); add('Databases'); }
  if (/data|ml|ai|analytics/.test(seeds)) { add('Python'); add('Pandas'); add('SQL'); add('Machine Learning'); }
  if (/devops|cloud|infra|sre/.test(seeds)) { add('AWS'); add('CI/CD'); add('Docker'); add('Kubernetes'); }
  if (/mobile|android|ios|flutter|react native/.test(seeds)) { add('React Native'); add('Android/iOS'); add('Mobile CI/CD'); }
  if (skillsSet.size === 0) { add('Team Collaboration'); add('Problem Solving'); add('Communication'); }

  // Domain presets
  const domain = String(body.domain || body.industry || department).toLowerCase();
  const addMany = (arr: string[]) => arr.forEach(add);
  if (/fintech|finance|bank|trading|insurance/.test(domain)) {
    addMany(['Compliance', 'Risk Analysis', 'Security', 'Payments']);
  } else if (/health|medic|pharma|clinical|care/.test(domain)) {
    addMany(['HIPAA', 'FHIR/HL7', 'Privacy', 'Healthcare Analytics']);
  } else if (/e-?commerce|retail|marketplace/.test(domain)) {
    addMany(['A/B Testing', 'Conversion Optimization', 'SEO', 'Payments']);
  } else if (/gaming|game/.test(domain)) {
    addMany(['Real-time Systems', 'Graphics', 'Latency Optimization']);
  } else if (/edtech|education|learning/.test(domain)) {
    addMany(['LMS', 'Accessibility', 'Content Authoring']);
  } else if (/cyber|security/.test(domain)) {
    addMany(['OWASP', 'Threat Modeling', 'Vulnerability Management']);
  } else if (/manufactur|iot|factory/.test(domain)) {
    addMany(['IoT', 'Telemetry', 'SCADA']);
  } else if (/telecom|network/.test(domain)) {
    addMany(['Networking', 'SLA', 'Monitoring']);
  }

  const skills = Array.from(skillsSet).join(', ');

  const responsibilities: string[] = [
    `Design, build, and maintain ${department || 'product'} features for the ${title} role`,
    'Collaborate with cross-functional teams to deliver high-quality outcomes',
    'Write clean, testable, and maintainable code following best practices',
    'Participate in code reviews and contribute to technical discussions'
  ];
  const qualifications: string[] = [
    `${role || 'Professional'} with proven experience in similar roles`,
    `Hands-on skills: ${skills}`,
    'Strong problem-solving and communication skills'
  ];

  let jd = {
    title,
    department: department || 'General',
    role: role || 'Individual Contributor',
    salary: salary || 'Competitive',
    location: body.location || 'Remote',
    experienceLevel: body.experienceLevel || 'mid-level',
    skills,
    summary: `${title} in ${department || 'our team'} responsible for ${role || 'key deliverables'}. Compensation: ${salary || 'Competitive'}.`,
    responsibilities,
    qualifications
  };

  // Optional: use OpenAI if configured
  try {
    const apiKey = (c.env as any).OPENAI_API_KEY as string | undefined;
    const model = ((c.env as any).OPENAI_MODEL as string) || 'gpt-4o-mini';
    if (apiKey) {
      const prompt = `Craft a concise, accurate job description JSON strictly in this shape:
{
  "title": string,
  "department": string,
  "role": string,
  "salary": string,
  "location": string,
  "experienceLevel": string,
  "skills": string, // comma separated
  "summary": string,
  "responsibilities": string[],
  "qualifications": string[]
}
Inputs:
title=${title}
department=${department}
role=${role}
salary=${salary}
location=${body.location || 'Remote'}
experienceLevel=${body.experienceLevel || 'mid-level'}
domain=${domain || 'general'}
Seed skills: ${skills}
Return only valid JSON.`;
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful HR assistant that writes accurate job descriptions.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });
      if (resp.ok) {
        const data: any = await resp.json();
        const content = data?.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(content);
          if (parsed && parsed.title) {
            jd = parsed;
          }
        } catch {}
      }
    }
  } catch (e) {
    // Ignore AI failures and fallback to rule-based JD
  }

  return c.json({ success: true, data: { jobDescription: jd } });
});

// Aliases for AI JD generation to avoid path mismatch across deployments
app.post('/ai/generate-jd', async (c) => {
  // Proxy to the primary handler logic by rebuilding the body
  const body = await c.req.json<any>().catch(() => ({}));
  // Reuse the same generation by calling the same function via fetch to itself
  // or duplicate the core logic inline for simplicity
  const req = new Request(new URL('/api/ai/generate-jd', c.req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  // Directly call the app to avoid external request
  // @ts-ignore
  return app.fetch(req, c.env, c.executionCtx);
});
app.post('/api/ai/generateJD', async (c) => {
  const req = new Request(new URL('/api/ai/generate-jd', c.req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await c.req.text()
  });
  // @ts-ignore
  return app.fetch(req, c.env, c.executionCtx);
});

// Guard accidental GET calls to login
app.get('/api/auth/login', (c) => {
  return c.json({ success: false, message: 'Use POST for /api/auth/login' }, 405);
});

// Get current authenticated user from JWT
app.get('/api/auth/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, message: 'Unauthorized' }, 401);
  
  // Get full user details from database
  const users = await d1All<any>(c.env.DB, 'SELECT id, email, role, company_id, created_at FROM users WHERE id = ? LIMIT 1', [user.sub]);
  if (users.length === 0) return c.json({ success: false, message: 'User not found' }, 404);
  
  return c.json({ success: true, data: { user: users[0] } });
});

// Logout endpoint (invalidate refresh token)
app.post('/api/auth/logout', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const rt = body.refreshToken;
  if (rt) {
    await c.env.SESSIONS.delete(`rt:${rt}`);
  }
  return c.json({ success: true, message: 'Logged out successfully' });
});

// --- Small D1 helpers ---
async function d1All<T = any>(db: D1Database, sql: string, binds: any[] = []): Promise<T[]> {
  const stmt = db.prepare(sql);
  const safeBinds = (binds || []).map((v) => (v === undefined || Number.isNaN(v) ? null : v));
  const res = await (safeBinds.length ? stmt.bind(...safeBinds) : stmt).all<T>();
  // @ts-ignore - results shape
  return (res?.results as any[]) || [];
}

async function d1Run(db: D1Database, sql: string, binds: any[] = []): Promise<void> {
  const stmt = db.prepare(sql);
  const safeBinds = (binds || []).map((v) => (v === undefined || Number.isNaN(v) ? null : v));
  await (safeBinds.length ? stmt.bind(...safeBinds) : stmt).run();
}

function safeJSON<T = any>(val: any, fallback: T): T {
  try {
    if (val == null) return fallback;
    if (typeof val === 'string') return JSON.parse(val) as T;
    return val as T;
  } catch {
    return fallback;
  }
}

// Health
app.get('/api/health', (c) => c.json({ success: true, message: 'Worker is running', runtime: 'cloudflare-workers', timestamp: new Date().toISOString() }));

// Admin maintenance: drop all *_ext tables (irreversible). Use with caution.
app.post('/api/admin/drop-ext-tables', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'superadmin' && user?.role !== 'super_admin') {
    return c.json({ success: false, message: 'Forbidden' }, 403);
  }
  try {
    // Find all tables ending with _ext
    const tables = await d1All<any>(c.env.DB, "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%_ext'");
    const dropped: string[] = [];
    for (const t of tables) {
      const name = t?.name;
      if (!name) continue;
      try {
        await d1Run(c.env.DB, `DROP TABLE IF EXISTS ${name}`);
        dropped.push(name);
      } catch (e) {
        // continue dropping others
      }
    }
    return c.json({ success: true, message: 'Dropped _ext tables', data: { dropped } });
  } catch (e: any) {
    return c.json({ success: false, message: e?.message || 'Failed to drop _ext tables' }, 500);
  }
});


// Ensure CORS headers on any thrown error
app.onError((err, c) => {
  const origin = c.req.header('origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-CF-Cron-Token');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  const msg = (err as Error)?.message || 'Internal Server Error';
  return c.json({ success: false, message: msg }, 500);
});

// Public endpoints that don't require auth (e.g., candidate token validation)
const PUBLIC_PATHS = new Set<string>([
  '/api/health',
  '/api/assessment/login',
  '/api/candidates/assessment/login',
  '/api/auth/login',
  '/api/setup/superadmin',
  '/api/auth/refresh',
  // Allow AI JD generation publicly to rule out auth issues (optional)
  '/api/ai/generate-jd'
]);

// JWT auth middleware with explicit invalid vs expired messages
app.use('/api/*', async (c, next) => {
  const url = new URL(c.req.url);
  if (
    PUBLIC_PATHS.has(url.pathname) ||
    url.pathname.startsWith('/api/candidates/assessment/validate/')
  ) {
    return next();
  }

  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ success: false, message: 'Unauthorized' }, 401);

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(c.env.JWT_SECRET),
      { issuer: c.env.JWT_ISSUER }
    );
    // Enrich user from DB so downstream routes have role/company_id reliably
    try {
      const rows = await d1All<any>(c.env.DB, 'SELECT id as sub, email, role, company_id FROM users WHERE id = ? LIMIT 1', [payload.sub]);
      if (rows.length) {
        c.set('user', rows[0]);
      } else {
        c.set('user', payload as any);
      }
    } catch {
      c.set('user', payload as any);
    }
    return next();
  } catch (e: any) {
    const msg = /exp|expired/i.test(String(e?.message)) ? 'Token expired' : 'Invalid token';
    return c.json({ success: false, message: msg }, 401);
  }
});

// --- Auth: issue JWTs and refresh tokens via KV ---
async function signAccessToken(c: any, payload: Record<string, any>, expiresInSec: number) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload, iat: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(c.env.JWT_ISSUER)
    .setExpirationTime(`${expiresInSec}s`)
    .sign(new TextEncoder().encode(c.env.JWT_SECRET));
}

// POST /api/auth/login { email, password }
app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const email = (body.email || '').toLowerCase().trim();
  const password = body.password || '';
  if (!email || !password) return c.json({ success: false, message: 'Email and password are required' }, 400);
  // Look up user by email in users table
  const users = await d1All<any>(c.env.DB, 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  if (users.length === 0) return c.json({ success: false, message: 'User not found' }, 401);
  const user = users[0];
  // Verify bcrypt password
  const ok = user.password_hash ? await bcrypt.compare(password, String(user.password_hash)) : false;
  if (!ok) return c.json({ success: false, message: 'Invalid password' }, 401);
  const accessToken = await signAccessToken(c, { sub: user.id, email: user.email, role: user.role || 'user', company_id: user.company_id }, 3600);
  const refreshToken = crypto.randomUUID();
  await c.env.SESSIONS.put(`rt:${refreshToken}`, JSON.stringify({ sub: user.id, email: user.email }), { expirationTtl: 60 * 60 * 24 * 7 });
  return c.json({ success: true, data: { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } } });
});

// POST /api/auth/refresh { refreshToken }
app.post('/api/auth/refresh', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const rt = body.refreshToken;
  if (!rt) return c.json({ success: false, message: 'refreshToken required' }, 400);
  const session = await c.env.SESSIONS.get(`rt:${rt}`);
  if (!session) return c.json({ success: false, code: 'TOKEN_EXPIRED', message: 'Refresh token expired or invalid' }, 401);
  const data = JSON.parse(session);
  // Refresh: look up latest role and company binding for token enrichment
  let dbUser: any = null;
  try {
    const rows = await d1All<any>(c.env.DB, 'SELECT id as sub, email, role, company_id FROM users WHERE id = ? LIMIT 1', [data.sub]);
    dbUser = rows[0] || null;
  } catch {}
  const accessToken = await signAccessToken(
    c,
    dbUser ? { sub: dbUser.sub, email: dbUser.email, role: dbUser.role, company_id: dbUser.company_id } : { sub: data.sub, email: data.email },
    3600
  );
  const newRefresh = crypto.randomUUID();
  await c.env.SESSIONS.delete(`rt:${rt}`);
  await c.env.SESSIONS.put(`rt:${newRefresh}`, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 7 });
  return c.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
});

// Public: Candidate assessment login token validation
// Accepts { token } and returns { success, message, data } with clear error messages.
app.post('/api/assessment/login', async (c) => {
  try {
    const body = await c.req.json<any>();
    const token = body?.token || '';
    if (!token) return c.json({ success: false, message: 'Token required' }, 400);

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(c.env.JWT_SECRET),
        { issuer: c.env.JWT_ISSUER }
      );
      // Optionally: look up candidate/assignment in D1 here by payload fields.
      return c.json({ success: true, message: 'Token valid', data: { user: payload } });
    } catch (e: any) {
      const msg = /exp|expired/i.test(String(e?.message)) ? 'Token expired' : 'Invalid token';
      return c.json({ success: false, message: msg }, 401);
    }
  } catch {
    return c.json({ success: false, message: 'Bad Request' }, 400);
  }
});

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_DEFAULT_MODEL = 'claude-sonnet-4-20250514';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function toIsoFromSec(v: any): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toISOString();
}

function normalizeCompareText(text: any) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseNameParts(fullName: string) {
  const cleaned = String(fullName || '').trim();
  if (!cleaned) return { firstName: 'Candidate', lastName: '' };
  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0] || 'Candidate',
    lastName: parts.slice(1).join(' ')
  };
}

function stripFence(text: string) {
  return text.replace(/```json|```/gi, '').trim();
}

function parseClaudeJSON(text: string) {
  return JSON.parse(stripFence(text));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function decodeTextFallback(buffer: ArrayBuffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    return decoder.decode(buffer).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function resumeFallbackFromText(fileName: string, rawText: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const email = (rawText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
  const phone = (rawText.match(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/) || [])[0] || '';
  return {
    name: baseName || 'Candidate',
    email,
    phone,
    skills: { technical: [], tools: [] },
    experience: [],
    projects: [],
    summary: ''
  };
}

async function callClaude(c: any, messages: any[], maxTokens = 2000) {
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const model = c.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Claude API error (${res.status}): ${errText || res.statusText}`);
  }
  const data: any = await res.json();
  return (data?.content || []).map((b: any) => b?.text || '').join('');
}

async function parseResumeWithClaude(c: any, file: File, buffer: ArrayBuffer) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const rawText = decodeTextFallback(buffer);
  const fallback = resumeFallbackFromText(file.name, rawText);

  try {
    const base64 = arrayBufferToBase64(buffer);
    const promptSchema =
      '{"name":"","email":"","phone":"","skills":{"technical":[],"tools":[]},"experience":[{"title":"","company":"","description":""}],"projects":[{"name":"","technologies":[]}],"summary":""}';
    const contentBlocks = isPdf
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: `Extract resume info as JSON only (no markdown): ${promptSchema}` }
        ]
      : [
          {
            type: 'text',
            text: `File: ${file.name}\nResume text:\n${rawText.slice(0, 20000)}\nExtract resume info as JSON only (no markdown): ${promptSchema}`
          }
        ];

    const text = await callClaude(c, [{ role: 'user', content: contentBlocks }], 2200);
    const parsed = parseClaudeJSON(text);
    const merged = {
      ...fallback,
      ...(parsed || {}),
      skills: {
        technical: Array.isArray(parsed?.skills?.technical) ? parsed.skills.technical : (fallback.skills.technical || []),
        tools: Array.isArray(parsed?.skills?.tools) ? parsed.skills.tools : (fallback.skills.tools || [])
      },
      experience: Array.isArray(parsed?.experience) ? parsed.experience : [],
      projects: Array.isArray(parsed?.projects) ? parsed.projects : []
    };
    return merged;
  } catch (err) {
    console.warn('Claude resume parsing failed, using fallback:', (err as Error)?.message || err);
    return fallback;
  }
}

function normalizeAssessmentStructure(raw: any) {
  const letters = ['A', 'B', 'C', 'D'];
  const mcq = (Array.isArray(raw?.mcq) ? raw.mcq : []).slice(0, 5).map((q: any, i: number) => {
    const opts = (Array.isArray(q?.options) ? q.options : []).slice(0, 4).map((o: any) => String(o || ''));
    while (opts.length < 4) opts.push(`${letters[opts.length]}) Option ${letters[opts.length]}`);
    let correct = String(q?.correct || '').trim().toUpperCase();
    if (!letters.includes(correct)) correct = letters[i % 4];
    return {
      id: String(q?.id || `m${i + 1}`),
      question: String(q?.question || `MCQ ${i + 1}`),
      options: opts,
      correct,
      explanation: String(q?.explanation || '')
    };
  });

  const output = (Array.isArray(raw?.output) ? raw.output : []).slice(0, 3).map((q: any, i: number) => ({
    id: String(q?.id || `o${i + 1}`),
    question: String(q?.question || 'What will be the output?'),
    code: String(q?.code || '// code'),
    answer: String(q?.answer || ''),
    explanation: String(q?.explanation || '')
  }));

  const practicalArr = Array.isArray(raw?.practical) ? raw.practical : [];
  const practical = practicalArr.length
    ? [{
        id: String(practicalArr[0]?.id || 'p1'),
        question: String(practicalArr[0]?.question || 'Solve the given problem'),
        expectedConcepts: Array.isArray(practicalArr[0]?.expectedConcepts) ? practicalArr[0].expectedConcepts : [],
        sampleAnswer: String(practicalArr[0]?.sampleAnswer || '')
      }]
    : [{
        id: 'p1',
        question: 'Write a function to solve a practical problem from your stack.',
        expectedConcepts: [],
        sampleAnswer: ''
      }];

  return { mcq, output, practical };
}

function flattenAssessmentQuestions(structure: any) {
  const letters = ['A', 'B', 'C', 'D'];
  const out: any[] = [];

  for (const q of structure.mcq || []) {
    const options = (q.options || []).slice(0, 4).map((opt: any, idx: number) => {
      const clean = String(opt || '').replace(/^\s*[A-D]\)\s*/i, '').trim();
      return { _id: letters[idx], text: clean || `Option ${letters[idx]}` };
    });
    out.push({
      _id: q.id,
      id: q.id,
      type: 'mcq',
      question: q.question,
      options,
      correct: q.correct,
      explanation: q.explanation || '',
      points: 1
    });
  }

  for (const q of structure.output || []) {
    out.push({
      _id: q.id,
      id: q.id,
      type: 'output',
      question: q.question,
      code: q.code,
      options: [],
      answer: q.answer || '',
      explanation: q.explanation || '',
      points: 1
    });
  }

  for (const q of structure.practical || []) {
    out.push({
      _id: q.id,
      id: q.id,
      type: 'practical',
      question: q.question,
      options: [],
      expectedConcepts: q.expectedConcepts || [],
      sampleAnswer: q.sampleAnswer || '',
      points: 1
    });
  }

  return out;
}

async function generateAssessmentFromResume(c: any, resumeData: any) {
  const fallback = normalizeAssessmentStructure({
    mcq: Array.from({ length: 5 }).map((_, i) => ({
      id: `m${i + 1}`,
      question: `Which statement best describes ${resumeData?.skills?.technical?.[0] || 'the mentioned skill'}?`,
      options: ['A) Core concept', 'B) UI framework', 'C) Database', 'D) Testing tool'],
      correct: 'A',
      explanation: ''
    })),
    output: Array.from({ length: 3 }).map((_, i) => ({
      id: `o${i + 1}`,
      question: 'What will be the output?',
      code: '// Write expected output',
      answer: '',
      explanation: ''
    })),
    practical: [{
      id: 'p1',
      question: 'Build a small function related to your stack.',
      expectedConcepts: [],
      sampleAnswer: ''
    }]
  });

  try {
    const prompt = `Based on this resume data, generate an interview test with EXACTLY this JSON structure (no markdown):
{
  "mcq": [
    {"id":"m1","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."},
    {"id":"m2","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"B","explanation":"..."},
    {"id":"m3","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"C","explanation":"..."},
    {"id":"m4","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."},
    {"id":"m5","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"D","explanation":"..."}
  ],
  "output": [
    {"id":"o1","question":"What will be the output of this code? [write a relevant code snippet based on their skills]","code":"// paste relevant code here","answer":"the correct output","explanation":"..."},
    {"id":"o2","question":"What will be the output?","code":"// paste relevant code here","answer":"the correct output","explanation":"..."},
    {"id":"o3","question":"What will be the output?","code":"// paste relevant code here","answer":"the correct output","explanation":"..."}
  ],
  "practical": [
    {"id":"p1","question":"Write a function/program to [task relevant to their skills and experience]","expectedConcepts":["concept1","concept2","concept3"],"sampleAnswer":"// a sample correct answer"}
  ]
}

Resume: ${JSON.stringify(resumeData)}

Rules:
- MCQ questions must test concepts from actual skills/experience
- Output questions must use primary programming language(s)
- Practical must be solvable in ~10 minutes
- Make questions progressively harder`;

    const text = await callClaude(c, [{ role: 'user', content: prompt }], 3200);
    return normalizeAssessmentStructure(parseClaudeJSON(text));
  } catch (err) {
    console.warn('Claude assessment generation failed, using fallback:', (err as Error)?.message || err);
    return fallback;
  }
}

function fallbackEvaluation(structure: any, answersById: Record<string, any>) {
  const mcqResults = (structure.mcq || []).map((q: any) => {
    const userAnswer = String(answersById[q.id] || '');
    const normalized = userAnswer.trim().toUpperCase();
    const isCorrect = normalized.startsWith(String(q.correct || '').toUpperCase());
    return { id: q.id, isCorrect, feedback: isCorrect ? 'Correct answer.' : `Expected ${q.correct}.` };
  });

  const outputResults = (structure.output || []).map((q: any) => {
    const expected = normalizeCompareText(q.answer);
    const user = normalizeCompareText(answersById[q.id]);
    const isCorrect = !!expected && expected === user;
    return { id: q.id, isCorrect, score: isCorrect ? 1 : 0, feedback: isCorrect ? 'Output matched.' : 'Output mismatch.' };
  });

  const practicalQ = (structure.practical || [])[0];
  const practicalAns = normalizeCompareText(answersById[practicalQ?.id || 'p1']);
  const concepts = Array.isArray(practicalQ?.expectedConcepts) ? practicalQ.expectedConcepts : [];
  let hit = 0;
  for (const c of concepts) {
    if (practicalAns.includes(normalizeCompareText(c))) hit += 1;
  }
  const conceptScore = concepts.length ? hit / concepts.length : 0.5;
  const lengthBoost = practicalAns.length > 80 ? 0.2 : practicalAns.length > 20 ? 0.1 : 0;
  const practicalScore = Math.min(1, Number((conceptScore + lengthBoost).toFixed(2)));
  const practicalResult = {
    score: practicalScore,
    feedback: 'Fallback evaluation used.',
    strengths: practicalScore >= 0.7 ? ['Good concept coverage'] : [],
    improvements: practicalScore < 0.8 ? ['Add more depth and edge-case handling'] : []
  };

  const mcqCorrect = mcqResults.filter((r: any) => r.isCorrect).length;
  const outputCorrect = outputResults.filter((r: any) => r.isCorrect).length;
  const totalDenominator = Math.max(1, (structure.mcq || []).length + (structure.output || []).length + 1);
  const totalScore = Number(((mcqCorrect + outputCorrect + practicalScore) / totalDenominator).toFixed(4));
  const passed = totalScore >= 0.8;

  return {
    mcqResults,
    outputResults,
    practicalResult,
    totalScore,
    passed,
    overallFeedback: passed ? 'Strong performance overall.' : 'Needs improvement in key concepts.',
    recommendation: passed ? 'Proceed to next interview round.' : 'Consider a re-attempt after preparation.'
  };
}

async function evaluateAssessmentWithClaude(c: any, structure: any, answersById: Record<string, any>, resumeData: any) {
  const fallback = fallbackEvaluation(structure, answersById);

  const submission = {
    mcq: (structure.mcq || []).map((q: any) => ({
      question: q.question,
      correct: q.correct,
      userAnswer: answersById[q.id] || 'Not answered',
      isCorrect: String(answersById[q.id] || '').toUpperCase().startsWith(String(q.correct || '').toUpperCase()),
      explanation: q.explanation
    })),
    output: (structure.output || []).map((q: any) => ({
      question: q.question,
      code: q.code,
      expectedAnswer: q.answer,
      userAnswer: answersById[q.id] || 'Not answered',
      explanation: q.explanation
    })),
    practical: {
      question: structure.practical?.[0]?.question || '',
      expectedConcepts: structure.practical?.[0]?.expectedConcepts || [],
      sampleAnswer: structure.practical?.[0]?.sampleAnswer || '',
      userAnswer: answersById[structure.practical?.[0]?.id || 'p1'] || 'Not answered'
    },
    resume: resumeData || {}
  };

  try {
    const prompt = `Evaluate this interview test submission and return ONLY JSON (no markdown):
{
  "mcqResults": [{"id":"m1","isCorrect":true,"feedback":"..."},...],
  "outputResults": [{"id":"o1","isCorrect":true,"score":1,"feedback":"..."},...],
  "practicalResult": {"score":0.8,"feedback":"detailed feedback","strengths":["..."],"improvements":["..."]},
  "totalScore": 0.85,
  "passed": true,
  "overallFeedback": "...",
  "recommendation": "..."
}

Scoring:
- Each MCQ: 1 point (already evaluated: use isCorrect from submission)
- Each output question: 0 or 1 point (check if user answer matches expected, be flexible with formatting/whitespace)
- Practical: 0 to 1 point based on concept coverage and correctness
- totalScore = (mcq_correct + output_correct + practical_score) / 9
- passed = totalScore >= 0.8

Submission: ${JSON.stringify(submission)}`;

    const text = await callClaude(c, [{ role: 'user', content: prompt }], 2400);
    const parsed = parseClaudeJSON(text);
    return {
      ...fallback,
      ...(parsed || {}),
      mcqResults: Array.isArray(parsed?.mcqResults) ? parsed.mcqResults : fallback.mcqResults,
      outputResults: Array.isArray(parsed?.outputResults) ? parsed.outputResults : fallback.outputResults,
      practicalResult: parsed?.practicalResult || fallback.practicalResult,
      totalScore: Number.isFinite(parsed?.totalScore) ? parsed.totalScore : fallback.totalScore,
      passed: typeof parsed?.passed === 'boolean' ? parsed.passed : fallback.passed,
      overallFeedback: parsed?.overallFeedback || fallback.overallFeedback,
      recommendation: parsed?.recommendation || fallback.recommendation
    };
  } catch (err) {
    console.warn('Claude evaluation failed, using fallback:', (err as Error)?.message || err);
    return fallback;
  }
}

async function ensureAssessmentTables(db: D1Database) {
  await d1Run(db, `CREATE TABLE IF NOT EXISTS tests_ext (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    type TEXT,
    duration INTEGER,
    passing_score INTEGER,
    status TEXT,
    created_by TEXT,
    questions_json TEXT,
    settings_json TEXT,
    created_at INTEGER,
    published_at INTEGER
  )`);
  try { await d1Run(db, 'ALTER TABLE tests_ext ADD COLUMN settings_json TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE tests_ext ADD COLUMN published_at INTEGER'); } catch {}

  await d1Run(db, `CREATE TABLE IF NOT EXISTS test_attempts_ext (
    id TEXT PRIMARY KEY,
    test_id TEXT,
    user_id TEXT,
    status TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    answers_json TEXT,
    score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    is_passed INTEGER DEFAULT 0,
    feedback_json TEXT,
    flags_json TEXT,
    created_at INTEGER
  )`);
  try { await d1Run(db, 'ALTER TABLE test_attempts_ext ADD COLUMN answers_json TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE test_attempts_ext ADD COLUMN feedback_json TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE test_attempts_ext ADD COLUMN flags_json TEXT'); } catch {}

  await d1Run(db, `CREATE TABLE IF NOT EXISTS test_results_ext (
    id TEXT PRIMARY KEY,
    attempt_id TEXT,
    test_id TEXT,
    candidate_id TEXT,
    score REAL,
    max_score REAL,
    passed INTEGER,
    result_json TEXT,
    ai_analysis_json TEXT,
    created_at INTEGER
  )`);
  try { await d1Run(db, 'ALTER TABLE test_results_ext ADD COLUMN ai_analysis_json TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE test_results_ext ADD COLUMN max_score REAL'); } catch {}

  await d1Run(db, `CREATE TABLE IF NOT EXISTS assessment_invitations (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    email TEXT,
    invitation_token TEXT UNIQUE,
    assessment_password_hash TEXT,
    expires_at INTEGER NOT NULL,
    sent_at INTEGER,
    opened_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    status TEXT DEFAULT 'sent',
    resume_snapshot_json TEXT,
    created_at INTEGER NOT NULL
  )`);
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN invitation_token TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN token TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN email TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN assessment_password_hash TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN resume_snapshot_json TEXT'); } catch {}
  try { await d1Run(db, 'ALTER TABLE assessment_invitations ADD COLUMN status TEXT DEFAULT "sent"'); } catch {}
}

async function sendAssessmentInviteEmail(c: any, payload: { to: string; candidateName: string; assessmentLink: string; password: string }) {
  const resendApiKey = c.env.RESEND_API_KEY;
  const from = c.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !from) {
    console.log('[EMAIL-MOCK] Assessment invite', payload);
    return { sent: false, provider: 'mock' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px;">
      <h2>Assessment Invitation</h2>
      <p>Hi ${payload.candidateName || 'Candidate'},</p>
      <p>You have been invited to take a personalized assessment.</p>
      <p><strong>Login URL:</strong> <a href="${payload.assessmentLink}">${payload.assessmentLink}</a></p>
      <p><strong>Password:</strong> ${payload.password}</p>
      <p>This invitation expires in 7 days.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: 'Your Rezulyzer Assessment Invitation',
      html
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send email (${res.status}): ${body || res.statusText}`);
  }
  return { sent: true, provider: 'resend' };
}

function mapAttemptRow(row: any) {
  const answers = safeJSON<any[]>(row?.answers_json, []);
  const feedback = safeJSON<any>(row?.feedback_json, {});
  return {
    _id: row?.id,
    id: row?.id,
    status: row?.status,
    startedAt: toIsoFromSec(row?.started_at),
    completedAt: toIsoFromSec(row?.completed_at),
    score: Number(row?.score || 0),
    totalScore: Number(row?.total_score || 0),
    percentage: Number(row?.percentage || 0),
    isPassed: !!row?.is_passed,
    answers,
    feedback,
    timeSpent: Number(row?.time_spent || 0)
  };
}

async function finalizeAttempt(c: any, testRow: any, attemptRow: any, candidateRow: any) {
  const structure = safeJSON<any>(safeJSON<any>(testRow?.settings_json, {})?.assessmentStructure, null);
  const normalizedStructure = structure || normalizeAssessmentStructure({
    mcq: (safeJSON<any[]>(testRow?.questions_json, []) || []).filter((q: any) => q?.type === 'mcq').map((q: any) => ({
      id: q.id || q._id,
      question: q.question,
      options: (q.options || []).map((o: any, idx: number) => `${String.fromCharCode(65 + idx)}) ${o.text || o}`),
      correct: q.correct || 'A',
      explanation: q.explanation || ''
    })),
    output: (safeJSON<any[]>(testRow?.questions_json, []) || []).filter((q: any) => q?.type === 'output').map((q: any) => ({
      id: q.id || q._id,
      question: q.question,
      code: q.code || '',
      answer: q.answer || '',
      explanation: q.explanation || ''
    })),
    practical: (safeJSON<any[]>(testRow?.questions_json, []) || []).filter((q: any) => q?.type === 'practical').map((q: any) => ({
      id: q.id || q._id,
      question: q.question,
      expectedConcepts: q.expectedConcepts || [],
      sampleAnswer: q.sampleAnswer || ''
    }))
  });

  const answers = safeJSON<any[]>(attemptRow?.answers_json, []);
  const answersById: Record<string, any> = {};
  for (const a of answers) {
    answersById[String(a?.questionId || a?.id || '')] = a?.answer;
  }

  const resumeData = safeJSON<any>(candidateRow?.profile_json, {});
  const evaluation = await evaluateAssessmentWithClaude(c, normalizedStructure, answersById, resumeData);

  const mcqById: Record<string, any> = {};
  for (const m of evaluation.mcqResults || []) mcqById[m.id] = m;
  const outById: Record<string, any> = {};
  for (const o of evaluation.outputResults || []) outById[o.id] = o;

  const normalizedAnswers = answers.map((a: any) => {
    const qId = String(a?.questionId || '');
    const mcqMatch = mcqById[qId];
    const outMatch = outById[qId];
    return {
      ...a,
      isCorrect: typeof mcqMatch?.isCorrect === 'boolean' ? mcqMatch.isCorrect : (typeof outMatch?.isCorrect === 'boolean' ? outMatch.isCorrect : null)
    };
  });

  const now = nowSec();
  const totalQuestions = (normalizedStructure.mcq || []).length + (normalizedStructure.output || []).length + 1;
  const score = Number((evaluation.totalScore * totalQuestions).toFixed(2));
  const percentage = Number((evaluation.totalScore * 100).toFixed(2));
  const timeSpent = Math.max(0, now - Number(attemptRow.started_at || now));

  await d1Run(
    c.env.DB,
    'UPDATE test_attempts_ext SET status = ?, completed_at = ?, answers_json = ?, score = ?, total_score = ?, percentage = ?, is_passed = ?, time_spent = ?, feedback_json = ? WHERE id = ?',
    [
      'completed',
      now,
      JSON.stringify(normalizedAnswers),
      score,
      totalQuestions,
      percentage,
      evaluation.passed ? 1 : 0,
      timeSpent,
      JSON.stringify(evaluation),
      attemptRow.id
    ]
  );

  const resultId = crypto.randomUUID();
  await d1Run(
    c.env.DB,
    'INSERT INTO test_results_ext (id, attempt_id, test_id, candidate_id, score, max_score, passed, result_json, ai_analysis_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      resultId,
      attemptRow.id,
      testRow.id,
      attemptRow.user_id,
      score,
      totalQuestions,
      evaluation.passed ? 1 : 0,
      JSON.stringify({ answers: normalizedAnswers }),
      JSON.stringify(evaluation),
      now
    ]
  );

  const latestRows = await d1All<any>(c.env.DB, 'SELECT * FROM test_attempts_ext WHERE id = ? LIMIT 1', [attemptRow.id]);
  return {
    attempt: mapAttemptRow(latestRows[0] || attemptRow),
    evaluation
  };
}

const parseResumeAndCreateCandidate = async (c: any) => {
  await ensureTables(c.env.DB);
  await ensureAssessmentTables(c.env.DB);

  const user = c.get('user');
  if (!user) return c.json({ success: false, message: 'Unauthorized' }, 401);

  const form = await c.req.formData();
  const file = (form.get('resume') || form.get('file')) as File | null;
  if (!file) return c.json({ success: false, message: 'No resume file uploaded' }, 400);

  const companyId = user.company_id || String(form.get('companyId') || '');
  if (!companyId) {
    return c.json({ success: false, message: 'Company context is required' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const parsed = await parseResumeWithClaude(c, file, buffer);
  if (!parsed?.email) {
    return c.json({
      success: false,
      message: 'Could not extract email from resume. Please ensure resume contains a valid email.'
    }, 400);
  }

  const duplicate = await d1All<any>(
    c.env.DB,
    'SELECT id FROM candidates WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [parsed.email]
  );
  if (duplicate.length) {
    return c.json({ success: false, message: 'A candidate with this email already exists', data: { candidateId: duplicate[0].id } }, 409);
  }

  const candidateId = crypto.randomUUID();
  const key = `resumes/${candidateId}-${crypto.randomUUID()}-${file.name}`;
  await c.env.R2.put(key, buffer, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });

  const now = nowSec();
  const candidateName = String(parsed.name || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim();
  const profile = {
    ...parsed,
    parsedAt: new Date().toISOString(),
    source: 'anthropic_claude'
  };

  await d1Run(
    c.env.DB,
    'INSERT INTO candidates (id, company_id, name, email, phone, status, resume_info_json, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      candidateId,
      companyId,
      candidateName,
      parsed.email,
      parsed.phone || null,
      'active',
      JSON.stringify({
        r2Key: key,
        fileName: file.name,
        contentType: file.type || '',
        uploadedAt: new Date().toISOString()
      }),
      JSON.stringify(profile),
      now,
      now
    ]
  );

  const nameParts = parseNameParts(candidateName);
  return c.json({
    success: true,
    message: 'Candidate created successfully from resume parsing',
    data: {
      _id: candidateId,
      id: candidateId,
      candidate: {
        _id: candidateId,
        id: candidateId,
        name: candidateName,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: parsed.email,
        phone: parsed.phone || ''
      },
      isNewCandidate: true,
      parsedData: parsed,
      fileInfo: {
        fileName: file.name,
        resumeKey: key
      }
    }
  }, 201);
};

app.post('/api/candidates/parse-resume', parseResumeAndCreateCandidate);
app.post('/api/candidates/upload-resume', parseResumeAndCreateCandidate);

app.post('/api/candidates/:id/send-assessment', async (c) => {
  await ensureTables(c.env.DB);
  await ensureAssessmentTables(c.env.DB);

  const id = c.req.param('id');
  const user = c.get('user');

  let whereClause = 'WHERE id = ?';
  const binds: any[] = [id];
  if (user?.role !== 'superadmin' && user?.company_id) {
    whereClause += ' AND (company_id = ? OR company_id IS NULL)';
    binds.push(user.company_id);
  }

  const rows = await d1All<any>(c.env.DB, `SELECT * FROM candidates ${whereClause} LIMIT 1`, binds);
  if (!rows.length) return c.json({ success: false, message: 'Candidate not found' }, 404);
  const candidate = rows[0];
  if (!candidate.email) return c.json({ success: false, message: 'Candidate email not found' }, 400);

  let profile = safeJSON<any>(candidate.profile_json, {});
  const resumeInfo = safeJSON<any>(candidate.resume_info_json, {});
  if (!profile?.email || !profile?.skills) {
    try {
      const key = resumeInfo?.r2Key;
      if (key) {
        const obj = await c.env.R2.get(key);
        if (obj) {
          const contentType = obj.httpMetadata?.contentType || 'application/octet-stream';
          const buf = await obj.arrayBuffer();
          const f = new File([buf], resumeInfo.fileName || 'resume.pdf', { type: contentType });
          profile = await parseResumeWithClaude(c, f, buf);
        }
      }
    } catch (e) {
      console.warn('Failed to re-parse resume from R2:', e);
    }
  }

  const structure = await generateAssessmentFromResume(c, profile);
  const flattenedQuestions = flattenAssessmentQuestions(structure);
  const testId = crypto.randomUUID();
  const now = nowSec();

  await d1Run(
    c.env.DB,
    'INSERT INTO tests_ext (id, title, description, type, duration, passing_score, status, created_by, questions_json, settings_json, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      testId,
      `Assessment for ${candidate.name || 'Candidate'}`,
      'AI-generated assessment based on resume profile',
      'resume_ai',
      45,
      80,
      'published',
      user?.sub || user?.id || null,
      JSON.stringify(flattenedQuestions),
      JSON.stringify({ assessmentStructure: structure, resumeSnapshot: profile }),
      now,
      now
    ]
  );

  const invitationId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const tempPassword = `RZ${Math.random().toString(36).slice(-6).toUpperCase()}!`;
  const passwordHash = await bcrypt.hash(tempPassword, 8);
  const expiry = now + (7 * 24 * 60 * 60);

  await d1Run(
    c.env.DB,
    'INSERT INTO assessment_invitations (id, assessment_id, candidate_id, email, invitation_token, token, assessment_password_hash, expires_at, sent_at, status, resume_snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      invitationId,
      testId,
      candidate.id,
      candidate.email,
      token,
      token,
      passwordHash,
      expiry,
      now,
      'sent',
      JSON.stringify(profile || {}),
      now
    ]
  );

  const baseUrl = (c.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const assessmentLink = `${baseUrl}/assessment/login/${token}?token=${token}&testId=${testId}`;

  let emailStatus: any = { sent: false, provider: 'mock' };
  try {
    emailStatus = await sendAssessmentInviteEmail(c, {
      to: candidate.email,
      candidateName: candidate.name || 'Candidate',
      assessmentLink,
      password: tempPassword
    });
  } catch (emailErr) {
    console.warn('Assessment email send failed:', (emailErr as Error)?.message || emailErr);
  }

  return c.json({
    success: true,
    message: emailStatus.sent ? 'Assessment invitation sent successfully' : 'Assessment created; email dispatch not configured, link generated',
    data: {
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      testId,
      invitationToken: token,
      assessmentLink
    }
  });
});

app.get('/api/candidates/assessment/validate/:token', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const token = c.req.param('token');
  if (!token) return c.json({ success: false, message: 'Token is required' }, 400);

  const rows = await d1All<any>(
    c.env.DB,
    `SELECT ai.*, c.name as candidate_name, c.email as candidate_email
     FROM assessment_invitations ai
     LEFT JOIN candidates c ON c.id = ai.candidate_id
     WHERE ai.invitation_token = ? OR ai.token = ?
     LIMIT 1`,
    [token, token]
  );
  if (!rows.length) return c.json({ success: false, message: 'Invalid assessment token' }, 404);

  const inv = rows[0];
  const now = nowSec();
  if (Number(inv.expires_at || 0) < now) {
    return c.json({ success: false, message: 'Assessment token has expired' }, 401);
  }

  return c.json({
    success: true,
    data: {
      id: inv.candidate_id,
      name: inv.candidate_name || 'Candidate',
      email: inv.candidate_email || inv.email || '',
      tokenExpiry: toIsoFromSec(inv.expires_at),
      pendingTests: [
        {
          testId: inv.assessment_id,
          status: inv.status || 'sent'
        }
      ]
    }
  });
});

app.post('/api/candidates/assessment/login', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const body = await c.req.json<any>().catch(() => ({}));
  const token = String(body?.token || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!token || !email || !password) {
    return c.json({ success: false, message: 'token, email and password are required' }, 400);
  }

  const rows = await d1All<any>(
    c.env.DB,
    `SELECT ai.*, c.name as candidate_name, c.email as candidate_email
     FROM assessment_invitations ai
     LEFT JOIN candidates c ON c.id = ai.candidate_id
     WHERE ai.invitation_token = ? OR ai.token = ?
     LIMIT 1`,
    [token, token]
  );
  if (!rows.length) return c.json({ success: false, message: 'Invalid assessment token' }, 401);

  const inv = rows[0];
  const now = nowSec();
  if (Number(inv.expires_at || 0) < now) {
    return c.json({ success: false, message: 'Assessment token has expired' }, 401);
  }

  const candidateEmail = String(inv.candidate_email || inv.email || '').toLowerCase();
  if (!candidateEmail || candidateEmail !== email) {
    return c.json({ success: false, message: 'Email does not match this invitation' }, 401);
  }

  const ok = inv.assessment_password_hash ? await bcrypt.compare(password, String(inv.assessment_password_hash)) : false;
  if (!ok) return c.json({ success: false, message: 'Invalid password' }, 401);

  const sessionToken = await signAccessToken(
    c,
    {
      sub: inv.candidate_id,
      role: 'candidate',
      candidate_id: inv.candidate_id,
      assessment_id: inv.assessment_id,
      invitation_id: inv.id,
      email: candidateEmail
    },
    4 * 60 * 60
  );

  await d1Run(
    c.env.DB,
    'UPDATE assessment_invitations SET status = ?, opened_at = coalesce(opened_at, ?) WHERE id = ?',
    ['opened', now, inv.id]
  );

  return c.json({
    success: true,
    data: {
      sessionToken,
      candidateId: inv.candidate_id,
      name: inv.candidate_name || 'Candidate',
      email: candidateEmail,
      pendingTests: [{ testId: inv.assessment_id, status: 'pending' }]
    }
  });
});

app.get('/api/tests/:id', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const id = c.req.param('id');
  const rows = await d1All<any>(c.env.DB, 'SELECT * FROM tests_ext WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) return c.json({ success: false, message: 'Test not found' }, 404);

  const row = rows[0];
  const questions = safeJSON<any[]>(row.questions_json, []);
  const user = c.get('user');
  const isCandidate = String(user?.role || '').toLowerCase() === 'candidate';
  const sanitizedQuestions = questions.map((q: any) => {
    if (!isCandidate) return q;
    const copy = { ...q };
    delete copy.correct;
    delete copy.answer;
    delete copy.explanation;
    delete copy.sampleAnswer;
    return copy;
  });

  return c.json({
    success: true,
    data: {
      test: {
        ...row,
        _id: row.id,
        id: row.id,
        duration: Number(row.duration || 45),
        questions: sanitizedQuestions,
        questionsPopulated: sanitizedQuestions
      }
    }
  });
});

app.post('/api/tests/:id/start', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const testId = c.req.param('id');
  const user = c.get('user');
  const candidateId = user?.candidate_id || user?.sub;
  if (!candidateId) return c.json({ success: false, message: 'Unauthorized candidate session' }, 401);

  if (user?.assessment_id && String(user.assessment_id) !== String(testId)) {
    return c.json({ success: false, message: 'This assessment does not belong to your invitation' }, 403);
  }

  const testRows = await d1All<any>(c.env.DB, 'SELECT id, duration, status FROM tests_ext WHERE id = ? LIMIT 1', [testId]);
  if (!testRows.length) return c.json({ success: false, message: 'Test not found' }, 404);

  const existing = await d1All<any>(
    c.env.DB,
    'SELECT * FROM test_attempts_ext WHERE test_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
    [testId, candidateId]
  );

  if (existing.length && existing[0].status !== 'completed') {
    return c.json({ success: true, data: { attempt: mapAttemptRow(existing[0]) } });
  }

  const attemptId = crypto.randomUUID();
  const now = nowSec();
  await d1Run(
    c.env.DB,
    'INSERT INTO test_attempts_ext (id, test_id, user_id, status, started_at, answers_json, flags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [attemptId, testId, candidateId, 'in_progress', now, JSON.stringify([]), JSON.stringify({ events: [] }), now]
  );

  const rows = await d1All<any>(c.env.DB, 'SELECT * FROM test_attempts_ext WHERE id = ? LIMIT 1', [attemptId]);
  return c.json({ success: true, data: { attempt: mapAttemptRow(rows[0]) } }, 201);
});

app.post('/api/tests/:id/answer', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const body = await c.req.json<any>().catch(() => ({}));
  const attemptId = String(body?.attemptId || '');
  const questionId = String(body?.questionId || '');
  const answer = body?.answer;
  if (!attemptId || !questionId) return c.json({ success: false, message: 'attemptId and questionId are required' }, 400);

  const user = c.get('user');
  const candidateId = user?.candidate_id || user?.sub;
  const rows = await d1All<any>(c.env.DB, 'SELECT * FROM test_attempts_ext WHERE id = ? LIMIT 1', [attemptId]);
  if (!rows.length) return c.json({ success: false, message: 'Attempt not found' }, 404);
  const attempt = rows[0];
  if (String(attempt.user_id || '') !== String(candidateId || '')) return c.json({ success: false, message: 'Access denied' }, 403);
  if (attempt.status !== 'in_progress') return c.json({ success: false, message: 'Attempt is not active' }, 400);

  const answers = safeJSON<any[]>(attempt.answers_json, []);
  const idx = answers.findIndex((a: any) => String(a.questionId) === questionId);
  const payload = { questionId, answer, answeredAt: new Date().toISOString() };
  if (idx >= 0) answers[idx] = { ...answers[idx], ...payload };
  else answers.push(payload);

  await d1Run(c.env.DB, 'UPDATE test_attempts_ext SET answers_json = ? WHERE id = ?', [JSON.stringify(answers), attemptId]);
  return c.json({ success: true, message: 'Answer saved' });
});

app.post('/api/tests/:id/submit', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const attemptId = String(body?.attemptId || '');
  if (!attemptId) return c.json({ success: false, message: 'attemptId is required' }, 400);

  const user = c.get('user');
  const candidateId = user?.candidate_id || user?.sub;
  const attemptRows = await d1All<any>(c.env.DB, 'SELECT * FROM test_attempts_ext WHERE id = ? LIMIT 1', [attemptId]);
  if (!attemptRows.length) return c.json({ success: false, message: 'Attempt not found' }, 404);
  const attempt = attemptRows[0];
  if (String(attempt.user_id || '') !== String(candidateId || '')) return c.json({ success: false, message: 'Access denied' }, 403);
  if (String(attempt.test_id || '') !== String(id)) return c.json({ success: false, message: 'Attempt does not belong to this test' }, 400);

  const testRows = await d1All<any>(c.env.DB, 'SELECT * FROM tests_ext WHERE id = ? LIMIT 1', [id]);
  if (!testRows.length) return c.json({ success: false, message: 'Test not found' }, 404);
  const candidateRows = await d1All<any>(c.env.DB, 'SELECT * FROM candidates WHERE id = ? LIMIT 1', [candidateId]);

  const result = await finalizeAttempt(c, testRows[0], attempt, candidateRows[0] || {});
  return c.json({
    success: true,
    data: {
      attempt: result.attempt,
      aiAnalysis: result.evaluation
    }
  });
});

app.get('/api/tests/:id/results', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const testId = c.req.param('id');
  const attemptId = c.req.query('attemptId');

  const user = c.get('user');
  const candidateId = user?.candidate_id || user?.sub;
  if (!candidateId) return c.json({ success: false, message: 'Unauthorized' }, 401);

  const testRows = await d1All<any>(c.env.DB, 'SELECT * FROM tests_ext WHERE id = ? LIMIT 1', [testId]);
  if (!testRows.length) return c.json({ success: false, message: 'Test not found' }, 404);

  let attemptRows: any[] = [];
  if (attemptId) {
    attemptRows = await d1All<any>(
      c.env.DB,
      'SELECT * FROM test_attempts_ext WHERE id = ? AND test_id = ? AND user_id = ? LIMIT 1',
      [attemptId, testId, candidateId]
    );
  } else {
    attemptRows = await d1All<any>(
      c.env.DB,
      'SELECT * FROM test_attempts_ext WHERE test_id = ? AND user_id = ? AND status = ? ORDER BY completed_at DESC LIMIT 1',
      [testId, candidateId, 'completed']
    );
  }

  if (!attemptRows.length) return c.json({ success: false, message: 'No completed attempt found' }, 404);
  const attempt = mapAttemptRow(attemptRows[0]);
  const feedback = safeJSON<any>(attemptRows[0]?.feedback_json, {});
  const questions = safeJSON<any[]>(testRows[0]?.questions_json, []).map((q: any) => {
    const copy = { ...q };
    delete copy.correct;
    delete copy.answer;
    delete copy.explanation;
    delete copy.sampleAnswer;
    return copy;
  });

  const correctAnswers = Array.isArray(attempt.answers) ? attempt.answers.filter((a: any) => a?.isCorrect === true).length : 0;
  const analysis = {
    totalQuestions: questions.length,
    correctAnswers,
    timeSpent: attempt.timeSpent,
    aiAnalysis: feedback
  };

  return c.json({
    success: true,
    data: {
      test: {
        ...testRows[0],
        _id: testRows[0].id,
        id: testRows[0].id,
        questions
      },
      attempt,
      analysis
    }
  });
});

app.post('/api/tests/:id/flag', async (c) => {
  await ensureAssessmentTables(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const attemptId = String(body?.attemptId || '');
  const type = String(body?.type || 'unknown');
  const occurredAt = body?.occurredAt || new Date().toISOString();
  if (!attemptId) return c.json({ success: false, message: 'attemptId is required' }, 400);

  const user = c.get('user');
  const candidateId = user?.candidate_id || user?.sub;
  const rows = await d1All<any>(c.env.DB, 'SELECT * FROM test_attempts_ext WHERE id = ? LIMIT 1', [attemptId]);
  if (!rows.length) return c.json({ success: false, message: 'Attempt not found' }, 404);
  const attempt = rows[0];
  if (String(attempt.user_id || '') !== String(candidateId || '')) return c.json({ success: false, message: 'Access denied' }, 403);
  if (String(attempt.test_id || '') !== String(id)) return c.json({ success: false, message: 'Attempt does not belong to this test' }, 400);

  const flags = safeJSON<any>(attempt.flags_json, { tabSwitches: 0, fullscreenExits: 0, copyPasteAttempts: 0, events: [] });
  if (type === 'tab_switch') flags.tabSwitches = Number(flags.tabSwitches || 0) + 1;
  if (type === 'fullscreen_exit') flags.fullscreenExits = Number(flags.fullscreenExits || 0) + 1;
  if (type === 'copy_paste') flags.copyPasteAttempts = Number(flags.copyPasteAttempts || 0) + 1;
  flags.events = Array.isArray(flags.events) ? flags.events : [];
  flags.events.push({ type, occurredAt });

  await d1Run(c.env.DB, 'UPDATE test_attempts_ext SET flags_json = ? WHERE id = ?', [JSON.stringify(flags), attemptId]);

  const totalWarnings = Number(flags.tabSwitches || 0) + Number(flags.fullscreenExits || 0) + Number(flags.copyPasteAttempts || 0);
  return c.json({
    success: true,
    data: {
      attempt: { id: attemptId, flags, totalWarnings },
      auto_submitted: false
    }
  });
});

// Publish assessment (test)
app.post('/api/tests/:id/publish', async (c) => {
  const id = c.req.param('id');
  // Update both legacy table (assessments) and new tests_ext for consistency
  await c.env.DB.prepare('UPDATE assessments SET status = ? WHERE id = ?').bind('published', id).run().catch(() => {});
  await c.env.DB.prepare('UPDATE tests_ext SET status = ?, published_at = ? WHERE id = ?')
    .bind('published', Math.floor(Date.now() / 1000), id)
    .run();
  return c.json({ success: true, message: 'Test published successfully' });
});

// Job Descriptions: list
app.get('/api/jd', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM job_descriptions ORDER BY created_at DESC').all();
  return c.json({ success: true, data: { items: results } });
});

// Job Descriptions: create
app.post('/api/jd', async (c) => {
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO job_descriptions (id, title, description, skills, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, body.title, body.description, JSON.stringify(body.skills || []), Math.floor(Date.now() / 1000))
    .run();
  return c.json({ success: true, message: 'JD created', data: { id } }, 201);
});

// Job Descriptions: update
app.put('/api/jd/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  await d1Run(
    c.env.DB,
    'UPDATE job_descriptions SET title = coalesce(?, title), description = coalesce(?, description), skills = coalesce(?, skills) WHERE id = ?',
    [body.title ?? null, body.description ?? null, body.skills ? JSON.stringify(body.skills) : null, id]
  );
  return c.json({ success: true, message: 'JD updated' });
});

// Job Descriptions: delete
app.delete('/api/jd/:id', async (c) => {
  const id = c.req.param('id');
  await d1Run(c.env.DB, 'DELETE FROM job_descriptions WHERE id = ?', [id]);
  return c.json({ success: true, message: 'JD deleted' });
});

// Companies CRUD
app.get('/api/companies', async (c) => {
  const companies = await d1All<any>(c.env.DB, 'SELECT * FROM companies ORDER BY created_at DESC');
  return c.json({ success: true, data: companies });
});

app.post('/api/companies', async (c) => {
  const body = await c.req.json<any>();
  const user = c.get('user');
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  // Generate a temporary password for the company admin
  const temporaryPassword = 'temp' + Math.random().toString(36).substring(2, 8);
  
  // Create company record
  await d1Run(c.env.DB, 
    'INSERT INTO companies (id, name, description, industry, size, location, website, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, body.companyName || body.name || 'Untitled Company', body.description || '', body.industry || '', body.size || '', body.location || (body.address ? `${body.address.city}, ${body.address.country}` : ''), body.website || '', user?.sub || null, now]
  );
  
  // Create company admin user if contact person email is provided
  if (body.contactPerson?.email) {
    const adminId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(temporaryPassword, 8);
    
    await d1Run(c.env.DB, 
      'INSERT INTO users (id, email, password_hash, role, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, body.contactPerson.email.toLowerCase(), passwordHash, 'company_admin', id, now]
    );
  }
  
  return c.json({ 
    success: true, 
    message: 'Company created', 
    data: { 
      id, 
      name: body.companyName || body.name,
      temporaryPassword,
      adminEmail: body.contactPerson?.email
    } 
  }, 201);
});

app.get('/api/companies/:id', async (c) => {
  const id = c.req.param('id');
  const companies = await d1All<any>(c.env.DB, 'SELECT * FROM companies WHERE id = ? LIMIT 1', [id]);
  if (companies.length === 0) return c.json({ success: false, message: 'Company not found' }, 404);
  return c.json({ success: true, data: companies[0] });
});

app.put('/api/companies/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const now = Math.floor(Date.now() / 1000);
  
  await d1Run(c.env.DB, 
    'UPDATE companies SET name = coalesce(?, name), description = coalesce(?, description), industry = coalesce(?, industry), size = coalesce(?, size), location = coalesce(?, location), website = coalesce(?, website), updated_at = ? WHERE id = ?',
    [body.name ?? null, body.description ?? null, body.industry ?? null, body.size ?? null, body.location ?? null, body.website ?? null, now, id]
  );
  
  return c.json({ success: true, message: 'Company updated' });
});

app.delete('/api/companies/:id', async (c) => {
  const id = c.req.param('id');
  await d1Run(c.env.DB, 'DELETE FROM companies WHERE id = ?', [id]);
  return c.json({ success: true, message: 'Company deleted' });
});

// --- Company Profile (editable JSON attached to company_id) ---
app.get('/api/company/profile', async (c) => {
  const user = c.get('user');
  if (!user?.company_id) return c.json({ success: false, message: 'No company bound to user' }, 400);
  await ensureTables(c.env.DB);
  const rows = await d1All<any>(c.env.DB, 'SELECT profile_json FROM company_profiles WHERE company_id = ? LIMIT 1', [user.company_id]);
  let profile: any = {};
  try { profile = rows[0]?.profile_json ? JSON.parse(rows[0].profile_json) : {}; } catch {}
  return c.json({ success: true, data: { profile } });
});

app.put('/api/company/profile', async (c) => {
  const user = c.get('user');
  if (!user?.company_id) return c.json({ success: false, message: 'No company bound to user' }, 400);
  await ensureTables(c.env.DB);
  const body = await c.req.json<any>().catch(() => ({}));
  const profile = body?.profile || {};
  const now = Math.floor(Date.now() / 1000);
  // Upsert
  await d1Run(c.env.DB, 'INSERT OR REPLACE INTO company_profiles (company_id, profile_json, updated_at) VALUES (?, ?, ?)', [user.company_id, JSON.stringify(profile), now]);
  return c.json({ success: true, message: 'Profile updated', data: { profile } });
});

// Users CRUD (for admin management)
app.get('/api/users', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'super_admin') return c.json({ success: false, message: 'Forbidden' }, 403);
  
  const users = await d1All<any>(c.env.DB, 'SELECT id, email, role, company_id, created_at FROM users ORDER BY created_at DESC');
  return c.json({ success: true, data: users });
});

app.post('/api/users', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'super_admin') return c.json({ success: false, message: 'Forbidden' }, 403);
  
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  if (!body.email || !body.password) {
    return c.json({ success: false, message: 'Email and password are required' }, 400);
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 8);
  
  await d1Run(c.env.DB, 
    'INSERT INTO users (id, email, password_hash, role, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, body.email.toLowerCase(), passwordHash, body.role || 'hr_manager', body.company_id || null, now]
  );
  
  return c.json({ success: true, message: 'User created', data: { id, email: body.email } }, 201);
});

app.put('/api/users/:id', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'super_admin') return c.json({ success: false, message: 'Forbidden' }, 403);
  
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  
  let passwordHash = null;
  if (body.password) {
    passwordHash = await bcrypt.hash(body.password, 8);
  }
  
  await d1Run(c.env.DB, 
    'UPDATE users SET email = coalesce(?, email), password_hash = coalesce(?, password_hash), role = coalesce(?, role), company_id = coalesce(?, company_id) WHERE id = ?',
    [body.email?.toLowerCase() ?? null, passwordHash, body.role ?? null, body.company_id ?? null, id]
  );
  
  return c.json({ success: true, message: 'User updated' });
});

app.delete('/api/users/:id', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'super_admin') return c.json({ success: false, message: 'Forbidden' }, 403);
  
  const id = c.req.param('id');
  if (id === user.sub) return c.json({ success: false, message: 'Cannot delete yourself' }, 400);
  
  await d1Run(c.env.DB, 'DELETE FROM users WHERE id = ?', [id]);
  return c.json({ success: true, message: 'User deleted' });
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (c) => {
  const user = c.get('user');
  
  // Get basic counts
  const [companies, users, tests, candidates] = await Promise.all([
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM companies'),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM users'),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM assessments'),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM candidates')
  ]);
  
  return c.json({ 
    success: true, 
    data: {
      companies: companies[0]?.count || 0,
      users: users[0]?.count || 0,
      tests: tests[0]?.count || 0,
      candidates: candidates[0]?.count || 0
    }
  });
});

// R2 file upload (form-data: file)
app.post('/api/files/upload', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ success: false, message: 'File required' }, 400);
  const key = `uploads/${crypto.randomUUID()}-${file.name}`;
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return c.json({ success: true, key });
});

// --- Setup helpers: ensure required tables exist (idempotent) ---
async function ensureTables(db: D1Database) {
  // interviews
  await d1Run(db, `CREATE TABLE IF NOT EXISTS video_interviews (
    id TEXT PRIMARY KEY,
    title TEXT,
    job_title TEXT,
    description TEXT,
    scheduled_at INTEGER,
    type TEXT,
    location TEXT,
    created_at INTEGER
  )`);
  // interview invitations
  await d1Run(db, `CREATE TABLE IF NOT EXISTS video_interview_invitations (
    id TEXT PRIMARY KEY,
    interview_id TEXT,
    candidate_id TEXT,
    email TEXT,
    status TEXT,
    scheduled_at INTEGER,
    created_at INTEGER
  )`);
  // company profiles
  await d1Run(db, `CREATE TABLE IF NOT EXISTS company_profiles (
    company_id TEXT PRIMARY KEY,
    profile_json TEXT,
    updated_at INTEGER
  )`);
  // JD templates
  await d1Run(db, `CREATE TABLE IF NOT EXISTS jd_templates (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    domain TEXT,
    title TEXT,
    department TEXT,
    role TEXT,
    salary TEXT,
    location TEXT,
    experience_level TEXT,
    skills TEXT,
    summary TEXT,
    responsibilities_json TEXT,
    qualifications_json TEXT,
    notes TEXT,
    created_at INTEGER
  )`);
  // Best-effort add missing notes column
  try { await d1Run(db, `ALTER TABLE jd_templates ADD COLUMN notes TEXT`); } catch {}

  // candidates_ext (lightweight candidate store)
  await d1Run(db, `CREATE TABLE IF NOT EXISTS candidates_ext (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    profile_json TEXT,
    resume_info_json TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  // Base candidates table (authoritative storage)
  await d1Run(db, `CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    status TEXT,
    created_at INTEGER
  )`);
  // Best-effort add JSON columns to base table for richer profile/resume data
  try { await d1Run(db, `ALTER TABLE candidates ADD COLUMN profile_json TEXT`); } catch {}
  try { await d1Run(db, `ALTER TABLE candidates ADD COLUMN resume_info_json TEXT`); } catch {}
  try { await d1Run(db, `ALTER TABLE candidates ADD COLUMN updated_at INTEGER`); } catch {}
}

// R2 file download (simple streaming)
app.get('/api/files/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.R2.get(key);
  if (!obj) return c.json({ success: false, message: 'Not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// Invitations: schedule (store in D1)
app.post('/api/tests/:id/invite', async (c) => {
  const id = c.req.param('id');
  const { emails = [], scheduleAt, message } = await c.req.json<any>();
  if (!Array.isArray(emails) || emails.length === 0) return c.json({ success: false, message: 'No emails provided' }, 400);

  const nowSec = Math.floor(Date.now() / 1000);
  const schedSec = scheduleAt ? Math.floor(new Date(scheduleAt).getTime() / 1000) : nowSec;

  for (const email of emails) {
    const invId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO test_invitations (id, assessment_id, email, status, scheduled_at, created_at) VALUES (?, ?, ?, ?, ?, ?)' 
    ).bind(invId, id, email, (schedSec > nowSec ? 'scheduled' : 'pending'), schedSec, nowSec).run();
  }

  if (schedSec > nowSec) {
    return c.json({ success: true, message: 'Invitations scheduled', data: { count: emails.length, scheduleAt } });
  }

  // Option 2 (free): mark as pending; Cron will process asap
  return c.json({ success: true, message: 'Invitations queued for cron', data: { count: emails.length } });
});

// List invitations for a test (from base table)
app.get('/api/tests/:id/invitations', async (c) => {
  const id = c.req.param('id');
  const items = await d1All<any>(c.env.DB,
    'SELECT * FROM test_invitations WHERE assessment_id = ? ORDER BY created_at DESC',
    [id]
  );
  return c.json({ success: true, data: { items } });
});

// Scheduler endpoint (Cron Trigger can call it if you prefer HTTP instead of scheduled event)
app.post('/api/scheduler/cron', async (c) => {
  const token = c.req.header('X-CF-Cron-Token');
  if (!token || token !== c.env.CF_CRON_TOKEN) return c.json({ success: false, message: 'Forbidden' }, 403);
  const nowSec = Math.floor(Date.now() / 1000);
  // Process due scheduled invites
  const scheduled = await c.env.DB.prepare(
    'SELECT * FROM test_invitations WHERE status = ? AND scheduled_at <= ? AND (attempts IS NULL OR attempts < 5) AND (next_attempt_at IS NULL OR next_attempt_at <= ?) LIMIT 100'
  ).bind('scheduled', nowSec, nowSec).all();
  // Also process pending invites (immediate ones) due now
  const pending = await c.env.DB.prepare(
    'SELECT * FROM test_invitations WHERE status = ? AND (attempts IS NULL OR attempts < 5) AND (next_attempt_at IS NULL OR next_attempt_at <= ?) LIMIT 100'
  ).bind('pending', nowSec).all();

  let processed = 0;
  const toProcess = [ ...(scheduled.results as any[]), ...(pending.results as any[]) ];
  for (const inv of toProcess) {
    try {
      // TODO: Integrate email provider API call here to actually send the invite
      // Example placeholder:
      // await fetch('https://api.resend.com/emails', { method: 'POST', headers: {...}, body: JSON.stringify({...}) });
      console.log('Sending invite to', inv.email, 'for assessment', inv.assessment_id);
      await c.env.DB.prepare('UPDATE test_invitations SET status = ? WHERE id = ?').bind('sent', inv.id).run();
      processed += 1;
    } catch (e: any) {
      const attempts = (inv.attempts ?? 0) + 1;
      // Exponential backoff: 2^attempts minutes, capped at 60 minutes
      const delayMinutes = Math.min(60, Math.pow(2, Math.max(1, attempts)));
      const nextAttempt = nowSec + delayMinutes * 60;
      await c.env.DB.prepare('UPDATE test_invitations SET attempts = ?, last_error = ?, next_attempt_at = ?, status = ? WHERE id = ?')
        .bind(attempts, String(e?.message || e), nextAttempt, 'pending', inv.id)
        .run();
    }
  }
  return c.json({ success: true, processed, scheduledCount: (scheduled.results as any[]).length, pendingCount: (pending.results as any[]).length });
});

// --- Video Interviews: create interview and invitations ---
app.post('/api/video-interviews', async (c) => {
  await ensureTables(c.env.DB);
  const body = await c.req.json<any>().catch(() => ({}));
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const scheduledAt = Math.floor(new Date(body.scheduledAt || Date.now()).getTime() / 1000);
  await d1Run(c.env.DB,
    'INSERT INTO video_interviews (id, title, job_title, description, scheduled_at, type, location, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, body.title || '', body.jobTitle || '', body.description || '', scheduledAt, body.type || 'video', body.location || 'Online', now]
  );
  return c.json({ success: true, data: { id } }, 201);
});

app.post('/api/video-interview-invitations', async (c) => {
  await ensureTables(c.env.DB);
  const body = await c.req.json<any>().catch(() => ({}));
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const scheduledAt = Math.floor(new Date(body.scheduledAt || Date.now()).getTime() / 1000);
  await d1Run(c.env.DB,
    'INSERT INTO video_interview_invitations (id, interview_id, candidate_id, email, status, scheduled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, body.interviewId, body.candidateId, body.email || '', 'sent', scheduledAt, now]
  );
  return c.json({ success: true, data: { id } }, 201);
});

// --- Analytics dashboard (basic) ---
app.get('/api/analytics/dashboard', async (c) => {
  await ensureTables(c.env.DB);
  // Totals
  const [companies, users, tests, candidates, interviews] = await Promise.all([
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM companies').catch(() => [{ count: 0 }]),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM users').catch(() => [{ count: 0 }]),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM assessments').catch(() => [{ count: 0 }]),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM candidates').catch(() => [{ count: 0 }]),
    d1All<any>(c.env.DB, 'SELECT COUNT(*) as count FROM video_interviews').catch(() => [{ count: 0 }])
  ]);

  // Company growth by month (last 6 months) using created_at if available
  const companyGrowth = await d1All<any>(c.env.DB,
    `SELECT strftime('%Y-%m', datetime(COALESCE(created_at, strftime('%s','now')), 'unixepoch')) AS period, COUNT(*) as count
     FROM companies
     GROUP BY period
     ORDER BY period DESC
     LIMIT 6`
  ).catch(() => [] as any[]);

  // Industry distribution (if column exists)
  const industryDistribution = await d1All<any>(c.env.DB,
    `SELECT COALESCE(industry, 'Unknown') as _id, COUNT(*) as count FROM companies GROUP BY industry ORDER BY count DESC LIMIT 10`
  ).catch(() => [] as any[]);

  // Geographic distribution (if column exists)
  const geographicData = await d1All<any>(c.env.DB,
    `SELECT COALESCE(country, 'Unknown') as _id, COUNT(*) as count FROM companies GROUP BY country ORDER BY count DESC LIMIT 10`
  ).catch(() => [] as any[]);

  // Tests by month (last 6)
  const testsByMonth = await d1All<any>(c.env.DB,
    `SELECT strftime('%Y-%m', datetime(COALESCE(created_at, strftime('%s','now')), 'unixepoch')) AS period, COUNT(*) as count
     FROM tests_ext
     GROUP BY period
     ORDER BY period DESC
     LIMIT 6`
  ).catch(() => [] as any[]);

  // Candidates by month (last 6)
  const candidatesByMonth = await d1All<any>(c.env.DB,
    `SELECT strftime('%Y-%m', datetime(COALESCE(created_at, strftime('%s','now')), 'unixepoch')) AS period, COUNT(*) as count
     FROM candidates_ext
     GROUP BY period
     ORDER BY period DESC
     LIMIT 6`
  ).catch(() => [] as any[]);

  const data = {
    overview: {
      totalCompanies: companies[0]?.count || 0,
      activeCompanies: companies[0]?.count || 0,
      totalCandidates: candidates[0]?.count || 0,
      totalTests: tests[0]?.count || 0,
      totalVideoInterviews: interviews[0]?.count || 0,
      totalRevenue: 0,
      growthRate: 0
    },
    charts: {
      companyGrowth: companyGrowth.reverse(),
      testsByMonth: testsByMonth.reverse(),
      candidatesByMonth: candidatesByMonth.reverse(),
      revenueByMonth: Array.from({ length: 6 }).map((_, i) => ({ period: `M${i+1}`, revenue: 0 })),
      industryDistribution,
      geographicData,
      domainPerformance: []
    },
    recentActivity: []
  };

  return c.json({ success: true, data });
});

// List video interviews
app.get('/api/video-interviews', async (c) => {
  await ensureTables(c.env.DB);
  const rows = await d1All<any>(c.env.DB, `
    SELECT vi.id, vi.title, vi.job_title as jobTitle, vi.description, vi.scheduled_at as scheduledAt,
           vi.type, vi.location, vi.created_at as createdAt,
           (SELECT COUNT(*) FROM video_interview_invitations vii WHERE vii.interview_id = vi.id) as invitations
    FROM video_interviews vi
    ORDER BY vi.scheduled_at DESC
    LIMIT 100
  `);
  return c.json({ success: true, data: rows });
});

// Interview details
app.get('/api/video-interviews/:id', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const interview = await d1All<any>(c.env.DB, `
    SELECT id, title, job_title as jobTitle, description, scheduled_at as scheduledAt, type, location, created_at as createdAt
    FROM video_interviews WHERE id = ? LIMIT 1
  `, [id]);
  if (!interview[0]) return c.json({ success: false, message: 'Not found' }, 404);
  const invitations = await d1All<any>(c.env.DB, `
    SELECT id, interview_id as interviewId, candidate_id as candidateId, email, status, scheduled_at as scheduledAt, created_at as createdAt
    FROM video_interview_invitations WHERE interview_id = ? ORDER BY created_at DESC
  `, [id]);
  return c.json({ success: true, data: { interview: interview[0], invitations } });
});

// --- Candidates (base table: candidates) ---
// List candidates with pagination and search
app.get('/api/candidates', async (c) => {
  await ensureTables(c.env.DB);
  const user = c.get('user');
  const url = new URL(c.req.url);
  
  // Pagination parameters (hardened)
  const pageRaw = url.searchParams.get('page');
  let page = Number.isFinite(Number(pageRaw)) && Number(pageRaw) > 0 ? Math.floor(Number(pageRaw)) : 1;
  const limitRaw = url.searchParams.get('limit');
  let limit = Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0 ? Math.floor(Number(limitRaw)) : 10;
  // Bound limit to prevent huge queries
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;
  
  // Filter parameters
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  // Sort/sanitize
  const allowedSortBy = new Set(['created_at', 'name', 'email', 'status']);
  const sortByParam = (url.searchParams.get('sortBy') || 'created_at').toLowerCase();
  const sortBy = allowedSortBy.has(sortByParam) ? sortByParam : 'created_at';
  const sortOrderParam = (url.searchParams.get('sortOrder') || 'desc').toLowerCase();
  const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';
  
  // Build WHERE clause
  const where: string[] = [];
  const binds: any[] = [];
  
  // Role-based filtering
  if (user?.role !== 'superadmin' && user?.company_id) {
    // Include unassigned candidates (NULL company_id) so old records still show up
    where.push('(company_id = ? OR company_id IS NULL)');
    binds.push(user.company_id);
  }
  
  // Search filter
  if (search) {
    where.push('(LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))');
    binds.push(`%${search}%`, `%${search}%`);
  }
  
  // Status filter
  if (status && status !== 'all') {
    where.push('status = ?');
    binds.push(status);
  }
  
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  
  // Query base 'candidates' table
  let tableName = 'candidates';
  let nameColumn = 'name';
  
  // Get total count
  const countResult = await d1All<any>(c.env.DB, 
    `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`, 
    binds
  );
  let total = countResult[0]?.count || 0;
  
  // Get paginated results
  const sql = `
    SELECT id, company_id, email, phone, status, created_at,
           ${nameColumn}, id as _id
    FROM ${tableName} 
    ${whereClause}
    ORDER BY ${sortBy === 'createdAt' ? 'created_at' : sortBy} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `;
  
  let items = await d1All<any>(c.env.DB, sql, [...binds, limit, offset]);
  
  // If no items found in base candidates, attempt legacy 'candidates_ext' table as a fallback (read-only)
  if ((!items || items.length === 0) && total === 0) {
    try {
      const legacyWhere: string[] = [];
      const legacyBinds: any[] = [];
      if (user?.role !== 'superadmin' && user?.company_id) {
        legacyWhere.push('(company_id = ? OR company_id IS NULL)');
        legacyBinds.push(user.company_id);
      }
      if (search) {
        legacyWhere.push('(LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))');
        legacyBinds.push(`%${search}%`, `%${search}%`);
      }
      const legacyWhereClause = legacyWhere.length ? 'WHERE ' + legacyWhere.join(' AND ') : '';
      const legacyCount = await d1All<any>(c.env.DB, `SELECT COUNT(*) as count FROM candidates_ext ${legacyWhereClause}`, legacyBinds);
      total = legacyCount[0]?.count || 0;
      items = await d1All<any>(c.env.DB, `
        SELECT id, company_id, name, email, phone, status, created_at
        FROM candidates_ext
        ${legacyWhereClause}
        ORDER BY ${sortBy === 'createdAt' ? 'created_at' : sortBy} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `, [...legacyBinds, limit, offset]);
      // Map ext rows into the expected shape
      items = (items || []).map((it: any) => ({ ...it, _id: it.id }));
    } catch (e) {
      // ignore legacy errors
    }
  }

  // Format data for frontend
  const formattedItems = (items || []).map(item => ({
    ...item,
    _id: item.id,
    applicationInfo: {
      appliedDate: item.created_at
    },
    currentPosition: {
      title: 'Not specified',
      company: ''
    },
    assignedTests: []
  }));
  
  return c.json({ 
    success: true, 
    data: formattedItems,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Create candidate (base table)
app.post('/api/candidates', async (c) => {
  await ensureTables(c.env.DB);
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();
  if (!body?.name || !body?.email) return c.json({ success: false, message: 'name and email are required' }, 400);
  // Duplicate email guard (case-insensitive)
  const existing = await d1All<any>(
    c.env.DB,
    'SELECT id, email FROM candidates WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [body.email]
  ).catch(() => []);
  if (existing && existing.length) {
    return c.json({ success: false, message: 'A candidate with this email already exists', data: { candidateId: existing[0].id } }, 409);
  }
  await d1Run(
    c.env.DB,
    'INSERT INTO candidates (id, company_id, name, email, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      body.companyId || null,
      body.name,
      body.email,
      body.phone || null,
      body.status || 'active',
      Math.floor(Date.now() / 1000)
    ]
  );
  return c.json({ success: true, message: 'Candidate created', data: { id } }, 201);
});

// Get single candidate with extended profile
app.get('/api/candidates/:id', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  try {
    let whereClause = 'WHERE id = ?';
    const binds: any[] = [id];
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause += ' AND (company_id = ? OR company_id IS NULL)';
      binds.push(user.company_id);
    }
    const rows = await d1All<any>(c.env.DB, `SELECT * FROM candidates ${whereClause} LIMIT 1`, binds);
    if (rows.length) return c.json({ success: true, data: rows[0] });

    // Legacy fallback for older deployments that still use candidates_ext.
    const legacyRows = await d1All<any>(c.env.DB, `SELECT * FROM candidates_ext ${whereClause} LIMIT 1`, binds).catch(() => []);
    if (legacyRows.length) return c.json({ success: true, data: legacyRows[0] });

    return c.json({ success: false, message: 'Candidate not found' }, 404);
  } catch (e) {
    return c.json({ success: false, message: 'Failed to fetch candidate' }, 500);
  }
});

// Upload candidate avatar to R2 and persist key in candidates.profile_json
app.post('/api/candidates/:id/avatar', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ success: false, message: 'File required' }, 400);
  const key = `avatars/${id}-${crypto.randomUUID()}-${file.name}`;
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  // Update profile_json with avatar key
  await d1Run(c.env.DB,
    'UPDATE candidates SET profile_json = json_set(coalesce(profile_json, "{}"), $.avatarKey, ?) WHERE id = ?',
    [key, id]
  );
  return c.json({ success: true, key });
});

// Upload candidate resume to R2 and persist key in candidates.resume_info_json
app.post('/api/candidates/:id/resume', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ success: false, message: 'File required' }, 400);
  const key = `resumes/${id}-${crypto.randomUUID()}-${file.name}`;
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  await d1Run(c.env.DB,
    'UPDATE candidates SET resume_info_json = json_set(coalesce(resume_info_json, "{}"), $.r2Key, ?, $.fileName, ?, $.contentType, ?) WHERE id = ?',
    [key, file.name, file.type, id]
  );
  return c.json({ success: true, key });
});

// Debug endpoint to check table schema
app.get('/api/debug/candidates-schema', async (c) => {
  try {
    const tables = await d1All<any>(c.env.DB, "SELECT name FROM sqlite_master WHERE type='table'");
    let candidatesSchema = [];
    let candidatesExtSchema = [];
    
    try {
      candidatesSchema = await d1All<any>(c.env.DB, "PRAGMA table_info(candidates)");
    } catch (e) {
      candidatesSchema = [{ error: 'candidates table does not exist' }];
    }
    
    try {
      candidatesExtSchema = await d1All<any>(c.env.DB, "PRAGMA table_info(candidates_ext)");
    } catch (e) {
      candidatesExtSchema = [{ error: 'candidates_ext table does not exist' }];
    }
    
    return c.json({ 
      success: true, 
      data: { 
        allTables: tables,
        candidatesSchema,
        candidatesExtSchema
      } 
    });
  } catch (error) {
    return c.json({ success: false, message: String(error) });
  }
});

// Get candidate statistics
app.get('/api/candidates/stats', async (c) => {
  const user = c.get('user');
  
  try {
    // Get counts based on user role
    let whereClause = '';
    let binds: any[] = [];
    
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause = 'WHERE company_id = ?';
      binds = [user.company_id];
    }
    
    const [total, active, inactive] = await Promise.all([
      d1All<any>(c.env.DB, `SELECT COUNT(1) as count FROM candidates ${whereClause}`, binds).catch(() => [{ count: 0 }]),
      d1All<any>(c.env.DB, `SELECT COUNT(1) as count FROM candidates ${whereClause} ${whereClause ? 'AND' : 'WHERE'} LOWER(COALESCE(status,'')) = 'active'`, [...binds]).catch(() => [{ count: 0 }]),
      d1All<any>(c.env.DB, `SELECT COUNT(1) as count FROM candidates ${whereClause} ${whereClause ? 'AND' : 'WHERE'} LOWER(COALESCE(status,'')) = 'inactive'`, [...binds]).catch(() => [{ count: 0 }])
    ]);
    
    return c.json({
      success: true,
      data: {
        totalCandidates: total[0]?.count || 0,
        activeCandidates: active[0]?.count || 0,
        inactiveCandidates: inactive[0]?.count || 0,
        totalTestsAssigned: 0 // TODO: Implement when test assignments are ready
      }
    });
  } catch (error) {
    console.error('Error fetching candidate stats:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to fetch candidate statistics',
      error: (error as Error).message 
    }, 500);
  }
});

// Update candidate parsed profile (profile_json)
app.put('/api/candidates/:id/profile', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json<any>().catch(() => ({}));
  try {
    // Verify access
    let whereClause = 'WHERE id = ?';
    const bindsCheck: any[] = [id];
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause += ' AND company_id = ?';
      bindsCheck.push(user.company_id);
    }
    const existing = await d1All<any>(c.env.DB, `SELECT id FROM candidates ${whereClause}`, bindsCheck);
    if (!existing.length) return c.json({ success: false, message: 'Candidate not found' }, 404);

    // Only allow updating profile_json
    const newProfile = body?.profile || body;
    await d1Run(
      c.env.DB,
      'UPDATE candidates SET profile_json = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(newProfile || {}), Math.floor(Date.now() / 1000), id]
    );
    return c.json({ success: true, message: 'Profile updated successfully' });
  } catch (e) {
    console.error('Error updating candidate profile:', e);
    return c.json({ success: false, message: 'Failed to update profile' }, 500);
  }
});

// Update candidate (for edit)
app.put('/api/candidates/:id', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json<any>().catch(() => ({}));
  
  try {
    let whereClause = 'WHERE id = ?';
    const binds: any[] = [id];
    
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause += ' AND (company_id = ? OR company_id IS NULL)';
      binds.push(user.company_id);
    }

    const existing = await d1All<any>(c.env.DB, `SELECT id FROM candidates ${whereClause}`, binds);

    if (existing.length) {
      if (body.email) {
        const duplicate = await d1All<any>(
          c.env.DB,
          'SELECT id FROM candidates WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1',
          [body.email, id]
        ).catch(() => []);
        if (duplicate.length) {
          return c.json({ success: false, message: 'A candidate with this email already exists' }, 409);
        }
      }

      await d1Run(
        c.env.DB,
        'UPDATE candidates SET name = coalesce(?, name), email = coalesce(?, email), phone = coalesce(?, phone), status = coalesce(?, status), updated_at = ? WHERE id = ?',
        [
          body.name ?? null,
          body.email ?? null,
          body.phone ?? null,
          body.status ?? null,
          Math.floor(Date.now() / 1000),
          id
        ]
      );

      return c.json({ success: true, message: 'Candidate updated successfully' });
    }

    // Legacy fallback
    const legacyExisting = await d1All<any>(c.env.DB, `SELECT id FROM candidates_ext ${whereClause}`, binds).catch(() => []);
    if (!legacyExisting.length) {
      return c.json({ success: false, message: 'Candidate not found' }, 404);
    }

    await d1Run(
      c.env.DB,
      'UPDATE candidates_ext SET name = coalesce(?, name), email = coalesce(?, email), phone = coalesce(?, phone), status = coalesce(?, status), updated_at = ? WHERE id = ?',
      [
        body.name ?? null,
        body.email ?? null,
        body.phone ?? null,
        body.status ?? null,
        Math.floor(Date.now() / 1000),
        id
      ]
    );
    return c.json({ success: true, message: 'Candidate updated successfully' });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return c.json({ success: false, message: 'Failed to update candidate' }, 500);
  }
});

// Delete candidate
app.delete('/api/candidates/:id', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  
  try {
    let whereClause = 'WHERE id = ?';
    const binds: any[] = [id];
    
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause += ' AND (company_id = ? OR company_id IS NULL)';
      binds.push(user.company_id);
    }

    const existing = await d1All<any>(c.env.DB, `SELECT id, resume_info_json FROM candidates ${whereClause} LIMIT 1`, binds);
    if (existing.length) {
      const candidate = existing[0];
      try {
        const resumeInfo = safeJSON<any>(candidate.resume_info_json, {});
        if (resumeInfo?.r2Key) {
          await c.env.R2.delete(resumeInfo.r2Key);
        }
      } catch (e) {
        console.warn('Failed to delete resume from R2:', e);
      }

      await d1Run(c.env.DB, 'DELETE FROM candidates WHERE id = ?', [id]);
      return c.json({ success: true, message: 'Candidate deleted successfully' });
    }

    // Legacy fallback
    const legacyExisting = await d1All<any>(c.env.DB, `SELECT id, resume_info_json FROM candidates_ext ${whereClause} LIMIT 1`, binds).catch(() => []);
    if (!legacyExisting.length) {
      return c.json({ success: false, message: 'Candidate not found' }, 404);
    }

    const legacyCandidate = legacyExisting[0];
    try {
      const resumeInfo = safeJSON<any>(legacyCandidate.resume_info_json, {});
      if (resumeInfo?.r2Key) {
        await c.env.R2.delete(resumeInfo.r2Key);
      }
    } catch (e) {
      console.warn('Failed to delete legacy resume from R2:', e);
    }

    await d1Run(c.env.DB, 'DELETE FROM candidates_ext WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return c.json({ success: false, message: 'Failed to delete candidate' }, 500);
  }
});

// Download candidate resume
app.get('/api/candidates/:id/resume', async (c) => {
  await ensureTables(c.env.DB);
  const id = c.req.param('id');
  const user = c.get('user');
  
  try {
    let whereClause = 'WHERE id = ?';
    const binds: any[] = [id];
    
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause += ' AND (company_id = ? OR company_id IS NULL)';
      binds.push(user.company_id);
    }

    let rows = await d1All<any>(c.env.DB, `SELECT resume_info_json FROM candidates ${whereClause} LIMIT 1`, binds);
    if (!rows.length) {
      rows = await d1All<any>(c.env.DB, `SELECT resume_info_json FROM candidates_ext ${whereClause} LIMIT 1`, binds).catch(() => []);
    }
    if (!rows.length) return c.json({ success: false, message: 'Candidate not found' }, 404);

    const resumeInfo = safeJSON<any>(rows[0].resume_info_json, {});
    if (!resumeInfo?.r2Key) {
      return c.json({ success: false, message: 'No resume found for this candidate' }, 404);
    }

    const object = await c.env.R2.get(resumeInfo.r2Key);
    if (!object) {
      return c.json({ success: false, message: 'Resume file not found in storage' }, 404);
    }

    const base = new URL(c.req.url).origin;
    return c.json({ 
      success: true, 
      downloadUrl: `${base}/api/files/${resumeInfo.r2Key}`,
      fileName: resumeInfo.fileName || 'resume.pdf'
    });
  } catch (error) {
    console.error('Error downloading resume:', error);
    return c.json({ success: false, message: 'Failed to download resume' }, 500);
  }
});

// --- Tests CRUD using tests_ext ---
// List tests
app.get('/api/tests', async (c) => {
  const items = await d1All<any>(c.env.DB, 'SELECT * FROM tests_ext ORDER BY created_at DESC LIMIT 200');
  return c.json({ success: true, data: { items } });
});

// Create test
app.post('/api/tests', async (c) => {
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();
  await d1Run(
    c.env.DB,
    'INSERT INTO tests_ext (id, title, description, type, duration, passing_score, status, created_by, tags_json, category, difficulty, instructions, settings_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      body.title,
      body.description || '',
      body.type || 'custom',
      Number(body.duration || 60),
      Number(body.passingScore ?? 70),
      body.status || 'draft',
      body.createdBy || null,
      JSON.stringify(body.tags || []),
      body.category || null,
      body.difficulty || 'medium',
      body.instructions || '',
      JSON.stringify(body.settings || {}),
      Math.floor(Date.now() / 1000)
    ]
  );
  return c.json({ success: true, message: 'Test created', data: { id } }, 201);
});

// Update test
app.put('/api/tests/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  await d1Run(
    c.env.DB,
    'UPDATE tests_ext SET title = coalesce(?, title), description = coalesce(?, description), type = coalesce(?, type), duration = coalesce(?, duration), passing_score = coalesce(?, passing_score), status = coalesce(?, status), tags_json = coalesce(?, tags_json), category = coalesce(?, category), difficulty = coalesce(?, difficulty), instructions = coalesce(?, instructions), settings_json = coalesce(?, settings_json) WHERE id = ?',
    [
      body.title ?? null,
      body.description ?? null,
      body.type ?? null,
      body.duration ?? null,
      body.passingScore ?? null,
      body.status ?? null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.category ?? null,
      body.difficulty ?? null,
      body.instructions ?? null,
      body.settings ? JSON.stringify(body.settings) : null,
      id
    ]
  );
  return c.json({ success: true, message: 'Test updated' });
});

// Delete test
app.delete('/api/tests/:id', async (c) => {
  const id = c.req.param('id');
  await d1Run(c.env.DB, 'DELETE FROM tests_ext WHERE id = ?', [id]);
  return c.json({ success: true, message: 'Test deleted' });
});

// Candidate assignment to a test (insert into test_invitations)
app.post('/api/tests/:id/assign', async (c) => {
  const testId = c.req.param('id');
  const body = await c.req.json<any>();
  const { candidateId, email, message } = body || {};
  if (!candidateId && !email) return c.json({ success: false, message: 'candidateId or email is required' }, 400);
  const invId = crypto.randomUUID();
  const nowSec = Math.floor(Date.now() / 1000);
  await d1Run(
    c.env.DB,
    'INSERT INTO test_invitations (id, assessment_id, email, status, scheduled_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [invId, testId, email || null, 'pending', nowSec, nowSec]
  );
  return c.json({ success: true, message: 'Candidate assignment created', data: { id: invId } }, 201);
});

// --- Questions CRUD using questions_ext ---
app.get('/api/questions', async (c) => {
  const items = await d1All<any>(c.env.DB, 'SELECT * FROM questions_ext ORDER BY created_at DESC LIMIT 200');
  return c.json({ success: true, data: { items } });
});

app.post('/api/questions', async (c) => {
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();
  await d1Run(
    c.env.DB,
    'INSERT INTO questions_ext (id, type, prompt, options_json, answer_json, tags_json, category, difficulty, metadata_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      body.type || 'mcq',
      body.prompt || '',
      JSON.stringify(body.options || []),
      JSON.stringify(body.answer || null),
      JSON.stringify(body.tags || []),
      body.category || null,
      body.difficulty || 'medium',
      JSON.stringify(body.metadata || {}),
      body.createdBy || null,
      Math.floor(Date.now() / 1000)
    ]
  );
  return c.json({ success: true, message: 'Question created', data: { id } }, 201);
});

app.get('/api/questions/:id', async (c) => {
  const id = c.req.param('id');
  const rows = await d1All<any>(c.env.DB, 'SELECT * FROM questions_ext WHERE id = ?', [id]);
  if (rows.length === 0) return c.json({ success: false, message: 'Not found' }, 404);
  return c.json({ success: true, data: rows[0] });
});

app.put('/api/questions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  await d1Run(
    c.env.DB,
    'UPDATE questions_ext SET type = coalesce(?, type), prompt = coalesce(?, prompt), options_json = coalesce(?, options_json), answer_json = coalesce(?, answer_json), tags_json = coalesce(?, tags_json), category = coalesce(?, category), difficulty = coalesce(?, difficulty), metadata_json = coalesce(?, metadata_json) WHERE id = ?',
    [
      body.type ?? null,
      body.prompt ?? null,
      body.options ? JSON.stringify(body.options) : null,
      body.answer ? JSON.stringify(body.answer) : null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.category ?? null,
      body.difficulty ?? null,
      body.metadata ? JSON.stringify(body.metadata) : null,
      id
    ]
  );
  return c.json({ success: true, message: 'Question updated' });
});

app.delete('/api/questions/:id', async (c) => {
  const id = c.req.param('id');
  await d1Run(c.env.DB, 'DELETE FROM questions_ext WHERE id = ?', [id]);
  return c.json({ success: true, message: 'Question deleted' });
});

// --- Attempts + Results with basic scoring ---
// Start an attempt
app.post('/api/tests/:id/attempts', async (c) => {
  const testId = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const attemptId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await d1Run(
    c.env.DB,
    'INSERT INTO test_attempts_ext (id, test_id, candidate_id, status, started_at, attempt_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [attemptId, testId, body.candidateId || null, 'in_progress', now, JSON.stringify({}), now]
  );
  return c.json({ success: true, data: { attemptId } }, 201);
});

// Submit attempt and compute result
app.post('/api/tests/:id/attempts/:attemptId/submit', async (c) => {
  const testId = c.req.param('id');
  const attemptId = c.req.param('attemptId');
  const body = await c.req.json<any>();
  const answers = body.answers || [];

  // Fetch test to compute score
  const tests = await d1All<any>(c.env.DB, 'SELECT questions_json, total_points, passing_score FROM tests_ext WHERE id = ?', [testId]);
  if (tests.length === 0) return c.json({ success: false, message: 'Test not found' }, 404);
  const test = tests[0];
  const questions = safeJSON<any[]>(test.questions_json, []);

  // Basic scoring strategy:
  // - For each answer, compare against question.answer or options with isCorrect flag
  let score = 0;
  let maxScore = 0;
  const details: any[] = [];
  const ansByQ: Record<string, any> = {};
  for (const a of answers) ansByQ[a.questionId] = a.answer;

  for (const q of questions) {
    const qId = q.id || q._id || q.questionId;
    const userAns = ansByQ[qId];
    let correct = false;
    // Determine correct answer from question shape
    const correctAnswer = q.correctAnswer ?? (q.answer && q.answer.correct) ?? q.answer;
    if (Array.isArray(q.options)) {
      const correctOption = q.options.find((o: any) => o?.isCorrect);
      if (correctOption != null && (userAns === correctOption?.value || userAns === correctOption?.id || userAns === correctOption?.key)) correct = true;
    }
    if (!correct && correctAnswer != null) {
      if (Array.isArray(correctAnswer)) {
        correct = Array.isArray(userAns) && correctAnswer.length === userAns.length && correctAnswer.every((v: any, i: number) => v === userAns[i]);
      } else {
        correct = userAns === correctAnswer;
      }
    }
    const qPoints = Number(q.points || 1);
    maxScore += qPoints;
    if (correct) score += qPoints;
    details.push({ questionId: qId, correct, points: qPoints, userAns, correctAnswer: correctAnswer ?? null });
  }

  const passed = score >= Number(test.passing_score ?? Math.ceil(maxScore * 0.6));
  const now = Math.floor(Date.now() / 1000);

  // Update attempt and insert result
  await d1Run(
    c.env.DB,
    'UPDATE test_attempts_ext SET status = ?, completed_at = ?, score = ?, attempt_json = ? WHERE id = ?',
    ['completed', now, score, JSON.stringify({ answers, details }), attemptId]
  );
  const resultId = crypto.randomUUID();
  await d1Run(
    c.env.DB,
    'INSERT INTO test_results_ext (id, attempt_id, test_id, candidate_id, score, max_score, passed, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      resultId,
      attemptId,
      testId,
      body.candidateId || null,
      score,
      maxScore,
      passed ? 1 : 0,
      JSON.stringify({ details }),
      now
    ]
  );

  return c.json({ success: true, data: { attemptId, resultId, score, maxScore, passed } });
});

// Setup superadmin user
app.post('/api/setup/superadmin', async (c) => {
  try {
    const email = 'super@rezulyzer.ai';
    const password = 'Rezulyzer@123';
    const hash = await bcrypt.hash(password, 8);
    
    // Delete existing superadmin and create new one
    await d1Run(c.env.DB, 'DELETE FROM users WHERE email = ?', [email]);
    await d1Run(c.env.DB, 'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', 
      ['superadmin-1', email, hash, 'superadmin']);
    
    return c.json({ 
      success: true, 
      message: 'Superadmin user created',
      email: email,
      role: 'superadmin'
    });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Job Descriptions CRUD
app.get('/api/job-descriptions', async (c) => {
  try {
    const user = c.get('user');
    let query = 'SELECT * FROM job_descriptions WHERE 1=1';
    const params: any[] = [];
    
    // Filter by company for non-superadmin users
    if (user.role !== 'superadmin') {
      query += ' AND company_id = ?';
      params.push(user.company_id);
    }
    
    query += ' ORDER BY created_at DESC';
    const jds = await d1All(c.env.DB, query, params);
    
    return c.json({ success: true, data: { items: jds } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/job-descriptions', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Some deployed schemas may not have the 'requirements' column. Insert only supported columns.
    await d1Run(
      c.env.DB,
      'INSERT INTO job_descriptions (id, title, description, skills, experience_level, location, salary_range, company_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, body.title || '', body.description || '', body.skills || '', body.experienceLevel || '', body.location || '', body.salaryRange || '', user.company_id || null, user.sub || null, now]
    );
    
    const jd = await d1All(c.env.DB, 'SELECT * FROM job_descriptions WHERE id = ?', [id]);
    return c.json({ success: true, data: jd[0] });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});

// Video Interviews CRUD
app.get('/api/video-interviews', async (c) => {
  try {
    const user = c.get('user');
    let query = 'SELECT * FROM video_interviews WHERE 1=1';
    const params: any[] = [];
    
    if (user.role !== 'superadmin') {
      query += ' AND company_id = ?';
      params.push(user.company_id);
    }
    
    query += ' ORDER BY scheduled_date DESC';
    const interviews = await d1All(c.env.DB, query, params);
    
    return c.json({ success: true, data: { items: interviews } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/video-interviews', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Generate meeting link
    const meetingLink = `${c.env.CLIENT_URL}/interview/${crypto.randomUUID()}`;
    
    await d1Run(c.env.DB,
      'INSERT INTO video_interviews (id, title, job_description_id, company_id, scheduled_date, duration_minutes, meeting_link, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, body.title, body.jobDescriptionId, user.company_id, Math.floor(new Date(body.scheduledAt).getTime() / 1000), body.duration, meetingLink, 'scheduled', user.sub, now]
    );
    
    const interview = await d1All(c.env.DB, 'SELECT * FROM video_interviews WHERE id = ?', [id]);
    return c.json({ success: true, data: interview[0] });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Video Interview Invitations
app.post('/api/video-interview-invitations', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await d1Run(c.env.DB,
      'INSERT INTO video_interview_invitations (id, interview_id, candidate_id, email, token, sent_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, body.interviewId, body.candidateId, body.email, token, now, now]
    );
    
    return c.json({ success: true, data: { id, token } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/video-interview-invitations/validate/:token', async (c) => {
  try {
    const token = c.req.param('token');
    
    const invitations = await d1All(c.env.DB, `
      SELECT vi.*, vii.*, c.first_name, c.last_name, c.email as candidate_email
      FROM video_interview_invitations vii
      JOIN video_interviews vi ON vii.interview_id = vi.id
      JOIN candidates c ON vii.candidate_id = c.id
      WHERE vii.token = ?
    `, [token]);
    
    if (invitations.length === 0) {
      return c.json({ success: false, message: 'Invalid token' });
    }
    
    const invitation = invitations[0];
    return c.json({ 
      success: true, 
      data: {
        interview: {
          id: invitation.interview_id,
          title: invitation.title,
          jobTitle: invitation.job_description_id,
          scheduledDate: invitation.scheduled_date,
          duration: invitation.duration_minutes
        },
        candidate: {
          id: invitation.candidate_id,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          email: invitation.candidate_email
        }
      }
    });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/video-interview-invitations/:token/join', async (c) => {
  try {
    const token = c.req.param('token');
    const now = Math.floor(Date.now() / 1000);
    
    await d1Run(c.env.DB, 'UPDATE video_interview_invitations SET status = ?, joined_at = ? WHERE token = ?', 
      ['joined', now, token]);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/video-interview-invitations/:token/complete', async (c) => {
  try {
    const token = c.req.param('token');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);
    
    await d1Run(c.env.DB, 'UPDATE video_interview_invitations SET status = ?, left_at = ? WHERE token = ?', 
      ['completed', now, token]);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Assessment Invitations
app.post('/api/assessment-invitations', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (body.expiresIn || 7) * 24 * 60 * 60; // Default 7 days
    
    await d1Run(c.env.DB,
      'INSERT INTO assessment_invitations (id, assessment_id, candidate_id, email, token, sent_at, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, body.assessmentId, body.candidateId, body.email, token, now, expiresAt, now]
    );
    
    return c.json({ success: true, data: { id, token } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Assessments CRUD
app.get('/api/assessments', async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let whereClause = '';
    let binds: any[] = [];
    
    if (user?.role !== 'superadmin' && user?.company_id) {
      whereClause = 'WHERE company_id = ?';
      binds = [user.company_id];
    }
    
    const assessments = await d1All<any>(
      c.env.DB, 
      `SELECT * FROM assessments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...binds, limit, offset]
    ).catch(() => []);
    
    return c.json({ 
      success: true, 
      data: assessments,
      pagination: {
        limit,
        offset,
        total: assessments.length
      }
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return c.json({ 
      success: true, 
      data: [],
      pagination: { limit: 10, offset: 0, total: 0 }
    });
  }
});

app.post('/api/assessments', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await d1Run(c.env.DB,
      'INSERT INTO assessments (id, title, description, job_description_id, company_id, questions, duration_minutes, passing_score, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, body.title, body.description, body.jobDescriptionId, user.company_id, JSON.stringify(body.questions), body.duration, body.passingScore, body.status, user.sub, now]
    );
    
    const assessment = await d1All(c.env.DB, 'SELECT * FROM assessments WHERE id = ?', [id]);
    return c.json({ success: true, data: assessment[0] });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Dashboard stats for different roles
app.get('/api/dashboard/company-stats', async (c) => {
  try {
    const user = c.get('user');
    
    const [candidates, assessments, interviews, jobDescriptions] = await Promise.all([
      d1All(c.env.DB, 'SELECT COUNT(*) as count FROM candidates WHERE company_id = ?', [user.company_id]),
      d1All(c.env.DB, 'SELECT COUNT(*) as count FROM assessments WHERE company_id = ?', [user.company_id]),
      d1All(c.env.DB, 'SELECT COUNT(*) as count FROM video_interviews WHERE company_id = ?', [user.company_id]),
      d1All(c.env.DB, 'SELECT COUNT(*) as count FROM job_descriptions WHERE company_id = ?', [user.company_id])
    ]);
    
    return c.json({
      success: true,
      data: {
        candidates: candidates[0]?.count || 0,
        assessments: assessments[0]?.count || 0,
        interviews: interviews[0]?.count || 0,
        jobDescriptions: jobDescriptions[0]?.count || 0
      }
    });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// HR Management endpoints
app.get('/api/hr-users', async (c) => {
  try {
    const user = c.get('user');
    if (user.role !== 'superadmin' && user.role !== 'company_admin') {
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }
    
    let whereClause = "WHERE role = 'hr_manager'";
    let binds = [];
    
    if (user.role !== 'superadmin' && user.company_id) {
      whereClause += ' AND company_id = ?';
      binds.push(user.company_id);
    }
    
    const hrUsers = await d1All(c.env.DB, `SELECT id, email, role, company_id, created_at FROM users ${whereClause}`, binds);
    return c.json({ success: true, data: hrUsers });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/hr-users', async (c) => {
  try {
    const user = c.get('user');
    if (user.role !== 'superadmin' && user.role !== 'company_admin') {
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }
    
    const body = await c.req.json();
    const { name, email, password } = body;
    
    if (!name || !email || !password) {
      return c.json({ success: false, message: 'Name, email, and password are required' }, 400);
    }
    
    // Check if email already exists
    const existing = await d1All(c.env.DB, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return c.json({ success: false, message: 'User with this email already exists' }, 409);
    }
    
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);
    
    await d1Run(c.env.DB,
      'INSERT INTO users (id, email, password_hash, role, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, hashedPassword, 'hr_manager', user.company_id, now]
    );
    
    return c.json({ success: true, message: 'HR user created successfully', data: { id } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.delete('/api/hr-users/:id', async (c) => {
  try {
    const user = c.get('user');
    if (user.role !== 'superadmin' && user.role !== 'company_admin') {
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }
    
    const hrUserId = c.req.param('id');
    
    let whereClause = "WHERE id = ? AND role = 'hr_manager'";
    let binds = [hrUserId];
    
    if (user.role !== 'superadmin' && user.company_id) {
      whereClause += ' AND company_id = ?';
      binds.push(user.company_id);
    }
    
    await d1Run(c.env.DB, `DELETE FROM users ${whereClause}`, binds);
    return c.json({ success: true, message: 'HR user deleted successfully' });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Interview Management endpoints
app.post('/api/interviews', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    const { title, description, scheduledDate, scheduledTime, duration, type, candidateIds, location } = body;
    
    if (!title || !scheduledDate || !scheduledTime || !candidateIds?.length) {
      return c.json({ success: false, message: 'Title, date, time, and candidates are required' }, 400);
    }
    
    // Create interview record
    await d1Run(c.env.DB,
      'INSERT INTO video_interviews (id, title, description, scheduled_date, scheduled_time, duration_minutes, type, location, company_id, created_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, scheduledDate, scheduledTime, duration || 60, type || 'video', location || 'Online', user.company_id, user.sub, 'scheduled', now]
    );
    
    // Create interview invitations for each candidate
    for (const candidateId of candidateIds) {
      const inviteId = crypto.randomUUID();
      await d1Run(c.env.DB,
        'INSERT INTO interview_invitations (id, interview_id, candidate_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [inviteId, id, candidateId, 'sent', now]
      );
    }
    
    return c.json({ success: true, message: 'Interview scheduled successfully', data: { id } });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/interviews', async (c) => {
  try {
    const user = c.get('user');
    let whereClause = '';
    let binds = [];
    
    if (user.role !== 'superadmin' && user.company_id) {
      whereClause = 'WHERE company_id = ?';
      binds.push(user.company_id);
    }
    
    const interviews = await d1All(c.env.DB, `SELECT * FROM video_interviews ${whereClause} ORDER BY scheduled_date DESC, scheduled_time DESC`, binds);
    return c.json({ success: true, data: interviews });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/interviews/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    
    let whereClause = 'WHERE id = ?';
    let binds = [id];
    
    if (user.role !== 'superadmin' && user.company_id) {
      whereClause += ' AND company_id = ?';
      binds.push(user.company_id);
    }
    
    const interview = await d1All(c.env.DB, `SELECT * FROM video_interviews ${whereClause}`, binds);
    if (!interview.length) {
      return c.json({ success: false, message: 'Interview not found' }, 404);
    }
    
    // Get interview invitations
    const invitations = await d1All(c.env.DB, 
      'SELECT ii.*, c.name as candidate_name, c.email as candidate_email FROM interview_invitations ii LEFT JOIN candidates c ON ii.candidate_id = c.id WHERE ii.interview_id = ?', 
      [id]
    );
    
    return c.json({ 
      success: true, 
      data: { 
        ...interview[0], 
        invitations 
      } 
    });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message });
  }
});

// Export fetch-only Worker (no queues for free setup)
export default {
  fetch: app.fetch
};

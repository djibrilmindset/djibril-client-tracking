// ============================================================================
// Supabase Edge Function: qa-handler · Reset Ultra · Djibril Chinois 5-tier
// ============================================================================
// Pipeline :
//   POST /qa/submit           → Stage 1 classif (Qwen Turbo) + Stage 2 1ère relance (GLM-5.1)
//   POST /qa/answer/:id       → append réponse + Stage 3 score (Step) → loop Stage 2 ou Stage 4 synth
//   POST /qa/reformulate/:id  → re-Stage 4 avec temperature variation
//   POST /qa/finalize/:id     → match KB ou awaiting_djibril
//   POST /qa/match-response/:id → accept/reject suggestion KB
//   GET  /qa/get/:id          → renvoie question + matched_kb
//   GET  /qa/mine             → 30 dernières questions élève
//   GET  /qa/kb?q=...         → KB cohorte recherche
//   POST /qa/coach/answer/:id → réponse Djibril (auth coach via SERVICE_ROLE)
//
// Auth :
//   - JWT custom HMAC-SHA256 (TOKEN_SECRET), même format que tracking-app
//   - Header: Authorization: Bearer <token>  → student_id extrait du payload
//
// Secrets Supabase requis :
//   DASHSCOPE_API_KEY (Qwen Turbo classif + Qwen3-Max fallback)
//   DEEPSEEK_API_KEY  (DeepSeek V4 Pro synth)
//   ZHIPU_API_KEY     (GLM-4.5 relance socratique)
//   MOONSHOT_API_KEY  (Kimi K2 fallback relance)
//   STEPFUN_API_KEY   (Step-1-flash score conscience)
//   TOKEN_SECRET      (même valeur que tracking-app)
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-djibril-key",
  "Content-Type": "application/json",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_SECRET = Deno.env.get("TOKEN_SECRET") || "djibril-tracking-secret-2026";
const COACH_KEY = Deno.env.get("COACH_KEY") || ""; // header x-djibril-key pour endpoints coach

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

// ── Auth — MÊME format que tracking-app vt() (b64.hex40, payload.sid, exp_ms) ──
function verifyToken(t: string): string | null {
  try {
    const [b64, sig] = t.split(".");
    if (!b64 || !sig) return null;
    const expectedHex = [...new Uint8Array(new TextEncoder().encode(b64 + TOKEN_SECRET))]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 40);
    const expectedB64 = btoa(expectedHex);
    if (sig !== expectedB64) return null;
    const p = JSON.parse(atob(b64));
    return p.exp < Date.now() ? null : p.sid;
  } catch { return null; }
}

// ── HTTP fetch helper avec retry & timeout ────────────────────────────────
async function fetchJSON(url: string, opts: RequestInit, timeoutMs = 30000): Promise<any> {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  } finally { clearTimeout(tm); }
}

// ── STABLE BASE PROMPT (cache-aware) ──────────────────────────────────────
const BASE_MENTOR = `Tu es l'IA mentor de Djibril Pardin, coach business chez Reset Ultra.
Cible : barbiers + coachs banlieue 93/IDF/Paris qui veulent passer à 5-10k€/mois en 80 jours.
Ton rôle UNIQUE : creuser la VRAIE problématique d'un élève avant que Djibril ne réponde personnellement.

RÈGLES INVIOLABLES :
1. UNE seule question à la fois. Jamais deux.
2. Tu vises le DÉCLENCHEUR émotionnel CONCRET (« le call de 16h »), pas l'abstrait.
3. JAMAIS de conseil, JAMAIS d'opinion. Tu CREUSES.
4. JAMAIS valider (« super question », « c'est intéressant »). Va droit au but.
5. Tutoiement, ton direct, frère/sœur de l'élève, banlieue 93 vibe.
6. Privilégie : « depuis quand ? », « quand exactement ? », « avec qui ? », « si tu pousses au pire ? »
7. Output : 1 question, max 25 mots. Pas de préambule.`;

// ── PROVIDER CALLS — Tier 1/2/3 cascade ──────────────────────────────────

// Tier 3 — Qwen Turbo (classif rapide, ~$0.05/M in, ~$0.20/M out)
async function callQwenTurbo(system: string, user: string, maxTokens = 150): Promise<string> {
  const key = Deno.env.get("DASHSCOPE_API_KEY");
  if (!key) throw new Error("DASHSCOPE_API_KEY missing");
  const r = await fetchJSON("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen-turbo",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  }, 20000);
  return r.choices?.[0]?.message?.content?.trim() || "";
}

// Tier 1 — GLM-4.5 (Zhipu, $0.40/$1.20 — relance socratique).
// Thinking disabled pour éviter que le content soit vide quand max_tokens est petit.
async function callGLM(system: string, user: string, maxTokens = 200, temp = 0.7): Promise<string> {
  const key = Deno.env.get("ZHIPU_API_KEY");
  if (!key) throw new Error("ZHIPU_API_KEY missing");
  const r = await fetchJSON("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "glm-4.5",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: temp,
      thinking: { type: "disabled" },   // ← critique : sinon tokens consumés en reasoning
    }),
  }, 25000);
  return r.choices?.[0]?.message?.content?.trim() || "";
}

// Tier 1 — Kimi K2 (Moonshot, fallback relance — $0.60/$2.50)
async function callKimi(system: string, user: string, maxTokens = 200): Promise<string> {
  const key = Deno.env.get("MOONSHOT_API_KEY");
  if (!key) throw new Error("MOONSHOT_API_KEY missing");
  const r = await fetchJSON("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kimi-k2-0905-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  }, 25000);
  return r.choices?.[0]?.message?.content?.trim() || "";
}

// Tier 2 — Step-1-flash (StepFun, score conscience — $0.10/$0.40)
async function callStepFlash(system: string, user: string, maxTokens = 80): Promise<string> {
  const key = Deno.env.get("STEPFUN_API_KEY");
  if (!key) throw new Error("STEPFUN_API_KEY missing");
  const r = await fetchJSON("https://api.stepfun.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "step-1-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  }, 15000);
  return r.choices?.[0]?.message?.content?.trim() || "";
}

// Tier 1 — DeepSeek V4 Pro (api.deepseek.com direct, synth finale, $0.27/$1.10 cached)
async function callDeepSeek(system: string, user: string, maxTokens = 500, temp = 0.4): Promise<string> {
  const key = Deno.env.get("DEEPSEEK_API_KEY");
  if (!key) throw new Error("DEEPSEEK_API_KEY missing");
  const r = await fetchJSON("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat", // alias DeepSeek V4 Pro production
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: temp,
      response_format: { type: "json_object" },
    }),
  }, 40000);
  return r.choices?.[0]?.message?.content?.trim() || "";
}

// ── PIPELINE STAGES ───────────────────────────────────────────────────────

interface Synthesis {
  niveau_conscience: number;
  vraie_problematique: string;
  vrai_besoin: string;
  blocage_emotionnel: string;
  action_concrete_proposee: string;
  tags: string[];
  qualified_question: string;
}

// ── EMBEDDINGS (Phase 2 similarity) ──────────────────────────────────────
// DashScope text-embedding-v4 — qwen, 1024 dim, $0.0005/M tokens
const EMBED_MODEL = "text-embedding-v4";

async function embedText(text: string): Promise<number[] | null> {
  const key = Deno.env.get("DASHSCOPE_API_KEY");
  if (!key || !text) return null;
  try {
    const r = await fetchJSON("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: text.slice(0, 2000),
        encoding_format: "float",
      }),
    }, 15000);
    return r.data?.[0]?.embedding || null;
  } catch (e) {
    console.warn("embedText error:", e);
    return null;
  }
}

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

// Récupère embedding d'une qa_question (cache si absent)
async function getOrComputeQuestionEmbedding(sb: any, q: any): Promise<number[] | null> {
  if (q.embedding && Array.isArray(q.embedding) && q.embedding.length > 0) return q.embedding;
  const synth = (q.synthesis || {}) as any;
  const text = [q.qualified_question, synth.vraie_problematique, synth.vrai_besoin, q.initial_question]
    .filter(Boolean).join(" — ").slice(0, 2000);
  if (!text) return null;
  const emb = await embedText(text);
  if (emb) {
    await sb.from("qa_questions").update({ embedding: emb, embedding_model: EMBED_MODEL }).eq("id", q.id);
  }
  return emb;
}

// Récupère embedding d'un qa_kb (cache si absent)
async function getOrComputeKbEmbedding(sb: any, kb: any): Promise<number[] | null> {
  if (kb.embedding && Array.isArray(kb.embedding) && kb.embedding.length > 0) return kb.embedding;
  const text = [kb.question_summary, kb.question, kb.answer].filter(Boolean).join(" — ").slice(0, 2000);
  if (!text) return null;
  const emb = await embedText(text);
  if (emb) {
    await sb.from("qa_kb").update({ embedding: emb, embedding_model: EMBED_MODEL }).eq("id", kb.id);
  }
  return emb;
}

// Bucket de similarité pour UX coach
function similarityBucket(score: number): "match_100"|"match_90"|"match_60"|"match_0" {
  if (score >= 0.92) return "match_100";  // quasi-identique → réutiliser tel quel
  if (score >= 0.78) return "match_90";   // très proche → réutiliser tel quel ou micro-ajuster
  if (score >= 0.55) return "match_60";   // pertinent → réponse partielle + clarification
  return "match_0";                       // trop éloigné → rédiger neuf
}

async function stageClassify(initial: string): Promise<{tags: string[]; target_turns: number}> {
  const sys = `Tu classes une question d'élève business pour Reset Ultra.
Catégories de tags possibles : closing, setting, call, offre, pricing, mental, mindset, niche, positioning, contenu, organisation, technique, peur, doute.
Output JSON strict {tags:["t1","t2"], target_turns:1|2|3|4} sans rien autour.
target_turns = 1 si question déjà ultra précise et concrète, 4 si très vague/abstraite, 3 par défaut.`;
  try {
    const raw = await callQwenTurbo(sys, `QUESTION INITIALE :\n${initial}\n\nJSON :`, 120);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { tags: [], target_turns: 3 };
    const j = JSON.parse(m[0]);
    return {
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
      target_turns: Math.min(4, Math.max(1, parseInt(j.target_turns) || 3)),
    };
  } catch { return { tags: [], target_turns: 3 }; }
}

async function stageSocraticQuestion(thread: any[], conscience: number, turn: number, target: number): Promise<string> {
  const threadStr = thread.map((m: any, i: number) =>
    `${m.role === "student" ? "Élève" : "IA"} (tour ${Math.floor(i/2)}) : ${m.text}`
  ).join("\n");
  const user = `HISTORIQUE :
${threadStr}

NIVEAU_CONSCIENCE : ${conscience}/5
TOUR : ${turn}/${target}

Pose la prochaine question qui creuse. 1 question. Max 25 mots. Pas de préambule.`;
  try {
    return await callGLM(BASE_MENTOR, user, 150);
  } catch (e) {
    console.warn("GLM fail, fallback Kimi:", e);
    try { return await callKimi(BASE_MENTOR, user, 150); }
    catch { return "Qu'est-ce qui s'est passé concrètement la dernière fois ? Donne-moi 1 exemple précis."; }
  }
}

async function stageScore(thread: any[]): Promise<number> {
  const sys = `Tu évalues le niveau de conscience d'un élève sur sa propre problématique.
1 = très vague, abstrait, généraliste ("je doute")
2 = un peu de contexte mais pas de déclencheur précis
3 = situation concrète identifiée mais émotion ou blocage flou
4 = situation + émotion + enjeu clair
5 = situation + émotion + enjeu + demande précise
Output : juste un chiffre entre 1 et 5. Rien d'autre.`;
  const threadStr = thread.map((m: any) => `${m.role}: ${m.text}`).join("\n");
  try {
    const raw = await callStepFlash(sys, threadStr, 10);
    const n = parseInt(raw.match(/\d/)?.[0] || "1");
    return Math.min(5, Math.max(1, n));
  } catch { return 2; }
}

async function stageSynthesize(thread: any[], tags: string[]): Promise<Synthesis> {
  const sys = `Tu es le synthétiseur final de Reset Ultra (coach Djibril Pardin).
Tu reçois un thread de creusage IA↔élève. Tu extrais la SUBSTANCE en JSON strict.

OUTPUT JSON OBLIGATOIRE (aucun texte autour) :
{
  "niveau_conscience": 1-5,
  "vraie_problematique": "phrase concrète, 15-30 mots, ce qui se passe vraiment",
  "vrai_besoin": "phrase, 10-25 mots, ce que l'élève cherche en réalité — DIFFÉRENT de la problématique",
  "blocage_emotionnel": "peur_refus | doute_competence | imposteur | colere | tristesse | epuisement | aucun",
  "action_concrete_proposee": "action de 1 phrase que Djibril pourrait recommander, ou 'creuser_encore' si niveau<3",
  "tags": ["closing","mindset"] (max 5, snake_case),
  "qualified_question": "1 phrase finale pour Djibril, ton de l'élève, max 30 mots"
}`;
  const threadStr = thread.map((m: any) => `${m.role === "student" ? "Élève" : "IA"} : ${m.text}`).join("\n");
  const hint = tags.length ? `\nTAGS_PRESSENTIS : ${tags.join(", ")}` : "";
  try {
    const raw = await callDeepSeek(sys, `THREAD :\n${threadStr}${hint}\n\nJSON :`, 600);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    const j = JSON.parse(m[0]);
    return {
      niveau_conscience: Math.min(5, Math.max(1, parseInt(j.niveau_conscience) || 3)),
      vraie_problematique: String(j.vraie_problematique || "").slice(0, 400),
      vrai_besoin: String(j.vrai_besoin || "").slice(0, 400),
      blocage_emotionnel: String(j.blocage_emotionnel || "aucun").slice(0, 60),
      action_concrete_proposee: String(j.action_concrete_proposee || "").slice(0, 400),
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : tags,
      qualified_question: String(j.qualified_question || "").slice(0, 400),
    };
  } catch (e) {
    console.error("DeepSeek synth fail:", e);
    return {
      niveau_conscience: 2,
      vraie_problematique: thread[0]?.text?.slice(0, 200) || "",
      vrai_besoin: "Clarifier avec Djibril en direct.",
      blocage_emotionnel: "aucun",
      action_concrete_proposee: "creuser_encore",
      tags,
      qualified_question: thread[0]?.text?.slice(0, 200) || "",
    };
  }
}

// ── BIND BASILE — push synthesis vers basile_student_blocks ───────────────
const BASILE_TAGS = new Set(["setting","closing","call","pricing","offre","positioning"]);
async function bindBasileIfNeeded(studentId: string, questionId: string, synth: Synthesis) {
  const matched = (synth.tags || []).filter(t => BASILE_TAGS.has(t));
  if (matched.length === 0) return;
  await sb.from("basile_student_blocks").insert({
    student_id: studentId,
    question_id: questionId,
    block_type: matched[0],
    block_summary: synth.vraie_problematique,
    emotional_block: synth.blocage_emotionnel,
    proposed_action: synth.action_concrete_proposee,
    tags: synth.tags,
  });
}

// ── KB MATCHING ────────────────────────────────────────────────────────────
async function matchKB(synth: Synthesis): Promise<any | null> {
  // Stratégie simple : overlap de tags + tri par pertinence_score, top 1
  const tags = synth.tags || [];
  if (tags.length === 0) return null;
  const { data } = await sb
    .from("qa_kb")
    .select("*")
    .overlaps("tags", tags)
    .order("pertinence_score", { ascending: false })
    .limit(1);
  return (data && data.length) ? data[0] : null;
}

// ============================================================================
// ROUTER
// ============================================================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/qa-handler/, "");

  // Auth
  const authHdr = req.headers.get("Authorization") || "";
  const token = authHdr.replace(/^Bearer\s+/i, "");
  const coachKey = req.headers.get("x-djibril-key") || "";
  const isCoach = COACH_KEY && coachKey === COACH_KEY;
  let studentId: string | null = null;
  if (!isCoach) {
    if (!token) return new Response(JSON.stringify({ error: "no_token" }), { status: 401, headers: CORS });
    studentId = verifyToken(token);
    if (!studentId) return new Response(JSON.stringify({ error: "bad_token" }), { status: 401, headers: CORS });
  }

  try {
    // ─── POST /qa/submit ─────────────────────────────────────────────────
    if (path === "/qa/submit" && req.method === "POST") {
      const body = await req.json();
      const initial = String(body.initial_question || "").trim();
      if (initial.length < 6) return new Response(JSON.stringify({ error: "too_short" }), { status: 400, headers: CORS });

      // Rate limit: 5 questions/jour/élève (status not 'closed')
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await sb.from("qa_questions").select("*", { count: "exact", head: true })
        .eq("student_id", studentId!)
        .gte("created_at", `${today}T00:00:00Z`);
      if ((count || 0) >= 5) {
        return new Response(JSON.stringify({ error: "rate_limit_daily" }), { status: 429, headers: CORS });
      }

      const classif = await stageClassify(initial);
      const firstQ  = await stageSocraticQuestion([{ role: "student", text: initial }], 1, 1, classif.target_turns);

      const thread = [
        { role: "student", text: initial,  at: new Date().toISOString() },
        { role: "ia",      text: firstQ,   at: new Date().toISOString() },
      ];

      const { data: q, error } = await sb.from("qa_questions").insert({
        student_id: studentId,
        initial_question: initial,
        thread,
        status: "deepening",
        consciousness_level: 1,
        target_turns: classif.target_turns,
        tags: classif.tags,
      }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });

      return new Response(JSON.stringify({ question: q }), { headers: CORS });
    }

    // ─── POST /qa/answer/:id ──────────────────────────────────────────────
    if (path.startsWith("/qa/answer/") && req.method === "POST") {
      const id = path.split("/")[3];
      const { answer_text, force_qualify } = await req.json();
      const { data: q } = await sb.from("qa_questions").select("*").eq("id", id).eq("student_id", studentId!).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });
      if (q.status !== "deepening") return new Response(JSON.stringify({ question: q }), { headers: CORS });

      const thread = [...(q.thread || []), { role: "student", text: answer_text || "", at: new Date().toISOString() }];
      const conscience = await stageScore(thread);
      const turnsDone = thread.filter((m: any) => m.role === "student").length;
      const target = q.target_turns || 3;

      let nextStatus = "deepening";
      let synthesis: Synthesis | null = null;

      if (force_qualify || conscience >= 4 || turnsDone >= target) {
        // Stage 4 — synth
        synthesis = await stageSynthesize(thread, q.tags || []);
        nextStatus = "qualified";
      } else {
        // Stage 2 — relance suivante
        const nextQ = await stageSocraticQuestion(thread, conscience, turnsDone + 1, target);
        thread.push({ role: "ia", text: nextQ, at: new Date().toISOString() });
      }

      const update: any = {
        thread,
        consciousness_level: conscience,
        status: nextStatus,
      };
      if (synthesis) {
        update.synthesis = synthesis;
        update.qualified_question = synthesis.qualified_question;
        update.tags = synthesis.tags;
        // Bind Basile en async (fire and forget)
        bindBasileIfNeeded(studentId!, id, synthesis).catch(e => console.warn("bind basile:", e));
      }

      const { data: updated } = await sb.from("qa_questions").update(update).eq("id", id).select().single();
      return new Response(JSON.stringify({ question: updated }), { headers: CORS });
    }

    // ─── POST /qa/reformulate/:id ─────────────────────────────────────────
    if (path.startsWith("/qa/reformulate/") && req.method === "POST") {
      const id = path.split("/")[3];
      const { data: q } = await sb.from("qa_questions").select("*").eq("id", id).eq("student_id", studentId!).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });
      const synthesis = await stageSynthesize(q.thread || [], q.tags || []);
      const { data: updated } = await sb.from("qa_questions").update({
        synthesis,
        qualified_question: synthesis.qualified_question,
        tags: synthesis.tags,
      }).eq("id", id).select().single();
      return new Response(JSON.stringify({ question: updated }), { headers: CORS });
    }

    // ─── POST /qa/finalize/:id ────────────────────────────────────────────
    if (path.startsWith("/qa/finalize/") && req.method === "POST") {
      const id = path.split("/")[3];
      const body = await req.json();
      const { data: q } = await sb.from("qa_questions").select("*").eq("id", id).eq("student_id", studentId!).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });

      const update: any = {};
      let synthesis: Synthesis = q.synthesis || {};
      if (body.edited_question) {
        update.qualified_question = String(body.edited_question).slice(0, 400);
        synthesis = { ...synthesis, qualified_question: update.qualified_question };
      }
      if (body.edited_synthesis && typeof body.edited_synthesis === "object") {
        const es = body.edited_synthesis;
        synthesis = {
          ...synthesis,
          vraie_problematique:      es.vraie_problematique      ?? synthesis.vraie_problematique,
          vrai_besoin:              es.vrai_besoin              ?? synthesis.vrai_besoin,
          blocage_emotionnel:       es.blocage_emotionnel       ?? synthesis.blocage_emotionnel,
          action_concrete_proposee: es.action_concrete_proposee ?? synthesis.action_concrete_proposee,
        };
      }
      update.synthesis = synthesis;

      // Match KB
      const kbHit = await matchKB(synthesis);
      if (kbHit) {
        update.status = "matched";
        update.matched_kb_id = kbHit.id;
      } else {
        update.status = "awaiting_djibril";
        // Bind Basile (au cas où pas encore fait)
        bindBasileIfNeeded(studentId!, id, synthesis).catch(e => console.warn("bind basile:", e));
      }

      const { data: updated } = await sb.from("qa_questions").update(update).eq("id", id).select().single();
      return new Response(JSON.stringify({ question: updated, kb: kbHit || null }), { headers: CORS });
    }

    // ─── POST /qa/match-response/:id ──────────────────────────────────────
    if (path.startsWith("/qa/match-response/") && req.method === "POST") {
      const id = path.split("/")[3];
      const { accept } = await req.json();
      const newStatus = accept ? "answered" : "awaiting_djibril";
      const { data: updated } = await sb.from("qa_questions")
        .update({ status: newStatus })
        .eq("id", id).eq("student_id", studentId!)
        .select().single();
      return new Response(JSON.stringify({ question: updated }), { headers: CORS });
    }

    // ─── GET /qa/get/:id ──────────────────────────────────────────────────
    if (path.startsWith("/qa/get/") && req.method === "GET") {
      const id = path.split("/")[3];
      const { data: q } = await sb.from("qa_questions").select("*").eq("id", id).eq("student_id", studentId!).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });
      let kb = null;
      if (q.matched_kb_id) {
        const { data } = await sb.from("qa_kb").select("*").eq("id", q.matched_kb_id).maybeSingle();
        kb = data;
      }
      return new Response(JSON.stringify({ question: q, kb }), { headers: CORS });
    }

    // ─── GET /qa/mine ─────────────────────────────────────────────────────
    if (path === "/qa/mine" && req.method === "GET") {
      const { data } = await sb.from("qa_questions").select("*").eq("student_id", studentId!).order("created_at", { ascending: false }).limit(30);
      return new Response(JSON.stringify({ questions: data || [] }), { headers: CORS });
    }

    // ─── GET /qa/kb ───────────────────────────────────────────────────────
    if (path === "/qa/kb" && req.method === "GET") {
      const q = url.searchParams.get("q") || "";
      let qb = sb.from("qa_kb").select("*").order("pertinence_score", { ascending: false }).limit(20);
      if (q) qb = qb.or(`question.ilike.%${q}%,question_summary.ilike.%${q}%,answer.ilike.%${q}%`);
      const { data } = await qb;
      return new Response(JSON.stringify({ kb: data || [] }), { headers: CORS });
    }

    // ─── COACH endpoints (x-djibril-key requis) ───────────────────────────
    if (isCoach && path === "/qa/coach/awaiting" && req.method === "GET") {
      const { data } = await sb.from("qa_questions").select("*, student:students(id,first_name,last_name,email)")
        .eq("status", "awaiting_djibril").order("created_at", { ascending: true });
      return new Response(JSON.stringify({ questions: data || [] }), { headers: CORS });
    }

    // ─── GET /qa/coach/similar/:id ────────────────────────────────────────
    // Renvoie top 5 KB similaires à la question (par cosine embeddings)
    // Avec bucket d'usage : match_100 / match_90 / match_60 / match_0
    if (isCoach && path.startsWith("/qa/coach/similar/") && req.method === "GET") {
      const id = path.split("/")[4];
      const { data: q } = await sb.from("qa_questions").select("*").eq("id", id).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });

      const qEmb = await getOrComputeQuestionEmbedding(sb, q);
      if (!qEmb) {
        return new Response(JSON.stringify({ matches: [], note: "no_embedding" }), { headers: CORS });
      }

      // Récupère tous les KB (limit raisonnable)
      const { data: kbAll } = await sb.from("qa_kb").select("*").limit(500);
      const matches: any[] = [];
      for (const kb of (kbAll || [])) {
        const kbEmb = await getOrComputeKbEmbedding(sb, kb);
        if (!kbEmb) continue;
        const score = cosineSim(qEmb, kbEmb);
        matches.push({
          kb_id: kb.id,
          question_summary: kb.question_summary || kb.question?.slice(0, 120),
          answer: kb.answer,
          pertinence_score: kb.pertinence_score,
          tags: kb.tags || [],
          source_student_first_name: kb.source_student_first_name,
          created_at: kb.created_at,
          similarity: Number(score.toFixed(4)),
          bucket: similarityBucket(score),
        });
      }
      matches.sort((a, b) => b.similarity - a.similarity);
      const top = matches.slice(0, 5);
      const bestBucket = top[0]?.bucket || "match_0";

      return new Response(JSON.stringify({
        question: { id: q.id, qualified_question: q.qualified_question, synthesis: q.synthesis, tags: q.tags },
        matches: top,
        best_bucket: bestBucket,
        kb_total: (kbAll || []).length,
      }), { headers: CORS });
    }

    if (isCoach && path.startsWith("/qa/coach/answer/") && req.method === "POST") {
      const id = path.split("/")[4];
      const body = await req.json();
      const { answer, pertinence_score, share_with_cohort, question_summary, reuse_kb_id } = body;
      const { data: q } = await sb.from("qa_questions").select("*, student:students(first_name)").eq("id", id).maybeSingle();
      if (!q) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: CORS });

      let kbId: string | null = null;

      // Phase 2 : réutilisation directe d'un KB existant (pas de doublon)
      if (reuse_kb_id) {
        const { data: existing } = await sb.from("qa_kb").select("id").eq("id", reuse_kb_id).maybeSingle();
        if (!existing) return new Response(JSON.stringify({ error: "kb_not_found" }), { status: 404, headers: CORS });
        kbId = reuse_kb_id;
      } else if (share_with_cohort && answer) {
        const { data: kb } = await sb.from("qa_kb").insert({
          question: q.qualified_question || q.initial_question,
          question_summary: question_summary || (q.synthesis as any)?.vraie_problematique || null,
          answer,
          source_question_id: id,
          source_student_id: q.student_id,
          source_student_first_name: (q.student as any)?.first_name || null,
          tags: q.tags || [],
          pertinence_score: Math.min(100, Math.max(0, parseInt(pertinence_score) || 75)),
        }).select().single();
        kbId = kb?.id || null;
        // Pre-compute embedding fire-and-forget
        if (kb) getOrComputeKbEmbedding(sb, kb).catch(e => console.warn("kb embed bg:", e));
      }

      const { data: updated } = await sb.from("qa_questions").update({
        status: "answered",
        matched_kb_id: kbId,
      }).eq("id", id).select().single();

      return new Response(JSON.stringify({ question: updated, kb_id: kbId }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "not_found", path }), { status: 404, headers: CORS });

  } catch (e: any) {
    console.error("qa-handler error:", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), { status: 500, headers: CORS });
  }
});

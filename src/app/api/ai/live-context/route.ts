import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

// ---------------------------------------------------------------------------
// Source definitions — keyed by profile trait
// ---------------------------------------------------------------------------
const CONTEXT_SOURCES: Record<string, { name: string; url: string }[]> = {
  pgwp: [
    { name: "PGWP Eligibility", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/post-graduation-work-permit.html" },
    { name: "Language Requirements", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/language-requirements.html" },
  ],
  pnp: [
    { name: "Provincial Nominees", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html" },
    { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
  ],
  ee: [
    { name: "Express Entry", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" },
    { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
  ],
  ns: [
    { name: "Nova Scotia Immigration", url: "https://novascotiaimmigration.com/" },
    { name: "NSNP Programs", url: "https://novascotiaimmigration.com/move-here/" },
  ],
  general: [
    { name: "IRCC Notices", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html" },
    { name: "IRCC News Releases", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/news-releases.html" },
    { name: "Processing Times", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html" },
  ],
};

// ---------------------------------------------------------------------------
// In memory cache — 6 hour TTL, keyed by sorted source URLs
// ---------------------------------------------------------------------------
interface CacheEntry {
  cards: LiveCard[];
  meta: Record<string, unknown>;
  expiresAt: number;
}

interface LiveCard {
  type: string;
  title: string;
  summary: string;
  whyThisMatters: string;
  nextAction: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  relevanceToUser: string;
  fetchedAt?: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, CacheEntry>();

function getCacheKey(urls: string[]): string {
  return [...urls].sort().join("|");
}

// ---------------------------------------------------------------------------
// Robust HTML text extraction — strips chrome, keeps main content
// ---------------------------------------------------------------------------
function extractPageText(html: string): string {
  // Remove scripts, styles, nav, footer, header, aside, forms
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Extract <main> or <article> content if present for better signal
  const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  if (mainMatch) {
    text = mainMatch[1];
  } else if (articleMatch) {
    text = articleMatch[1];
  }

  // Strip remaining tags, decode entities, normalize whitespace
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

// ---------------------------------------------------------------------------
// Fetch a single page with retries and multiple user agents
// ---------------------------------------------------------------------------
async function fetchPage(
  source: { name: string; url: string }
): Promise<{ name: string; url: string; text: string } | null> {
  const userAgents = [
    "Mozilla/5.0 (compatible; InsideCanada/1.0; +https://insidecanada.ca)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  for (const ua of userAgents) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-CA,en;q=0.9",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const text = extractPageText(html);
        // Only count as success if we got meaningful content (at least 200 chars)
        if (text.length >= 200) {
          return { name: source.name, url: source.url, text };
        }
      }
    } catch {
      // Try next user agent
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fallback cards — always available, profile aware, sourced from known facts
// ---------------------------------------------------------------------------
function buildFallbackCards(profile: {
  province: string;
  status: string;
  stream: string;
  has_applied: boolean;
}): LiveCard[] {
  const now = new Date().toISOString();
  const cards: LiveCard[] = [];

  // Always include processing times card
  cards.push({
    type: "live_context",
    title: "How IRCC Calculates Processing Times",
    summary:
      "IRCC processing times are based on current application inventory, staff capacity, and expected submission volume. Times include biometrics collection. Complex applications requiring additional security screening or document verification may take longer than posted estimates.",
    whyThisMatters: profile.has_applied
      ? "This directly affects your current application. Processing time estimates are not guarantees."
      : "Understanding processing times helps you plan your application timeline realistically.",
    nextAction: "Check the official processing times tool for the most current estimate for your application type.",
    sourceName: "IRCC Processing Times",
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
    category: "processing",
    relevanceToUser: profile.has_applied ? "high" : "medium",
    fetchedAt: now,
  });

  // IRCC notices card
  cards.push({
    type: "live_context",
    title: "IRCC Notices and Service Disruptions",
    summary:
      "IRCC regularly posts operational notices about service disruptions, system outages, policy changes, and updated guidance. These notices may affect application processing, biometrics appointments, or portal access.",
    whyThisMatters:
      "Service notices can impact your ability to submit documents, attend appointments, or check your application status.",
    nextAction: "Review the IRCC notices page for any current disruptions that may affect you.",
    sourceName: "IRCC Notices",
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
    category: "news",
    relevanceToUser: "medium",
    fetchedAt: now,
  });

  // IRCC news releases
  cards.push({
    type: "live_context",
    title: "Latest IRCC News and Announcements",
    summary:
      "IRCC publishes news releases about immigration levels plans, new programs, policy changes, and special measures. Recent announcements may include updates to Express Entry draws, PNP allocations, or temporary resident policies.",
    whyThisMatters:
      "Policy announcements from IRCC can change eligibility rules, processing priorities, or open new pathways.",
    nextAction: "Check the IRCC news releases page for recent announcements relevant to your immigration pathway.",
    sourceName: "IRCC News Releases",
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/news/news-releases.html",
    category: "news",
    relevanceToUser: "medium",
    fetchedAt: now,
  });

  // Nova Scotia specific
  if (
    profile.province?.toLowerCase().includes("nova scotia") ||
    profile.stream === "nsnp"
  ) {
    cards.push({
      type: "live_context",
      title: "Nova Scotia Nominee Program (NSNP) Updates",
      summary:
        "The Nova Scotia Nominee Program was reorganized into four consolidated streams as of February 18, 2026: Nova Scotia Labour Market Priorities, Nova Scotia Employer Driven, Nova Scotia Experience Express Entry, and Nova Scotia Entrepreneur. Each stream has specific eligibility requirements based on work experience, job offers, and ties to Nova Scotia.",
      whyThisMatters:
        "This NSNP restructuring affects your provincial nomination application. Verify which stream you now fall under.",
      nextAction:
        "Visit the Nova Scotia Immigration website to confirm your eligibility under the updated stream structure.",
      sourceName: "Nova Scotia Immigration",
      sourceUrl: "https://novascotiaimmigration.com/",
      category: "program_info",
      relevanceToUser: "high",
      fetchedAt: now,
    });
  }

  // PNP specific
  if (
    profile.stream?.includes("pnp") ||
    profile.stream === "nsnp" ||
    profile.stream === "atlantic"
  ) {
    cards.push({
      type: "live_context",
      title: "Provincial Nominee Program Overview",
      summary:
        "PNP allows Canadian provinces and territories to nominate individuals for permanent residence based on local labor market needs. A provincial nomination adds 600 CRS points for Express Entry candidates. Each province sets its own eligibility criteria, streams, and intake processes.",
      whyThisMatters:
        "Your PNP pathway depends on meeting both provincial and federal requirements. Changes to either level can affect your application.",
      nextAction: "Verify your provincial stream requirements and ensure your documents meet both provincial and federal criteria.",
      sourceName: "Provincial Nominees",
      sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
      category: "eligibility",
      relevanceToUser: "high",
      fetchedAt: now,
    });
  }

  // PGWP specific
  if (
    profile.status === "pgwp_holder" ||
    profile.status === "student_visa"
  ) {
    cards.push({
      type: "live_context",
      title: "PGWP Eligibility and Requirements",
      summary:
        "Post Graduation Work Permit eligibility depends on the designated learning institution (DLI), program length, and completion date. PGWP validity is typically 8 months to 3 years depending on program duration. Recent policy changes have introduced language requirements and field of study criteria for some applicants.",
      whyThisMatters:
        profile.status === "pgwp_holder"
          ? "Watch for any PGWP eligibility changes in IRCC notices that could affect renewals or extensions."
          : "Understanding PGWP requirements now helps you plan your transition from student to work permit holder.",
      nextAction: "Check the PGWP page for current eligibility criteria and any recent policy updates.",
      sourceName: "PGWP Eligibility",
      sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/post-graduation-work-permit.html",
      category: "eligibility",
      relevanceToUser: "high",
      fetchedAt: now,
    });
  }

  // Express Entry specific
  if (
    profile.stream === "cec" ||
    profile.stream === "fsw" ||
    profile.stream === "fst" ||
    profile.stream === "ee"
  ) {
    cards.push({
      type: "live_context",
      title: "Express Entry System Overview",
      summary:
        "Express Entry manages applications for CEC, FSW, and FST programs. Candidates are ranked by CRS score and invited through regular draws. Category based selection draws may target specific occupations, French language ability, or provincial nominees.",
      whyThisMatters:
        "Express Entry draw patterns and CRS cutoffs directly determine when you may receive an invitation to apply.",
      nextAction: "Monitor upcoming Express Entry draws and compare your CRS score against recent cutoff trends.",
      sourceName: "Express Entry",
      sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
      category: "program_info",
      relevanceToUser: "high",
      fetchedAt: now,
    });
  }

  // Applied users get a waiting guidance card
  if (profile.has_applied) {
    cards.push({
      type: "live_context",
      title: "While You Wait: Keeping Your Application on Track",
      summary:
        "While your PR application is processing, maintain valid immigration status in Canada, keep your passport and work permits current, report any changes (address, job, family) through the IRCC web form, and do not leave Canada without a valid travel document. Incomplete applications or unreported changes can cause delays.",
      whyThisMatters:
        "This processing time information applies to your current application stage. Keeping everything up to date prevents unnecessary delays.",
      nextAction: "Review your application checklist and confirm all documents remain valid through your expected processing period.",
      sourceName: "IRCC Processing Times",
      sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
      category: "requirement",
      relevanceToUser: "high",
      fetchedAt: now,
    });
  }

  return cards;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const body = await request.json();
  const { province, status, stream, has_applied, noc_code } = body;

  // 1. Determine which sources to fetch based on profile
  const sourceKeys: string[] = ["general"];
  if (status === "pgwp_holder" || status === "student_visa") sourceKeys.push("pgwp");
  if (stream?.includes("pnp") || stream === "nsnp" || stream === "atlantic") sourceKeys.push("pnp");
  if (stream === "cec" || stream === "fsw" || stream === "fst" || stream === "ee") sourceKeys.push("ee");
  if (province?.toLowerCase().includes("nova scotia") || stream === "nsnp") sourceKeys.push("ns");

  const allSources = [
    ...new Map(
      sourceKeys.flatMap((k) => CONTEXT_SOURCES[k] || []).map((s) => [s.url, s])
    ).values(),
  ];

  const cacheKey = getCacheKey(allSources.map((s) => s.url));

  // 2. Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      cards: cached.cards,
      _meta: { ...cached.meta, fromCache: true },
    });
  }

  // 3. Build profile aware fallback cards (always ready)
  const profile = { province: province || "", status: status || "", stream: stream || "", has_applied: !!has_applied };
  const fallbackCards = buildFallbackCards(profile);

  // 4. Attempt to fetch live pages in parallel
  const fetchResults = await Promise.all(allSources.slice(0, 6).map(fetchPage));
  const fetched = fetchResults.filter(Boolean) as { name: string; url: string; text: string }[];

  // 5. If we got live content, use AI to generate personalized cards
  const openai = getOpenAI();
  if (fetched.length > 0 && openai) {
    try {
      const sourceContext = fetched
        .map((f) => `[${f.name}] (${f.url}):\n${f.text.slice(0, 3000)}`)
        .join("\n\n---\n\n");

      const prompt = `You are a Canadian immigration assistant. Generate personalized context cards from LIVE official source pages.

STRICT RULES:
- ONLY use information found in the source text below. Do NOT invent dates, fees, processing times, or draw results.
- If a source doesn't contain specific data, summarize what the page covers and why it matters.
- Every card MUST reference which source it came from.
- Generate EXACTLY 5 cards (or as many as there are sources if fewer than 5).
- Each card must contain real, substantive information. Never return a card with generic filler.

USER PROFILE:
- Province: ${province || "Not specified"}
- Status: ${status || "Not specified"}
- Stream: ${stream || "Not specified"}
- Applied for PR: ${has_applied ? "Yes" : "No"}
- NOC: ${noc_code || "Not specified"}

PERSONALIZATION RULES:
${province?.toLowerCase().includes("nova scotia") ? '- For this Nova Scotia user: highlight NSNP changes, Nova Scotia specific content FIRST' : ""}
${stream?.includes("pnp") || stream === "nsnp" ? '- For this PNP user: "This affects your provincial nomination application"' : ""}
${has_applied ? '- For this user who has applied: "This applies to your current application stage"' : ""}
${status === "pgwp_holder" ? '- For this PGWP holder: "Watch for PGWP eligibility changes in IRCC notices"' : ""}
${stream === "cec" || stream === "fsw" ? "- For this Express Entry user: focus on draw trends, CRS cutoffs, eligibility" : ""}

LIVE SOURCE DATA:
${sourceContext}

Return ONLY valid JSON:
{
  "cards": [
    {
      "type": "live_context",
      "title": "Short descriptive title based on actual source content",
      "summary": "2-3 sentences summarizing what the source page currently says. Only facts from the source.",
      "whyThisMatters": "1 sentence explaining why this is relevant to THIS user specifically",
      "nextAction": "1 short actionable step for the user",
      "sourceName": "Name of the source",
      "sourceUrl": "URL of the source",
      "category": "program_info|eligibility|processing|requirement|news",
      "relevanceToUser": "high|medium|low"
    }
  ]
}

Prioritize cards by relevance to the user profile. Each card must have a real source URL from the fetched data.`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });

      clearTimeout(timeout);

      const content = response.choices[0]?.message?.content;
      if (content) {
        const data = JSON.parse(content);
        const aiCards: LiveCard[] = (data.cards || []).map((c: LiveCard) => ({
          ...c,
          fetchedAt: new Date().toISOString(),
        }));

        if (aiCards.length >= 3) {
          // AI produced enough cards — use them
          const meta = {
            sourcesFetched: fetched.length,
            sourcesAttempted: allSources.length,
            fetchedAt: new Date().toISOString(),
            sourceNames: fetched.map((f) => f.name),
            generatedBy: "ai",
          };

          cache.set(cacheKey, { cards: aiCards, meta, expiresAt: Date.now() + CACHE_TTL_MS });

          return NextResponse.json({ cards: aiCards, _meta: meta });
        }

        // AI returned fewer than 3 cards — merge with fallbacks
        const aiUrls = new Set(aiCards.map((c: LiveCard) => c.sourceUrl));
        const extraFallbacks = fallbackCards.filter((c) => !aiUrls.has(c.sourceUrl));
        const merged = [...aiCards, ...extraFallbacks].slice(0, 6);

        const meta = {
          sourcesFetched: fetched.length,
          sourcesAttempted: allSources.length,
          fetchedAt: new Date().toISOString(),
          sourceNames: fetched.map((f) => f.name),
          generatedBy: "ai_plus_fallback",
        };

        cache.set(cacheKey, { cards: merged, meta, expiresAt: Date.now() + CACHE_TTL_MS });

        return NextResponse.json({ cards: merged, _meta: meta });
      }
    } catch {
      // AI failed — fall through to fallback cards
    }
  }

  // 6. Fallback: return curated cards based on known official page content
  const meta = {
    sourcesFetched: fetched.length,
    sourcesAttempted: allSources.length,
    fetchedAt: new Date().toISOString(),
    sourceNames: fetched.map((f) => f.name),
    generatedBy: "fallback",
  };

  // Cache fallback cards too (shorter TTL: 1 hour)
  cache.set(cacheKey, { cards: fallbackCards, meta, expiresAt: Date.now() + 60 * 60 * 1000 });

  return NextResponse.json({ cards: fallbackCards, _meta: meta });
}

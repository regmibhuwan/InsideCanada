import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAI } from "@/lib/openai";
import { IRCC_SOURCES } from "@/lib/ircc-sources";
import crypto from "crypto";

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "InsideCanada/1.0 (Immigration Tracker)" },
      });
      clearTimeout(timeout);
      if (res.ok) return await res.text();
    } catch (e) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

function parseRSSItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const get = (tag: string) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, "s"));
      return m ? m[1].trim() : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

async function classifyUpdate(title: string, content: string, sourceCategory: string): Promise<{
  category: string;
  urgency: string;
  affected_groups: string[];
  summary: string;
  plain_language: string;
  action_required: string | null;
}> {
  const openai = getOpenAI();
  if (!openai) {
    return {
      category: sourceCategory,
      urgency: "normal",
      affected_groups: ["all"],
      summary: content.slice(0, 300),
      plain_language: content.slice(0, 300),
      action_required: null,
    };
  }

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Classify this Canadian immigration update. Return ONLY valid JSON.

Title: ${title}
Content: ${content.slice(0, 2000)}
Source category hint: ${sourceCategory}

Return JSON:
{
  "category": one of: "express_entry_draw", "processing_time", "policy_change", "pgwp_update", "pnp_update", "aip_update", "eligibility_change", "rule_change", "levels_plan", "category_based_draw", "general_news", "transition_rule", "provincial_draw",
  "urgency": one of: "critical", "high", "normal", "low",
  "affected_groups": array of: "pgwp_holder", "pgwp_applicant", "student_visa", "work_permit", "ee_candidate", "pr_applicant", "pnp_applicant", "aip_applicant", "nsnp_applicant", "oinp_applicant", "bcpnp_applicant", "sinp_applicant", "mpnp_applicant", "maintained_status", "all",
  "summary": "2-3 sentence summary",
  "plain_language": "Simple explanation for someone unfamiliar with immigration terms, 2-3 sentences",
  "action_required": "What should affected users do? null if no action needed"
}`
      }],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return {
      category: sourceCategory,
      urgency: "normal",
      affected_groups: ["all"],
      summary: content.slice(0, 300),
      plain_language: content.slice(0, 300),
      action_required: null,
    };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 503 });
  }

  const results: Array<{ source: string; status: string; newUpdates: number }> = [];

  for (const source of IRCC_SOURCES) {
    try {
      const content = await fetchWithRetry(source.url);
      if (!content) {
        results.push({ source: source.key, status: "fetch_failed", newUpdates: 0 });
        await supabaseAdmin.from("immigration_sources").upsert({
          source_key: source.key,
          source_url: source.url,
          source_name: source.name,
          last_fetched_at: new Date().toISOString(),
          error_count: 1,
          last_error: "Fetch failed",
        }, { onConflict: "source_key" });
        continue;
      }

      const contentHash = hashContent(content);

      const { data: existing } = await supabaseAdmin
        .from("immigration_sources")
        .select("last_content_hash")
        .eq("source_key", source.key)
        .single();

      if (existing?.last_content_hash === contentHash) {
        results.push({ source: source.key, status: "no_change", newUpdates: 0 });
        await supabaseAdmin.from("immigration_sources").upsert({
          source_key: source.key,
          source_url: source.url,
          source_name: source.name,
          last_fetched_at: new Date().toISOString(),
          last_content_hash: contentHash,
          last_successful_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "source_key" });
        continue;
      }

      let newUpdates = 0;

      if (source.type === "rss") {
        const items = parseRSSItems(content).slice(0, 10);
        for (const item of items) {
          const itemHash = hashContent(item.title + item.link);
          const { data: dup } = await supabaseAdmin
            .from("immigration_updates")
            .select("id")
            .eq("content_hash", itemHash)
            .single();

          if (dup) continue;

          const classification = await classifyUpdate(item.title, item.description, source.category);

          await supabaseAdmin.from("immigration_updates").insert({
            title: item.title,
            summary: classification.summary,
            plain_language: classification.plain_language,
            source_url: item.link,
            source_name: source.name,
            is_official: true,
            confidence_score: 95,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            category: classification.category,
            urgency: classification.urgency,
            affected_groups: classification.affected_groups,
            action_required: classification.action_required,
            raw_content: item.description,
            content_hash: itemHash,
          });
          newUpdates++;
        }
      } else {
        const pageText = extractPageText(content);
        const pageHash = hashContent(pageText.slice(0, 4000));

        const { data: dup } = await supabaseAdmin
          .from("immigration_updates")
          .select("id")
          .eq("content_hash", pageHash)
          .single();

        if (!dup) {
          const classification = await classifyUpdate(
            `${source.name} — Page Updated`,
            pageText,
            source.category
          );

          const oldContent = existing?.last_content_hash ? "Previous version on record" : "First capture";

          await supabaseAdmin.from("immigration_updates").insert({
            title: classification.summary.split(".")[0] || `${source.name} Updated`,
            summary: classification.summary,
            plain_language: classification.plain_language,
            source_url: source.url,
            source_name: source.name,
            is_official: true,
            confidence_score: 90,
            category: classification.category,
            urgency: classification.urgency,
            affected_groups: classification.affected_groups,
            action_required: classification.action_required,
            diff_snapshot: `Content changed from: ${oldContent}`,
            raw_content: pageText.slice(0, 5000),
            content_hash: pageHash,
          });
          newUpdates++;
        }
      }

      await supabaseAdmin.from("immigration_sources").upsert({
        source_key: source.key,
        source_url: source.url,
        source_name: source.name,
        last_fetched_at: new Date().toISOString(),
        last_content_hash: contentHash,
        last_successful_at: new Date().toISOString(),
        is_active: true,
        fetch_count: 1,
        error_count: 0,
      }, { onConflict: "source_key" });

      results.push({ source: source.key, status: "success", newUpdates });
    } catch (e: any) {
      results.push({ source: source.key, status: "error", newUpdates: 0 });
      console.error(`Error processing ${source.key}:`, e.message);
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    totalNewUpdates: results.reduce((a, r) => a + r.newUpdates, 0),
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAI } from "@/lib/openai";
import { IRCC_SOURCES, type IRCCSource } from "@/lib/ircc-sources";
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
    } catch {
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
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

function extractLastModified(html: string): string | null {
  const patterns = [
    /Date modified:\s*(\d{4}-\d{2}-\d{2})/i,
    /Last updated:\s*(\d{4}-\d{2}-\d{2})/i,
    /dateModified["']?\s*[:=]\s*["'](\d{4}-\d{2}-\d{2})/i,
    /<time[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

async function classifyUpdate(
  title: string,
  content: string,
  source: IRCCSource,
  previousContent: string | null,
): Promise<{
  category: string;
  urgency: string;
  affected_groups: string[];
  summary: string;
  plain_language: string;
  action_required: string | null;
  province: string | null;
  diff_summary: string | null;
}> {
  const openai = getOpenAI();
  if (!openai) {
    return {
      category: source.category,
      urgency: "normal",
      affected_groups: source.audience,
      summary: content.slice(0, 300),
      plain_language: content.slice(0, 300),
      action_required: null,
      province: source.province || null,
      diff_summary: null,
    };
  }

  try {
    const diffInstruction = previousContent
      ? `\nPREVIOUS VERSION (for diff):\n${previousContent.slice(0, 2000)}\n\nCompare the CURRENT content to the PREVIOUS content. Identify what specifically changed. If nothing meaningful changed, set diff_summary to null.`
      : "";

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Classify this Canadian immigration page update. You MUST only extract information that is present in the source text. Do NOT invent any dates, draw results, fee amounts, processing times, or eligibility criteria that are not explicitly stated in the content.

Source: ${source.name} (${source.reliability})
Source URL: ${source.url}
Source province: ${source.province || "Federal"}
Title: ${title}

CURRENT CONTENT:
${content.slice(0, 3000)}
${diffInstruction}

Return ONLY valid JSON:
{
  "category": one of: "express_entry_draw", "processing_time", "policy_change", "pgwp_update", "pnp_update", "aip_update", "eligibility_change", "rule_change", "levels_plan", "category_based_draw", "general_news", "transition_rule", "provincial_draw",
  "urgency": one of: "critical", "high", "normal", "low",
  "affected_groups": array from: "pgwp_holder", "pgwp_applicant", "student_visa", "work_permit", "ee_candidate", "pr_applicant", "pnp_applicant", "aip_applicant", "nsnp_applicant", "oinp_applicant", "bcpnp_applicant", "sinp_applicant", "mpnp_applicant", "maintained_status", "all",
  "summary": "2-3 sentence factual summary. Only state facts found in the source. If specific numbers/dates appear in the source, include them. Never guess.",
  "plain_language": "Simple 2-3 sentence explanation. Only use information from the source text.",
  "action_required": "What should users do based on this update? null if no action. Only suggest actions supported by the source.",
  "province": "${source.province || "null"} or the province mentioned in content",
  "diff_summary": "What specifically changed from the previous version, or null if no previous version or no meaningful change"
}

CRITICAL: Do NOT hallucinate data. If the source doesn't contain specific numbers, don't make them up.`
      }],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return {
      category: source.category,
      urgency: "normal",
      affected_groups: source.audience,
      summary: content.slice(0, 300),
      plain_language: content.slice(0, 300),
      action_required: null,
      province: source.province || null,
      diff_summary: null,
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
      const rawHtml = await fetchWithRetry(source.url);
      if (!rawHtml) {
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

      const pageText = source.type === "rss" ? rawHtml : extractPageText(rawHtml);
      const contentHash = hashContent(pageText.slice(0, 6000));
      const lastModified = source.type === "page" ? extractLastModified(rawHtml) : null;

      const { data: existing } = await supabaseAdmin
        .from("immigration_sources")
        .select("last_content_hash, last_fetched_at")
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

      // Content has changed — get previous raw content for diff
      let previousContent: string | null = null;
      const { data: prevUpdate } = await supabaseAdmin
        .from("immigration_updates")
        .select("raw_content")
        .eq("source_name", source.name)
        .order("detected_at", { ascending: false })
        .limit(1)
        .single();
      if (prevUpdate) previousContent = prevUpdate.raw_content;

      let newUpdates = 0;

      if (source.type === "rss") {
        const items = parseRSSItems(rawHtml).slice(0, 10);
        for (const item of items) {
          const itemHash = hashContent(item.title + item.link);
          const { data: dup } = await supabaseAdmin
            .from("immigration_updates")
            .select("id")
            .eq("content_hash", itemHash)
            .single();

          if (dup) continue;

          const classification = await classifyUpdate(item.title, item.description, source, null);

          await supabaseAdmin.from("immigration_updates").insert({
            title: item.title,
            summary: classification.summary,
            plain_language: classification.plain_language,
            source_url: item.link,
            source_name: source.name,
            is_official: source.reliability === "official" || source.reliability === "official_provincial",
            confidence_score: source.reliability === "official" ? 100 : source.reliability === "official_provincial" ? 95 : 70,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            category: classification.category,
            urgency: classification.urgency,
            affected_groups: classification.affected_groups,
            action_required: classification.action_required,
            diff_snapshot: null,
            raw_content: item.description?.slice(0, 5000) || "",
            content_hash: itemHash,
            metadata: {
              source_reliability: source.reliability,
              province: classification.province,
              source_audience: source.audience,
              fetched_at: new Date().toISOString(),
            },
          });
          newUpdates++;
        }
      } else {
        const pageHash = hashContent(pageText.slice(0, 6000));

        const { data: dup } = await supabaseAdmin
          .from("immigration_updates")
          .select("id")
          .eq("content_hash", pageHash)
          .single();

        if (!dup) {
          const classification = await classifyUpdate(
            `${source.name} — Updated`,
            pageText,
            source,
            previousContent,
          );

          const title = classification.summary.split(".")[0] || `${source.name} Updated`;

          await supabaseAdmin.from("immigration_updates").insert({
            title: title.length > 200 ? title.slice(0, 200) : title,
            summary: classification.summary,
            plain_language: classification.plain_language,
            source_url: source.url,
            source_name: source.name,
            is_official: source.reliability === "official" || source.reliability === "official_provincial",
            confidence_score: source.reliability === "official" ? 100 : source.reliability === "official_provincial" ? 95 : 70,
            published_at: lastModified ? new Date(lastModified).toISOString() : null,
            category: classification.category,
            urgency: classification.urgency,
            affected_groups: classification.affected_groups,
            action_required: classification.action_required,
            diff_snapshot: classification.diff_summary,
            raw_content: pageText.slice(0, 8000),
            content_hash: pageHash,
            metadata: {
              source_reliability: source.reliability,
              province: classification.province || source.province,
              source_audience: source.audience,
              last_modified: lastModified,
              fetched_at: new Date().toISOString(),
            },
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

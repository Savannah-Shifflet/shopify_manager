import type { Job } from "bullmq";
import { CheerioCrawler, PlaywrightCrawler } from "crawlee";
import db from "~/db.server";
import { CRAWLEE_DEFAULTS, shouldUseBrowser } from "~/services/scrape.service";
import { createSupplier } from "~/services/supplier.service";
import type { SupplierDiscoveryPayload } from "./queues";

interface DiscoveredSupplier {
  name: string;
  website: string;
  contacts: Array<{ email?: string; phone?: string }>;
}

const MAX_CANDIDATE_URLS = 50;

/**
 * Supplier discovery job
 * Scrapes directories, trade sites, and brand dealer pages to surface new leads.
 * Uses Crawlee (PlaywrightCrawler for JS-rendered pages, CheerioCrawler for static).
 */
export async function processSupplierDiscovery(
  job: Job<SupplierDiscoveryPayload>,
) {
  const { shopDomain, keywords = [], triggeredBy } = job.data;

  console.info(
    { shopDomain, keywords, triggeredBy },
    "Starting supplier discovery",
  );

  const config = await db.merchantConfig.findFirst({ where: { shopDomain } });
  const niche = config?.niche?.trim() ?? "";
  const categories = config ? safeParseStringArray(config.categories) : [];

  const queries = buildQueries(niche, categories, keywords);
  if (queries.length === 0) {
    console.warn(
      { shopDomain },
      "Discovery: no niche, categories, or keywords; skipping",
    );
    await job.updateProgress(100);
    return;
  }

  const knownHosts = await loadKnownHostnames(shopDomain);

  const candidateUrls = await searchCandidates(queries);
  await job.updateProgress(40);

  const candidates = await crawlCandidates(candidateUrls);
  await job.updateProgress(80);

  let created = 0;
  for (const candidate of candidates) {
    const host = extractHostname(candidate.website);
    if (!host || knownHosts.has(host)) continue;
    knownHosts.add(host);

    await createSupplier(shopDomain, {
      name: candidate.name,
      website: candidate.website,
      status: "LEAD",
      source: "discovery",
      contacts: JSON.stringify(candidate.contacts),
      categories: JSON.stringify(categories),
    });
    created++;
  }

  if (triggeredBy === "schedule" && created > 0) {
    console.info(
      { shopDomain, created },
      "Discovery: scheduled run produced new leads (notification deferred)",
    );
  }

  console.info(
    {
      shopDomain,
      queries: queries.length,
      candidates: candidates.length,
      created,
    },
    "Discovery complete",
  );
  await job.updateProgress(100);
}

// ─── Query construction ───

function buildQueries(
  niche: string,
  categories: string[],
  keywords: string[],
): string[] {
  const seeds = [niche, ...categories, ...keywords]
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(seeds));
  return unique.flatMap((seed) => [
    `${seed} wholesale suppliers`,
    `${seed} authorized dealers`,
  ]);
}

function safeParseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore malformed JSON
  }
  return [];
}

// ─── Dedup ───

async function loadKnownHostnames(shopDomain: string): Promise<Set<string>> {
  const existing = await db.supplier.findMany({
    where: { shopDomain },
    select: { website: true },
  });
  const hosts = new Set<string>();
  for (const supplier of existing) {
    const host = extractHostname(supplier.website);
    if (host) hosts.add(host);
  }
  return hosts;
}

function extractHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── Search ───

async function searchCandidates(queries: string[]): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (urls.length >= MAX_CANDIDATE_URLS) break;
    const html = await fetchSearchHtml(query);
    if (!html) continue;
    for (const target of parseSearchResults(html)) {
      if (urls.length >= MAX_CANDIDATE_URLS) break;
      if (seen.has(target)) continue;
      seen.add(target);
      urls.push(target);
    }
  }
  return urls;
}

async function fetchSearchHtml(query: string): Promise<string | null> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let html: string | null = null;
  const crawler = new CheerioCrawler({
    ...CRAWLEE_DEFAULTS,
    requestHandler: async ({ body }) => {
      html = typeof body === "string" ? body : Buffer.from(body).toString("utf8");
    },
    failedRequestHandler: ({ request }) => {
      console.warn({ url: request.url }, "Discovery: search fetch failed");
    },
  });
  await crawler.run([url]);
  return html;
}

function parseSearchResults(html: string): string[] {
  const targets: string[] = [];
  // Match anchor hrefs from the DuckDuckGo HTML SERP.
  const hrefPattern = /href="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const resolved = resolveSearchHref(match[1]);
    if (resolved) targets.push(resolved);
  }
  return targets;
}

function resolveSearchHref(href: string): string | null {
  try {
    if (href.startsWith("//")) {
      const u = new URL(`https:${href}`);
      const target = u.searchParams.get("uddg");
      return target ?? null;
    }
    if (/^https?:\/\//i.test(href)) {
      const u = new URL(href);
      // Skip search engine self-links.
      if (u.hostname.endsWith("duckduckgo.com")) {
        const target = u.searchParams.get("uddg");
        return target ?? null;
      }
      return u.toString();
    }
  } catch {
    return null;
  }
  return null;
}

// ─── Candidate crawl ───

async function crawlCandidates(urls: string[]): Promise<DiscoveredSupplier[]> {
  if (urls.length === 0) return [];

  const staticUrls = urls.filter((u) => !shouldUseBrowser(u));
  const browserUrls = urls.filter((u) => shouldUseBrowser(u));

  const results: DiscoveredSupplier[] = [];

  if (staticUrls.length > 0) {
    const crawler = new CheerioCrawler({
      ...CRAWLEE_DEFAULTS,
      requestHandler: async ({ $, request }) => {
        const name =
          $("title").first().text().trim() ||
          extractHostname(request.url) ||
          request.url;
        const contacts = collectContacts((selector) =>
          $(selector)
            .map((_, el) => $(el).attr("href") ?? "")
            .get(),
        );
        results.push({ name, website: request.url, contacts });
      },
      failedRequestHandler: ({ request }) => {
        console.warn(
          { url: request.url },
          "Discovery: candidate fetch failed (static)",
        );
      },
    });
    await crawler.run(staticUrls);
  }

  if (browserUrls.length > 0) {
    const crawler = new PlaywrightCrawler({
      ...CRAWLEE_DEFAULTS,
      requestHandler: async ({ page, request }) => {
        const title = (await page.title()).trim();
        const name = title || extractHostname(request.url) || request.url;
        const hrefs = await page.$$eval(
          "a[href^='mailto:'], a[href^='tel:']",
          (els) => els.map((el) => el.getAttribute("href") ?? ""),
        );
        const contacts = collectContacts(() => hrefs);
        results.push({ name, website: request.url, contacts });
      },
      failedRequestHandler: ({ request }) => {
        console.warn(
          { url: request.url },
          "Discovery: candidate fetch failed (browser)",
        );
      },
    });
    await crawler.run(browserUrls);
  }

  return results;
}

function collectContacts(
  getHrefs: (selector: string) => string[],
): Array<{ email?: string; phone?: string }> {
  const emails = new Set<string>();
  const phones = new Set<string>();

  for (const href of getHrefs("a[href^='mailto:']")) {
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (email) emails.add(email);
  }
  for (const href of getHrefs("a[href^='tel:']")) {
    const phone = href.replace(/^tel:/i, "").trim();
    if (phone) phones.add(phone);
  }

  const contacts: Array<{ email?: string; phone?: string }> = [];
  for (const email of emails) contacts.push({ email });
  for (const phone of phones) contacts.push({ phone });
  return contacts;
}

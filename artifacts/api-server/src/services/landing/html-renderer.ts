import type { LandingDef, LandingSection, LandingFormDef } from "@workspace/api-zod";

// Deterministic LandingDef -> HTML renderer. No AI. The copywriter (Sonnet)
// fills section.content; this turns the structured def into a complete page.

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(content: Record<string, unknown>, key: string, fallback = ""): string {
  const v = content[key];
  return typeof v === "string" ? v : fallback;
}

function arr(content: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = content[key];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function section(inner: string, extra = ""): string {
  return `<section class="py-20 px-6 ${extra}"><div class="max-w-6xl mx-auto">${inner}</div></section>`;
}

function renderHero(c: Record<string, unknown>): string {
  return `<section class="py-28 px-6 text-center text-white" style="background:linear-gradient(135deg,var(--primary),var(--secondary))">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-5xl md:text-6xl font-bold mb-6" style="font-family:var(--font-heading)">${esc(str(c, "title", "Titolo"))}</h1>
      <p class="text-xl opacity-90 mb-8">${esc(str(c, "subtitle"))}</p>
      ${str(c, "ctaLabel") ? `<a href="${esc(str(c, "ctaHref", "#contatti"))}" class="inline-block px-8 py-4 rounded-xl font-semibold text-lg" style="background:var(--accent);color:#111">${esc(str(c, "ctaLabel"))}</a>` : ""}
    </div></section>`;
}

function renderCards(c: Record<string, unknown>, title: string): string {
  const items = arr(c, "items");
  const cards = items
    .map(
      (it) => `<div class="p-6 rounded-2xl border border-gray-200 bg-white">
        <h3 class="text-lg font-semibold mb-2">${esc(it["title"])}</h3>
        <p class="text-gray-600">${esc(it["description"])}</p></div>`,
    )
    .join("");
  return section(
    `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading)">${esc(str(c, "title", title))}</h2>
     <div class="grid md:grid-cols-3 gap-6">${cards}</div>`,
  );
}

function renderTestimonials(c: Record<string, unknown>): string {
  const items = arr(c, "items")
    .map(
      (it) => `<div class="p-6 rounded-2xl bg-gray-50 border border-gray-100">
        <p class="italic text-gray-700 mb-4">“${esc(it["quote"])}”</p>
        <p class="font-semibold">${esc(it["author"])}</p>
        <p class="text-sm text-gray-500">${esc(it["role"])}</p></div>`,
    )
    .join("");
  return section(
    `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading)">${esc(str(c, "title", "Dicono di noi"))}</h2>
     <div class="grid md:grid-cols-3 gap-6">${items}</div>`,
    "bg-gray-50",
  );
}

function renderFaq(c: Record<string, unknown>): string {
  const items = arr(c, "items")
    .map(
      (it) => `<details class="p-5 rounded-xl border border-gray-200 bg-white">
        <summary class="font-semibold cursor-pointer">${esc(it["question"])}</summary>
        <p class="text-gray-600 mt-3">${esc(it["answer"])}</p></details>`,
    )
    .join("");
  return section(
    `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading)">${esc(str(c, "title", "Domande frequenti"))}</h2>
     <div class="max-w-3xl mx-auto space-y-4">${items}</div>`,
  );
}

function renderStats(c: Record<string, unknown>): string {
  const items = arr(c, "items")
    .map(
      (it) => `<div><div class="text-4xl font-bold" style="color:var(--primary)">${esc(it["value"])}</div>
        <div class="text-gray-500">${esc(it["label"])}</div></div>`,
    )
    .join("");
  return section(`<div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">${items}</div>`);
}

function renderCta(c: Record<string, unknown>): string {
  return `<section class="py-20 px-6 text-center text-white" style="background:var(--secondary)">
    <h2 class="text-3xl font-bold mb-6" style="font-family:var(--font-heading)">${esc(str(c, "title", "Pronto a iniziare?"))}</h2>
    <a href="${esc(str(c, "ctaHref", "#contatti"))}" class="inline-block px-8 py-4 rounded-xl font-semibold" style="background:var(--accent);color:#111">${esc(str(c, "ctaLabel", "Contattaci"))}</a>
  </section>`;
}

function renderForm(c: Record<string, unknown>, form?: LandingFormDef): string {
  if (!form) return "";
  const action = `/api/hooks/form/${esc(form.formId)}`;
  const fields = form.fields
    .map((f) => {
      const base = `name="${esc(f.name)}" ${f.required ? "required" : ""} class="w-full px-4 py-3 rounded-lg border border-gray-300"`;
      const input =
        f.type === "textarea"
          ? `<textarea ${base} rows="4"></textarea>`
          : `<input type="${esc(f.type === "phone" ? "tel" : f.type)}" ${base} />`;
      return `<label class="block mb-4"><span class="block text-sm font-medium mb-1">${esc(f.label)}</span>${input}</label>`;
    })
    .join("");
  return `<section id="contatti" class="py-20 px-6 bg-gray-50"><div class="max-w-xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-8" style="font-family:var(--font-heading)">${esc(str(c, "title", "Contattaci"))}</h2>
    <form method="POST" action="${action}">${fields}
      <button type="submit" class="w-full py-3 rounded-lg font-semibold text-white" style="background:var(--primary)">${esc(form.submitLabel)}</button>
    </form></div></section>`;
}

function renderSection(s: LandingSection, forms: LandingFormDef[]): string {
  const c = s.content;
  switch (s.type) {
    case "hero": return renderHero(c);
    case "features": return renderCards(c, "Funzionalità");
    case "benefits": return renderCards(c, "Vantaggi");
    case "testimonials": return renderTestimonials(c);
    case "faq": return renderFaq(c);
    case "stats": return renderStats(c);
    case "cta": return renderCta(c);
    case "contact_form": return renderForm(c, forms[0]);
    case "about":
      return section(
        `<h2 class="text-3xl font-bold mb-6" style="font-family:var(--font-heading)">${esc(str(c, "title", "Chi siamo"))}</h2>
         <p class="text-gray-600 max-w-3xl">${esc(str(c, "body"))}</p>`,
      );
    case "pricing":
    case "gallery":
    case "logos":
    default:
      return section(
        `<h2 class="text-2xl font-bold text-center" style="font-family:var(--font-heading)">${esc(str(c, "title", s.type))}</h2>`,
      );
  }
}

export function renderLandingHtml(def: LandingDef): string {
  const ordered = [...def.sections].sort((a, b) => a.order - b.order);
  const body = ordered.map((s) => renderSection(s, def.forms)).join("\n");
  const t = def.theme;
  const fonts = encodeURIComponent(`${t.headingFont}:wght@400;600;700`) + "&family=" + encodeURIComponent(`${t.bodyFont}:wght@400;500`);

  return `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=${fonts}&display=swap" rel="stylesheet">
<style>:root{--primary:${esc(t.primaryColor)};--secondary:${esc(t.secondaryColor)};--accent:${esc(t.accentColor)};--font-heading:'${esc(t.headingFont)}',sans-serif;--font-body:'${esc(t.bodyFont)}',sans-serif}body{font-family:var(--font-body)}</style>
</head><body>
${body}
</body></html>`;
}

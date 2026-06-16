// Resolves {{a.b.c}} template variables against a workflow run context.
// Addressing is by node id: {{trigger.data.email}}, {{<nodeId>.priority}}.

export type RunContext = Record<string, unknown>;

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function getByPath(ctx: RunContext, path: string): unknown {
  return getPath(ctx, path);
}

function getPath(ctx: RunContext, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);
}

/**
 * Resolve a single template string. If the string is exactly one `{{path}}`,
 * the raw (possibly non-string) value is returned. Otherwise the variables are
 * interpolated into the surrounding text.
 */
export function resolveValue(template: string, ctx: RunContext): unknown {
  const exact = template.match(/^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/);
  if (exact) return getPath(ctx, exact[1]!);

  return template.replace(VAR_RE, (_full, path: string) => {
    const v = getPath(ctx, path);
    if (v === undefined || v === null) return "";
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

/** Resolve every value of a mapping object ({ col: "{{trigger.data.x}}" }). */
export function resolveMapping(
  mapping: Record<string, string>,
  ctx: RunContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, tpl] of Object.entries(mapping)) {
    out[key] = resolveValue(tpl, ctx);
  }
  return out;
}

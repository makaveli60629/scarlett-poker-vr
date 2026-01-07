export async function safeImport(hub, label, path) {
  const line = (s) => hub?.addLine?.(s);

  try {
    const mod = await import(path);
    line(`✅ ${label}: loaded (${path})`);
    return { ok: true, mod };
  } catch (e) {
    line(`⚠️ ${label}: SKIP (${path})`);
    line(`   ↳ ${String(e?.message || e)}`.slice(0, 180));
    return { ok: false, mod: null, error: e };
  }
}

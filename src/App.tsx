import { useEffect, useMemo, useState } from "react";

type Pool = {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  url?: string;
  stablecoin?: boolean | null;
};

const n = (v: number | null | undefined, opts: Intl.NumberFormatOptions = {}) =>
  v == null || Number.isNaN(v) ? "—" : new Intl.NumberFormat(undefined, opts).format(v);

const looksStable = (p: Pool) => {
  const sym = (p.symbol || "").toUpperCase();
  return ["USDC", "USDT", "DAI", "USDB", "FDUSD", "MUSD", "USDE", "PYUSD"].some((s) =>
    sym.includes(s),
  );
};

const score = (p: Pool) => (p.apy ?? 0) * Math.log10(1 + (p.tvlUsd ?? 0));

export default function App() {
  const [raw, setRaw] = useState<Pool[]>([]);
  const [q, setQ] = useState("");
  const [minTVL, setMinTVL] = useState(50_000);
  const [stableOnly, setStableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "apy" | "tvl">("score");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
        const j = await r.json();
        setRaw(j?.data ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Load error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const basePools = useMemo(() => raw.filter((p) => p.chain === "Base"), [raw]);

  const pools = useMemo(() => {
    const arr = basePools
      .filter((p) => (p.tvlUsd ?? 0) >= minTVL)
      .filter((p) => (stableOnly ? (p.stablecoin ?? looksStable(p)) : true))
      .filter((p) =>
        q ? (p.project + " " + (p.symbol ?? "")).toLowerCase().includes(q.toLowerCase()) : true,
      )
      .map((p) => ({ ...p, _score: score(p) } as Pool & { _score: number }));

    arr.sort((a: any, b: any) => {
      if (sortBy === "apy") return (b.apy ?? -1) - (a.apy ?? -1);
      if (sortBy === "tvl") return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
      return (b._score ?? 0) - (a._score ?? 0);
    });

    return arr.slice(0, limit);
  }, [basePools, q, minTVL, stableOnly, sortBy, limit]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Base DeFi APR Finder
          </h1>
          <p className="mt-3 text-sm text-slate-400 md:text-base">
            Live yield data for Base chain pools, sourced directly from DefiLlama.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/40">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</span>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="protocol or symbol…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sort by</span>
              <select
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="score">Smart score</option>
                <option value="apy">APY</option>
                <option value="tvl">TVL</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Min TVL (USD)</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                value={minTVL}
                onChange={(e) => setMinTVL(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Show</span>
              <select
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value) || limit)}
              >
                {[10, 20, 30, 50, 100].map((x) => (
                  <option key={x} value={x}>
                    Top {x}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filters</span>
              <button
                type="button"
                onClick={() => setStableOnly((v) => !v)}
                className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 ${
                  stableOnly
                    ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:border-cyan-400/30 hover:text-cyan-200"
                }`}
              >
                {stableOnly ? "Stable only ✓" : "Stable only ✗"}
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</span>
              <button
                type="button"
                onClick={() => location.reload()}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-500/80 px-3 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Refresh data
              </button>
            </div>
          </div>
        </section>

        {err && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Error: {err}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Loading pools…
          </div>
        )}
        {!loading && pools.length === 0 && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            No pools match your filters.
          </div>
        )}

        <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {pools.map((p, i) => {
            const symbols = (p.symbol || "")
              .split(/[\s,\/\-]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            const stable = p.stablecoin ?? looksStable(p);
            const poolUrl =
              p.url ?? `https://defillama.com/yields/pool/${encodeURIComponent(p.pool ?? "")}`;
            const llamaSearch = `https://defillama.com/yields?chain=Base&search=${encodeURIComponent(p.project)}`;

            return (
              <article
                key={p.pool}
                className="group flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-cyan-500/30"
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white transition group-hover:text-cyan-200">
                        {p.project}
                      </h3>
                      <span className="rounded-full bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-300">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">
                        {p.chain}
                      </span>
                      {symbols.map((token) => (
                        <span
                          key={`${p.pool}-${token}`}
                          className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-200"
                        >
                          {token}
                        </span>
                      ))}
                      {stable && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200">
                          Stable-ish
                        </span>
                      )}
                      {(p.apyReward ?? 0) > 0 && (
                        <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-medium text-purple-200">
                          Rewards
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">APY (total)</p>
                      <p className="mt-2 text-2xl font-semibold text-cyan-300">
                        {n(p.apy ?? 0, { maximumFractionDigits: 2 })}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TVL</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-100">
                        ${n(p.tvlUsd ?? 0, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    {p.apyBase != null && (
                      <div
                        className={`rounded-xl border border-slate-800 bg-slate-950/50 p-4 ${
                          p.apyReward == null ? "col-span-2" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base APY</p>
                        <p className="mt-2 text-lg font-semibold text-slate-100">
                          {n(p.apyBase ?? 0, { maximumFractionDigits: 2 })}%
                        </p>
                      </div>
                    )}
                    {p.apyReward != null && (
                      <div
                        className={`rounded-xl border border-slate-800 bg-slate-950/50 p-4 ${
                          p.apyBase == null ? "col-span-2" : ""
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Reward APY
                        </p>
                        <p className="mt-2 text-lg font-semibold text-purple-200">
                          {n(p.apyReward ?? 0, { maximumFractionDigits: 2 })}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/80 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    href={poolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Go to pool
                  </a>
                  <a
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
                    href={llamaSearch}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    On DefiLlama
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

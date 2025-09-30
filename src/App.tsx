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
  return ["USDC","USDT","DAI","USDB","FDUSD","MUSD","USDE","PYUSD"].some(s => sym.includes(s));
};

const score = (p: Pool) => (p.apy ?? 0) * Math.log10(1 + (p.tvlUsd ?? 0));

export default function App() {
  const [raw, setRaw] = useState<Pool[]>([]);
  const [q, setQ] = useState("");
  const [minTVL, setMinTVL] = useState(50_000);
  const [stableOnly, setStableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"score"|"apy"|"tvl">("score");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
        const j = await r.json();
        setRaw(j?.data ?? []);
      } catch (e:any) { setErr(e?.message ?? "Load error"); }
      finally { setLoading(false); }
    })();
  }, []);

  const basePools = useMemo(() => raw.filter(p => p.chain === "Base"), [raw]);

  const pools = useMemo(() => {
    const arr = basePools
      .filter(p => (p.tvlUsd ?? 0) >= minTVL)
      .filter(p => stableOnly ? (p.stablecoin ?? looksStable(p)) : true)
      .filter(p => q ? (p.project + " " + p.symbol).toLowerCase().includes(q.toLowerCase()) : true)
      .map(p => ({...p, _score: score(p)} as Pool & {_score:number}));

    arr.sort((a:any,b:any) => {
      if (sortBy==="apy") return (b.apy ?? -1) - (a.apy ?? -1);
      if (sortBy==="tvl") return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
      return (b._score ?? 0) - (a._score ?? 0);
    });

    return arr.slice(0, limit);
  }, [basePools,q,minTVL,stableOnly,sortBy,limit]);

  return (
    <div className="container">
      <h1 className="title">Base DeFi APR Finder</h1>

      {/* Панель управления */}
      <div className="controls">
        <div>
          <div className="label">Search</div>
          <input className="input" placeholder="protocol or symbol…" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div>
          <div className="label">Sort by</div>
          <select className="select" value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
            <option value="score">Smart score</option>
            <option value="apy">APY</option>
            <option value="tvl">TVL</option>
          </select>
        </div>
        <div>
          <div className="label">Min TVL (USD)</div>
          <input className="input" type="number" value={minTVL} onChange={e=>setMinTVL(Number(e.target.value))}/>
        </div>
        <div>
          <div className="label">Show</div>
          <select className="select" value={String(limit)} onChange={e=>setLimit(Number(e.target.value))}>
            {[10,20,30,50,100].map(x => <option key={x} value={x}>Top {x}</option>)}
          </select>
        </div>
        <div>
          <div className="label">Filters</div>
          <button className="btn ghost" onClick={()=>setStableOnly(v=>!v)}>
            {stableOnly ? "Stable only ✓" : "Stable only ✗"}
          </button>
        </div>
        <div style={{alignSelf:"end"}}>
          <button className="btn primary" onClick={()=>location.reload()}>Refresh</button>
        </div>
      </div>

      {/* Состояния */}
      {err && <div className="muted">Error: {err}</div>}
      {loading && <div className="muted">Loading pools…</div>}
      {!loading && pools.length===0 && <div className="muted">No pools match your filters.</div>}

      {/* Карточки */}
      <div className="grid">
        {pools.map((p, i)=>(
          <div key={p.pool} className="card">
            <h3>{p.project}</h3>
            <div className="chips">
              <span className="chip">{p.chain}</span>
              <span className="chip">{p.symbol}</span>
              {(p.apyReward ?? 0) > 0 && <span className="chip">Rewards</span>}
              {(p.stablecoin ?? looksStable(p)) && <span className="chip">Stable-ish</span>}
              <span className="chip">#{i+1}</span>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="k">APY (total)</div>
                <div className="v">{n(p.apy ?? 0, {maximumFractionDigits:2})}%</div>
              </div>
              <div className="stat">
                <div className="k">TVL</div>
                <div className="v">${n(p.tvlUsd ?? 0, {maximumFractionDigits:0})}</div>
              </div>
              <div className="stat">
                <div className="k">Base</div>
                <div className="v">{n(p.apyBase ?? 0, {maximumFractionDigits:2})}%</div>
              </div>
              <div className="stat">
                <div className="k">Rewards</div>
                <div className="v green">{n(p.apyReward ?? 0, {maximumFractionDigits:2})}%</div>
              </div>
            </div>

            <div className="row">
              <a className="link btn primary"
                 href={p.url ?? `https://defillama.com/yields/pool/${encodeURIComponent(p.pool)}`}
                 target="_blank" rel="noopener noreferrer">
                Go to pool
              </a>
              <a className="link btn"
                 href={`https://defillama.com/yields?chain=Base&search=${encodeURIComponent(p.project)}`}
                 target="_blank" rel="noopener noreferrer">

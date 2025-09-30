import { useEffect, useState } from "react";

type Pool = {
  apy: number | null;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  url?: string;
};

export default function App() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPools() {
      try {
        const res = await fetch("https://yields.llama.fi/pools");
        const data = await res.json();
        const basePools = data.data.filter((p: Pool) => p.chain === "Base");
        setPools(basePools.slice(0, 10)); // топ-10 пулов
      } catch (err) {
        console.error("Ошибка загрузки:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPools();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>Base DeFi APR Finder</h1>
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Pool</th>
            <th>Project</th>
            <th>APR</th>
            <th>TVL (USD)</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool, i) => (
            <tr key={i}>
              <td>{pool.symbol}</td>
              <td>{pool.project}</td>
              <td>{pool.apy ? pool.apy.toFixed(2) + "%" : "-"}</td>
              <td>{pool.tvlUsd ? `$${pool.tvlUsd.toLocaleString()}` : "-"}</td>
              <td>
                {pool.url ? (
                  <a href={pool.url} target="_blank" rel="noreferrer">
                    Go
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

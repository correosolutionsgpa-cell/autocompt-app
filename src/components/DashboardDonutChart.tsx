import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// Extracted out of App.tsx 2026-08-30 so recharts (only ever used for this
// one dashboard donut) loads on demand instead of shipping in the main
// bundle for every account, every screen — see the code-split comment
// above the lazy view imports near the top of App.tsx for the same reasoning.
export default function DashboardDonutChart({
  donutChartData,
  darkMode,
}: {
  donutChartData: { color: string; value: number; [key: string]: any }[];
  darkMode: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={208}>
      <PieChart width={250} height={208}>
        <defs>
          {donutChartData.map((entry, index) => (
            <filter key={`glow-${index}`} id={`glow-${index}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>
        <Pie
          data={donutChartData}
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="85%"
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {donutChartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke={darkMode ? entry.color : "none"}
              strokeWidth={darkMode ? 0.5 : 0}
              style={darkMode ? { filter: `drop-shadow(0 0 6px ${entry.color}88)` } : {}}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [
            `${parseFloat(value).toFixed(2)} $`,
            "Total",
          ]}
          contentStyle={{
            background: darkMode ? "#18181b" : "#ffffff",
            border: darkMode
              ? "1px solid #27272a"
              : "1px solid #e2e8f0",
            borderRadius: "16px",
            fontSize: "9px",
            fontFamily: "sans-serif",
            fontWeight: "bold",
            color: darkMode ? "#f4f4f5" : "#0f172a",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AttendanceChartProps {
  present: number;
  absent: number;
  onLeave: number;
  halfDay: number;
}

export function AttendanceChart({ present, absent, onLeave, halfDay }: AttendanceChartProps) {
  const chartData = [
    { label: "Present", count: present, fill: "var(--chart-1)" },
    { label: "Half Day", count: halfDay, fill: "var(--chart-4)" },
    { label: "On Leave", count: onLeave, fill: "var(--chart-3)" },
    { label: "Absent", count: absent, fill: "var(--chart-2)" },
  ];

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--foreground)",
            }}
          />
          <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
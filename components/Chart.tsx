"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

interface AreaChartProps {
  data: any[];
  dataKey: string;
  categories: string[];
  colors: string[];
  height?: number;
}

export const GradientAreaChart = ({ data, dataKey, categories, colors, height = 300 }: AreaChartProps) => {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {categories.map((cat, index) => (
              <linearGradient key={cat} id={`color${cat}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[index]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis 
            dataKey={dataKey} 
            stroke="#9CA3AF" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#9CA3AF" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px" }}
            itemStyle={{ color: "#F3F4F6" }}
          />
          {categories.map((cat, index) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={colors[index]}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#color${cat})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DonutChart = ({ data, height = 300 }: { data: any[]; height?: number }) => {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px" }}
            itemStyle={{ color: "#F3F4F6" }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

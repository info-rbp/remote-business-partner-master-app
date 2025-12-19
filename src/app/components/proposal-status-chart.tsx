
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Draft', value: 400 },
  { name: 'Sent', value: 300 },
  { name: 'Accepted', value: 300 },
  { name: 'Rejected', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function ProposalStatusChart() {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-2">Proposal Status</h2>
      <PieChart width={400} height={400}>
        <Pie
          data={data}
          cx={200}
          cy={200}
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

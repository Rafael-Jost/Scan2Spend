import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

// const data = [
//   { name: 'Alimentação', value: 400, fill: '#E8684A' },
//   { name: 'Bebidas', value: 300, fill: '#7CC0FF' },
//   { name: 'Higiene Pessoal', value: 300, fill: '#9270CA' },
//   { name: 'Lanches & Conveniência', value: 200, fill: '#FF9D4D' },
//   { name: 'Limpeza', value: 278, fill: '#6DC8A3' },
//   { name: 'Outros', value: 189, fill: '#9CA3AF' },
//   { name: 'Pets', value: 239, fill: '#F6BD16' },
//   { name: 'Utilidades', value: 349, fill: '#5B8FF9' }
// ];

export default function GrafDespesasCategorias({ dados, buscarDespesasCategorias}) {
  const MyPie = () => (
    <Pie data={dados} dataKey="value" nameKey="name" outerRadius="80%" innerRadius="60%" isAnimationActive={false} />
  );
  return (
      <>

        <PieChart responsive style={{ height: 'calc(100% - 20px)', width: '33%', flex: '1 1 200px', aspectRatio: 1 }}>
          <MyPie />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
          <Label position="center" fill="#ffffff">
            Despesas por Categoria
          </Label>
          <RechartsDevtools />
        </PieChart>
      </>
  );
}
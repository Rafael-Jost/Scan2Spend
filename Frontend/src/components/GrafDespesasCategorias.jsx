import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';


const fills = {
    'Alimentação': '#f89c71',
    'Bebidas': '#60a5fa',
    'Higiene Pessoal': '#a78bfa',
    'Lanches & Conveniência': '#fbbf24',
    'Limpeza': '#34d3ab',
    'Outros': '#94a3b8',
    'Pets': '#b39c78',
    'Utilidades': '#fa9be2'
  };

  const getFill = (dados) => {
      return( dados.map(dado => ({
      ...dado,
      fill: fills[dado.categoria] || '#9CA3AF'
    })));
  };

export default function GrafDespesasCategorias({ dados, buscarDespesasCategorias}) {
  const MyPie = () => (
    <Pie data={dados} dataKey="despesa" nameKey="categoria" outerRadius="80%" innerRadius="60%" isAnimationActive={false} />
  );

  dados = getFill(dados);

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
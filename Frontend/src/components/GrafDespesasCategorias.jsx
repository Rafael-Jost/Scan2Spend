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

export default function GrafDespesasCategorias({ dados, buscarDespesasCategorias, setTipoGrafDespesasCategorias }) {
  const MyPie = () => (
    <Pie data={dados} dataKey="despesa" nameKey="categoria" outerRadius="80%" innerRadius="60%" isAnimationActive={false}>
      <Label position="center" fill="#ffffff">Despesas por Categoria</Label>
    </Pie>
  );

  dados = getFill(dados);

  return (
      <>
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Gráfico de Despesas por Categoria</h2>
          <button onClick={() => setTipoGrafDespesasCategorias('periodo')} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            Mudar Visualização
          </button>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
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
            <RechartsDevtools />
          </PieChart>
        </ResponsiveContainer>
      </div>
      </>
  );
}
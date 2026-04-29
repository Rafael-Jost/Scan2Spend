import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

function GrafDespesasCategoriasPeriodo({ dados, buscarDespesasCategoriasPeriodo}) {
  // #region Sample data
  const data = [
    {
      name: 'Page A',
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: 'Page B',
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: 'Page C',
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: 'Page D',
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: 'Page E',
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: 'Page F',
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: 'Page G',
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '875px', margin: '0 auto' }}>
      <h2>Gráfico de Despesas por Categoria</h2>
      <AreaChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={dados}
      margin={{
        top: 20,
        right: 0,
        left: 0,
        bottom: 0,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="data" niceTicks="snap125" />
      <YAxis width="auto" niceTicks="snap125" />
      <Tooltip />
      {/* 'Alimentação': '#f89c71',
    'Bebidas': '#60a5fa',
    'Higiene Pessoal': '#a78bfa',
    'Lanches & Conveniência': '#fbbf24',
    'Limpeza': '#34d3ab',
    'Outros': '#94a3b8',
    'Pets': '#b39c78',
    'Utilidades': '#fa9be2' */}
      <Area type="monotone" dataKey="Alimentação" stackId="1" stroke="#8884d8" fill="#8884d8" />
      <Area type="monotone" dataKey="Bebidas" stackId="1" stroke="#60a5fa" fill="#60a5fa" />
      <Area type="monotone" dataKey="Higiene Pessoal" stackId="1" stroke="#a78bfa" fill="#a78bfa" />
      <Area type="monotone" dataKey="Lanches & Conveniência" stackId="1" stroke="#fbbf24" fill="#fbbf24" />
      <Area type="monotone" dataKey="Limpeza" stackId="1" stroke="#34d3ab" fill="#34d3ab" />
      <Area type="monotone" dataKey="Outros" stackId="1" stroke="#94a3b8" fill="#94a3b8" />
      <Area type="monotone" dataKey="Pets" stackId="1" stroke="#b39c78" fill="#b39c78" />
      <Area type="monotone" dataKey="Utilidades" stackId="1" stroke="#fa9be2" fill="#fa9be2" />
      <RechartsDevtools />
    </AreaChart>
    </div>
  );
}

export default GrafDespesasCategoriasPeriodo;
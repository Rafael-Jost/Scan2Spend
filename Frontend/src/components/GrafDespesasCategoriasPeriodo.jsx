import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

function GrafDespesasCategoriasPeriodo({ dados, buscarDespesasCategoriasPeriodo, setTipoGrafDespesasCategorias}) {

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Gráfico de Despesas por Categoria</h2>
          <button onClick={() => setTipoGrafDespesasCategorias('default')} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            Mudar Visualização
          </button>
        </div>
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
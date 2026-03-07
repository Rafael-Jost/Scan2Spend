import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function GrafDespesasTotais({ dados }) {
  return (
    <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      <h2>Gráfico de Despesas Totais</h2>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={dados}
          margin={{
              top: 20,
              right: 30,
              left: 0,
              bottom: 0,
          }}
          >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="data" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="despesa" stroke="#8884d8" fill="#8884d8" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GrafDespesasTotais;
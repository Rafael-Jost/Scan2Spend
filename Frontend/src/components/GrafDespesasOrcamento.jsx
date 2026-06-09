import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';



const GrafDespesasOrcamento = ({ orcamentoMensal, despesasTotais }) => {

    const insereOrcamentoNasDespesas = (despesas, orcamento) => {
        return despesas.map(despesa => ({ ...despesa, orcamento: orcamento }));
    }

    const data = insereOrcamentoNasDespesas(despesasTotais, orcamentoMensal);

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Despesas VS Orçamento</h2>
        </div>
    <ComposedChart
      style={{ width: '100%', maxWidth: '640px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 20,
        right: 0,
        bottom: 0,
        left: 0,
      }}
    >
      <CartesianGrid stroke="#f5f5f51c" />
      <XAxis dataKey="data" scale="band" />
      <YAxis label={{ value: 'R$', angle: -90, position: 'insideLeft' }} width="auto" />
      <Tooltip />
      <Legend />
      <Bar dataKey="despesa" name="Despesas" barSize={70} fill="#4ab0d8" />
      <Line type="monotone" dataKey="orcamento" name="Orçamento Mensal" stroke="#ef4444" strokeWidth={3} />
      <RechartsDevtools />
    </ComposedChart>
    </div>
  );
};

export default GrafDespesasOrcamento;
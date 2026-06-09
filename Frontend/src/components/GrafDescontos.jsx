import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';


// #endregion
const GrafDescontos = ({ dados = [] }) => {
  const chartData = Array.isArray(dados) ? dados : [];

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Descontos</h2>
        </div>
    <BarChart
      style={{ width: '100%', maxWidth: '650px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={chartData}
      margin={{
        top: 5,
        right: 0,
        left: 0,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="data" />
      <YAxis width="auto" />
      <Tooltip />
      <Bar dataKey="desconto" name="Descontos" fill="#4ab0d8" activeBar={{ fill: '#66d4ca', stroke: '#4ab0d8' }} radius={[10, 10, 0, 0]} />
      <RechartsDevtools />
    </BarChart>
    </div>
  );
};

export default GrafDescontos;
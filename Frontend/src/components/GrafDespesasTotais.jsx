import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function GrafDespesasTotais({ dados, buscarDespesasTotais}) {

  async function filtraGrafico(opcao){

    var dt_inicio;
    var dt_fim;
    var tipo_agrupamento; 

    if(opcao == 'EA'){
      dt_inicio = '01/01/' + new Date().getFullYear();
      dt_fim = '31/12/'+ new Date().getFullYear();
      tipo_agrupamento = 'MES';
    }else if(opcao == 'EM'){
      dt_inicio = '01/' + String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();
      dt_fim = String(new Date().getDate()).padStart(2, '0') + '/' + String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();
      tipo_agrupamento = 'DIA';
    }else if(opcao == 'UM'){
      const dataAtual = new Date();
      const dataSeisMesesAtras = new Date();
      dataSeisMesesAtras.setMonth(dataAtual.getMonth() - 6);
      dt_inicio = String(dataSeisMesesAtras.getDate()).padStart(2, '0') + '/' + String(dataSeisMesesAtras.getMonth() + 1).padStart(2, '0') + '/' + dataSeisMesesAtras.getFullYear();
      dt_fim = String(dataAtual.getDate()).padStart(2, '0') + '/' + String(dataAtual.getMonth() + 1).padStart(2, '0') + '/' + dataAtual.getFullYear();
      tipo_agrupamento = 'MES';
    }else if(opcao == 'UA'){
      const dataAtual = new Date();
      const dataDozeMesesAtras = new Date();
      dataDozeMesesAtras.setMonth(dataAtual.getMonth() - 12);
      dt_inicio = String(dataDozeMesesAtras.getDate()).padStart(2, '0') + '/' + String(dataDozeMesesAtras.getMonth() + 1).padStart(2, '0') + '/' + dataDozeMesesAtras.getFullYear();
      dt_fim = String(dataAtual.getDate()).padStart(2, '0') + '/' + String(dataAtual.getMonth() + 1).padStart(2, '0') + '/' + dataAtual.getFullYear();
      tipo_agrupamento = 'MES';
    }

    await buscarDespesasTotais(dt_inicio, dt_fim, tipo_agrupamento);

  }

  return (
    <div style={{ width: '100%', maxWidth: '875px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>Gráfico de Despesas Totais</h2> 
        <select id="filtro-despesas-totais" defaultValue={"EA"} onChange={(e) => filtraGrafico(e.target.value)}>
            <option value="EA">Este Ano</option>
            <option value="EM">Este Mes</option>
            <option value="UM">Últimos 6 Meses</option> 
            <option value="UA">Últimos 12 Meses</option>
        </select>
      </div>
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
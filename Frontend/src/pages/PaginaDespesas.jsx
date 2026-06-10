import { useState } from 'react'
import BotaoPerfil from '../components/BotaoPerfil.jsx'
import BotaoSimples from '../components/BotaoSimples.jsx'
import PopUpDeInformacoes from '../components/PopUpDeInformacoes.jsx'
import PerfilDespesas from '../components/PerfilDespesas.jsx'
import GrafDespesasTotais from '../components/GrafDespesasTotais.jsx'
import GrafDespesasCategorias from '../components/GrafDespesasCategorias.jsx'
import GrafDespesasCategoriasPeriodo from '../components/GrafDespesasCategoriasPeriodo.jsx'
import GrafDespesasOrcamento from '../components/GrafDespesasOrcamento.jsx'
import GrafDescontos from '../components/GrafDescontos.jsx'
import parseRecibo from '../utils/parseRecibo.js'
import paginaInicialIcon from '../assets/qr-code.png'

export default function PaginaDespesas({
  textoRecibo,
  setTextoRecibo,
  popupAberto,
  setPopupAberto,
  setEstadoTela,
  atualizarGraficos,
  notasFiscais,
  nomeUsuario,
  sobrenomeUsuario,
  emailUsuario,
  orcamentoMensal,
  logoutUsuario,
  carregaUsuario,
  insights,
  topProdutos,
  dadosPerfilDespesas,
  despesasTotais,
  despesasCategorias,
  despesasCategoriasPeriodo,
  descontos,
  buscarDespesasTotais,
  buscarDespesasCategorias,
  buscarDespesasCategoriasPeriodo
}) {
  const [tipoGrafDespesasCategorias, setTipoGrafDespesasCategorias] = useState('default') // 'default' para gráfico de pizza, 'periodo' para gráfico de linhas ao longo do tempo
  const [perfilDespesas, setPerfilDespesas] = useState(true)

  return (
    <>
      <BotaoPerfil
        notasFiscais={notasFiscais}
        nomeUsuario={nomeUsuario}
        sobrenomeUsuario={sobrenomeUsuario}
        emailUsuario={emailUsuario}
        orcamentoMensal={orcamentoMensal}
        logoutUsuario={logoutUsuario}
        setPopupAberto={setPopupAberto}
        setTextoRecibo={setTextoRecibo}
        carregaUsuario={carregaUsuario}
      />
      <div className="pagina-despesas">
        <BotaoSimples className="botao-menu pagina-inicial" icone={paginaInicialIcon} onClick={() => {
          setEstadoTela('inicial')
          atualizarGraficos()
        }}></BotaoSimples>
        <PopUpDeInformacoes conteudo={parseRecibo(textoRecibo)} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos} />
        <div className="tab-switch">
          <button
            className={perfilDespesas ? 'tab-btn tab-btn--active' : 'tab-btn'}
            onClick={() => setPerfilDespesas(true)}
          >
            Perfil de Despesas
          </button>
          <button
            className={perfilDespesas ? 'tab-btn' : 'tab-btn tab-btn--active'}
            onClick={() => setPerfilDespesas(false)}
          >
            Minhas Despesas
          </button>
        </div>
        {perfilDespesas ? (
          <>
            <PerfilDespesas nomeUsuario={nomeUsuario} insights={insights} topProdutos={topProdutos} dadosPerfilDespesas={dadosPerfilDespesas} />
          </>
        ) : (
          <>
            <div id="graficos-row-1">
              <GrafDespesasTotais dados={despesasTotais} buscarDespesasTotais={buscarDespesasTotais} />
              {tipoGrafDespesasCategorias === 'default' ?
                <GrafDespesasCategorias dados={despesasCategorias} buscarDespesasCategorias={buscarDespesasCategorias} setTipoGrafDespesasCategorias={setTipoGrafDespesasCategorias} />
                : ''}
              {tipoGrafDespesasCategorias === 'periodo' ?
                <GrafDespesasCategoriasPeriodo dados={despesasCategoriasPeriodo} buscarDespesasCategoriasPeriodo={buscarDespesasCategoriasPeriodo} setTipoGrafDespesasCategorias={setTipoGrafDespesasCategorias} />
                : ''}
            </div>
            <div id="graficos-row-2">
              <GrafDespesasOrcamento orcamentoMensal={orcamentoMensal} despesasTotais={despesasTotais} />
              <GrafDescontos dados={descontos} />
            </div>
          </>
        )}
      </div>
    </>
  )
}

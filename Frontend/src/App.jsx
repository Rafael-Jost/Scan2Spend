import { useEffect, useState, useCallback } from 'react'
import QrScanner from './components/QrScanner.jsx'
import CardEdicao from './components/CardsEdicao.jsx'
import CardSemLink from './components/CardSemLink.jsx'
import PopUpDeInformacoes from './components/PopUpDeInformacoes.jsx'
import BotaoSimples from './components/BotaoSimples.jsx'
import parseRecibo from './utils/parseRecibo.js'
import despesasIcon from './assets/despesas.png'
import paginaInicialIcon from './assets/qr-code.png'
import GrafDespesasTotais from './components/GrafDespesasTotais.jsx'
import GrafDespesasCategorias from './components/GrafDespesasCategorias.jsx'
import Login from './components/Login.jsx'
import './App.css'

function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(false)
  const [textoMensagem, setTextoMensagem] = useState(null)
  const [classeMensagem, setClasseMensagem] = useState('oculto')
  const [textoRecibo, setTextoRecibo] = useState(null)
  const [popupAberto, setPopupAberto] = useState(false)
  const [exibirPaginaInicial, setExibirPaginaInicial] = useState(true)
  const [exibirPaginaDespesas, setExibirPaginaDespesas] = useState(false)
  const [despesasTotais, setDespesasTotais] = useState([])
  const [despesasCategorias, setDespesasCategorias] = useState([])
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [usuarioId, setUsuarioId] = useState(null)

  const loginUsuario = useCallback((dadosUsuario) => {
    console.log("Dados do usuário após login:", dadosUsuario.nome, dadosUsuario.sobrenome, dadosUsuario.email, dadosUsuario.usuario_id);
    setUsuarioLogado(true)
    setNomeUsuario(dadosUsuario.nome + ' ' + dadosUsuario.sobrenome)
    setEmailUsuario(dadosUsuario.email)
    setUsuarioId(dadosUsuario.usuario_id)
  }, [])

  const buscarDespesasTotais = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {

    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }
    console.log("Buscando despesas totais...");
    const params = new URLSearchParams({ 
      usuario_id: usuarioId, 
      dt_inicio: dt_inicio, 
      dt_fim: dt_fim, 
      tipo_agrupamento: tipo_agrupamento 
    }).toString();
    
    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/despesas/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    
    if (response.ok) {
      const data = await response.json();
      setDespesasTotais(data);
    } else {
      console.error('Erro ao buscar dados.');
    }
  }, [usuarioId]);


  const buscarDespesasCategorias = useCallback(async (dt_inicio, dt_fim) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
    }
    console.log("Buscando despesas totais...");
    const params = new URLSearchParams({ 
      usuario_id: usuarioId, 
      dt_inicio: dt_inicio, 
      dt_fim: dt_fim
    }).toString();
    
    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/despesas/categorias?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    
    if (response.ok) {
      const data = await response.json();
      setDespesasCategorias(data);
    } else {
      console.error('Erro ao buscar dados.');
    }

  }, [usuarioId])


  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return

    if (exibirPaginaDespesas) {
      root.classList.add('modo-despesas')
    } else {
      root.classList.remove('modo-despesas')
    }

    return () => {
      root.classList.remove('modo-despesas')
    }
  }, [exibirPaginaDespesas])



  const AnalisarRecibo = async (url) => {
    if (!url) {
      console.error("URL vazia/undefined em AnalisarRecibo");
      return;
    }
    const formData = new FormData()
      formData.append('QRurl', url)

      setClasseMensagem("carregando")
      setTextoMensagem("Analisando...")

      const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/analisar_nf/?QRurl=${encodeURIComponent(url)}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
          setTextoRecibo(data.text)
          setClasseMensagem("sucesso")
          setTextoMensagem("Análise Completa!")

        setTimeout(() => {
            setPopupAberto(true)
          }
      , 1000)
      }else {
          setTextoRecibo("Erro ao analisar recibo")
          setClasseMensagem("erro")
          setTextoMensagem("Erro ao analisar")
      }
  }

  const atualizarGraficos = useCallback(() => {
    buscarDespesasTotais();
    buscarDespesasCategorias();
  }, [buscarDespesasTotais, buscarDespesasCategorias])

  useEffect(() => {
    if (!usuarioLogado){ return }
    atualizarGraficos();
  }, [atualizarGraficos, usuarioLogado])

  if (!usuarioLogado) {
    return <Login funcaoLogin={loginUsuario} />
  }

  if (exibirPaginaInicial) {
    return (
      <>
        <BotaoSimples id="botao-despesas" icone={despesasIcon} onClick={() => {
          setExibirPaginaInicial(false)
          setExibirPaginaDespesas(true)
        }}></BotaoSimples>
        <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." />
        <QrScanner funcAnalisarRecibo={AnalisarRecibo} />
        <PopUpDeInformacoes usuarioId={usuarioId} conteudo={<CardEdicao json={parseRecibo(textoRecibo)}  />} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos}/>
        <BotaoSimples id="botao-upload" texto={textoMensagem} className={classeMensagem} onClick={() => {
          setPopupAberto(true)
        }} />
      </>
    );
  }
  else if (exibirPaginaDespesas) {
    return (
      <>
        <div className="pagina-despesas">
          <h1>Suas Despesas</h1>
          <BotaoSimples id="botao-pagina-inicial" icone={paginaInicialIcon} onClick={() => {
            setExibirPaginaInicial(true)
            setExibirPaginaDespesas(false)
            atualizarGraficos()
          }}></BotaoSimples>
          <div id="graficos-row-1">
            <GrafDespesasTotais dados={despesasTotais} buscarDespesasTotais={buscarDespesasTotais} />
            <GrafDespesasCategorias dados={despesasCategorias} buscarDespesasCategorias={buscarDespesasCategorias} />
          </div>
        </div>
      </>
    );
  }
}

export default App

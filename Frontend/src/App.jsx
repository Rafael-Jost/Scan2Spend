import { useEffect, useState, useCallback } from 'react'
import QrScanner from './components/QrScanner.jsx'
import CardEdicao from './components/CardsEdicao.jsx'
import CardSemLink from './components/CardSemLink.jsx'
import PopUpDeInformacoes from './components/PopUpDeInformacoes.jsx'
import BotaoSimples from './components/BotaoSimples.jsx'
import parseRecibo from './utils/parseRecibo.js'
import despesasIcon from './assets/despesas.png'
import paginaInicialIcon from './assets/qr-code.png'
import perfilIcon from './assets/perfil.png'
import GrafDespesasTotais from './components/GrafDespesasTotais.jsx'
import GrafDespesasCategorias from './components/GrafDespesasCategorias.jsx'
import Login from './components/Login.jsx'
import CadastroUsuario from './components/CadastroUsuario.jsx'
import PopUpPerfil from './components/PopUpPerfil.jsx'
import Cookies from 'js-cookie'
import './App.css'

function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(Cookies.get('usuarioLogado') === 'true' || false)
  const [cadastrandoUsuario, setCadastrandoUsuario] = useState(false)
  const [estadoTela, setEstadoTela] = useState(Cookies.get('estadoTela') || 'login')
  const [textoMensagem, setTextoMensagem] = useState(null)
  const [classeMensagem, setClasseMensagem] = useState('oculto')
  const [textoRecibo, setTextoRecibo] = useState(null)
  const [popupAberto, setPopupAberto] = useState(false)
  const [despesasTotais, setDespesasTotais] = useState([])
  const [despesasCategorias, setDespesasCategorias] = useState([])
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [usuarioId, setUsuarioId] = useState(null)
  const [exibirPopUpPerfil, setExibirPopUpPerfil] = useState(false)


  // /////////////////////////////////////////////////////
  // Gerenciamento de autenticação e estado do usuário  //
  // /////////////////////////////////////////////////////

  // -----------------------------------------------------
  // Verifica se o usuário está logado ao carregar o app 
  // -----------------------------------------------------
  useEffect (() =>{

    if (usuarioLogado == false) { Cookies.remove('estadoTela'); return}

      (async () => {
          const dados_usuario_response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/me`, {
              method: 'GET',
              credentials: 'include'
          })
          
          if (!dados_usuario_response.ok) {
              console.error('Erro ao buscar dados do usuário:', await dados_usuario_response.text())
              return
          }

          if (Cookies.get('usuarioLogado') !== 'true') {
            Cookies.set('usuarioLogado', 'true', { expires: 30 })
          }
          carregaUsuario(await dados_usuario_response.json())
      })()
  }, [usuarioLogado])

  // ----------------------------------------------------------------
  // Função para carregar os dados do usuário após login ou registro
  // ----------------------------------------------------------------
  const carregaUsuario = useCallback((dadosUsuario) => {
    if (estadoTela === 'login') {
      setEstadoTela('inicial')
    }
    setNomeUsuario(dadosUsuario.nome + ' ' + dadosUsuario.sobrenome)
    setEmailUsuario(dadosUsuario.email)
    setUsuarioId(dadosUsuario.usuario_id)
  }, [])

  // -------------------------------
  // Função para logout do usuário
  // -------------------------------
  const logoutUsuario = useCallback(() => {
    Cookies.remove('usuarioLogado');
    setUsuarioLogado(false)
    Cookies.remove('estadoTela');
    setEstadoTela('login')
    setUsuarioId(null)
  }, [])



  // ///////////////////////////////
  // Gerenciamento de gráficos   //
  // //////////////////////////////

  // ------------------------------------------------
  // Função para buscar despesas totais do usuário
  // ------------------------------------------------
  const buscarDespesasTotais = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {

    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }
    const params = new URLSearchParams({ 
      usuario_id: usuarioId, 
      dt_inicio: dt_inicio, 
      dt_fim: dt_fim, 
      tipo_agrupamento: tipo_agrupamento 
    }).toString();
    
    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/despesas/?${params}`, {
      method: 'GET',
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json();
      setDespesasTotais(data);
    } else {
      console.error('Erro ao buscar dados.');
    }
  }, [usuarioId]);

  // ----------------------------------------------------
  // Função para buscar despesas por categoria de produto
  // ----------------------------------------------------
  const buscarDespesasCategorias = useCallback(async (dt_inicio, dt_fim) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
    }
    const params = new URLSearchParams({ 
      usuario_id: usuarioId, 
      dt_inicio: dt_inicio, 
      dt_fim: dt_fim
    }).toString();
    
    const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/despesas/categorias?${params}`, {
      method: 'GET',
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json();
      setDespesasCategorias(data);
    } else {
      console.error('Erro ao buscar dados.');
    }

  }, [usuarioId])


  // ------------------------------------------------------
  // Função para atualizar ambos os gráficos de despesas 
  // ------------------------------------------------------
  const atualizarGraficos = useCallback(() => {
    buscarDespesasTotais();
    buscarDespesasCategorias();
  }, [buscarDespesasTotais, buscarDespesasCategorias])

  // ------------------------------------------------------
  // Atualiza os gráficos sempre que o usuário fizer login
  // ------------------------------------------------------
  useEffect(() => {
    if (!usuarioLogado){ return }
    atualizarGraficos();
  }, [atualizarGraficos, usuarioLogado])


  // ///////////////////////////////////////////////
  // Gerenciamento de funcionalidades do sistema //
  // //////////////////////////////////////////////

  // -----------------------------------------------------
  // Gerencia o estado da tela (login, inicial, despesas)
  // -----------------------------------------------------
  useEffect(() => {
    Cookies.set('estadoTela', estadoTela, { expires: 1 })
    const root = document.getElementById('root')
    if (!root) return

    if (estadoTela === 'despesas') {
      root.classList.add('modo-despesas')
    } else {
      root.classList.remove('modo-despesas')
    }

    return () => {
      root.classList.remove('modo-despesas')
    }
  }, [estadoTela])

  
  // ---------------------------------------------------------------------
  // Componente para o botão de perfil e pop-up de informações do usuário
  // ---------------------------------------------------------------------
  function BotaoPerfil() {
    return (
      <>
        <BotaoSimples className="botao-menu perfil" icone={perfilIcon} onClick={() => {
          setExibirPopUpPerfil((valorAtual) => !valorAtual)
        }}></BotaoSimples>
        {exibirPopUpPerfil ? (
          <PopUpPerfil
            nomeUsuario={nomeUsuario}
            emailUsuario={emailUsuario}
            fncLogout={logoutUsuario}
            fncFechar={() => setExibirPopUpPerfil(false)}
          />
        ) : null}
      </>
    )
  }

  // ------------------------------------------------------
  // Função para analisar o recibo a partir da URL do QR code
  // ------------------------------------------------------
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
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
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

  // ------------------------------------------------------
  // Função para manter o servidor acordado (evitar hibernação)
  // ------------------------------------------------------

  const acordarServidor = async () => {
    try {
      await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
    } catch (error) {
      console.error('Erro ao acordar o servidor:', error);
    }
  }

  // ------------------------------------------------------
  // Acorda o servidor ao carregar o app e a cada 14 minutos
  // ------------------------------------------------------
  useEffect(() => {
    acordarServidor();

    const intervaloId = setInterval(() => {
      acordarServidor();
    }, 14 * 60 * 1000); // 14 MINUTOS

    return () => {
      clearInterval(intervaloId);
    };
  }, [])


  // ///////////////////////
  // Renderização do app //
  // ///////////////////////

  if (estadoTela === 'login') {
    if (cadastrandoUsuario) {
      return <CadastroUsuario setCadastrandoUsuario={setCadastrandoUsuario} />
    }else {
      return <Login setUsuarioLogado={setUsuarioLogado} setCadastrandoUsuario={setCadastrandoUsuario}/>
    }
  }

  if (estadoTela === 'inicial') {
    return (
      <>
        <BotaoPerfil />
        <BotaoSimples className="botao-menu despesas" icone={despesasIcon} onClick={() => {
          setEstadoTela('despesas')
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

  if (estadoTela === 'despesas') {
    return (
      <>
        <BotaoPerfil />
        <div className="pagina-despesas">
          <h1>Suas Despesas</h1>
          <BotaoSimples className="botao-menu pagina-inicial" icone={paginaInicialIcon} onClick={() => {
            setEstadoTela('inicial')
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

  return null
}

export default App

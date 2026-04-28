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
import GrafDespesasCategoriasPeriodo from './components/GrafDespesasCategoriasPeriodo.jsx'
import Login from './components/Login.jsx'
import CadastroUsuario from './components/CadastroUsuario.jsx'
import PopUpPerfil from './components/PopUpPerfil.jsx'
import Cookies from 'js-cookie'
import S2S_logo from './assets/Scan2Spend_logo.png'
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
  const [notasFiscais, setNotasFiscais] = useState([]);

  // /////////////////////////////////////////////////////
  // Gerenciamento de autenticação e estado do usuário  //
  // /////////////////////////////////////////////////////

  // -----------------------------------------------------
  // Verifica se o usuário está logado ao carregar o app 
  // -----------------------------------------------------
  useEffect (() =>{

    console.log('Verificando estado de login do usuário...')

    if (usuarioLogado == false) { Cookies.remove('estadoTela'); return}
    else {
      if (!Cookies.get('usuarioLogado')) {
        Cookies.set('usuarioLogado', 'true', { expires: 30 })
      }
    }

      (async () => {
          const dados_usuario_response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/me`, {
              method: 'GET',
              credentials: 'include'
          })
          
          if (!dados_usuario_response.ok) {
              console.error('Erro ao buscar dados do usuário:', await dados_usuario_response.text())
              return
          }

          if (Cookies.get('usuarioLogado') !== 'true' && usuarioLogado === true) {
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

  // -------------------------------------------------------
  // Função que verifica a validade do token a cada 1 minuto
  // --------------------------------------------------------

  useEffect(() => {
    if (!usuarioLogado) { return }

    function parseData(dataString) {
      const [data, hora] = dataString.split(' ')
      const [dia, mes, ano] = data.split('/')
      const [horaStr, minuto] = hora.split(':')

      return new Date(
        Number(ano),
        Number(mes) - 1, // mês começa do 0
        Number(dia),
        Number(horaStr),
        Number(minuto)
      )
    }

    const verificarToken = async () => {
      try {
        const response = await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/validarToken', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.msg === "Token válido") {
            var data_atual = new Date()
            console.warn('Hora de expiração do token (string):', data.hora_expiracao)
            const horaExpiracao = parseData(data.hora_expiracao)
            console.warn('Token válido. Expira em:', horaExpiracao)

            if (horaExpiracao - data_atual < 5 * 60 * 1000) { // Se faltar menos de 5 minutos para expirar
              alert('Sua sessão irá expirar em 5 minutos, por favor faça login novamente para continuar usando o Scan2Spend sem interrupções.')
            } 
          }
        } else if (response.status === 401) {
          console.warn('Token inválido ou expirado. Realizando logout.')
          logoutUsuario()
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error)
      }
    }

    verificarToken()
    const verificarTokenIntervalo = setInterval(verificarToken, 60000) // Verifica a cada 1 minuto

    return () => clearInterval(verificarTokenIntervalo)
  }, [usuarioLogado, logoutUsuario])


  // ///////////////////////////////
  // Gerenciamento de gráficos   //
  // //////////////////////////////

  // ------------------------------------------------
  // Função para buscar despesas totais do usuário
  // ------------------------------------------------
  const buscarDespesasTotais = useCallback(async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (usuarioLogado == false || usuarioLogado == '') { return }

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
    if (usuarioLogado == false || usuarioLogado == '') { return }

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
    if (!usuarioId) { return }

    buscarDespesasTotais();
    buscarDespesasCategorias();
  }, [buscarDespesasTotais, buscarDespesasCategorias, usuarioId])

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
    if (estadoTela === 'login') {
      Cookies.remove('estadoTela')
    } else {
      Cookies.set('estadoTela', estadoTela, { expires: 1 })
    }
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
            notasFiscais={notasFiscais}
            usuarioId={usuarioId}
            nomeUsuario={nomeUsuario}
            emailUsuario={emailUsuario}
            fncLogout={logoutUsuario}
            fncFechar={() => setExibirPopUpPerfil(false)}
            setPopUpInformacoesAberto={setPopupAberto}
            setConteudo = {setTextoRecibo}
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


  const buscarNotasFiscais = useCallback(async () => {
        if (!usuarioId) {
            setNotasFiscais([]);
            return;
        }
        console.log('Buscando notas fiscais para usuárioId:', usuarioId);
        try {
            const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/nota_fiscal?usuario_id=${usuarioId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Erro ao buscar notas fiscais do usuário:', response.statusText);
                setNotasFiscais([]);
                return;
            }

            const data = await response.json();
            const listaNotas = Array.isArray(data) ? data : [];

            setNotasFiscais(listaNotas.map((notaFiscal) => ({
                nota_fiscal_id: notaFiscal.nota_fiscal_id ?? notaFiscal.id ?? '',
                data: notaFiscal.data_compra ?? notaFiscal.data ?? '',
                numeroItens: Number(notaFiscal.quantidade_itens ?? notaFiscal.numeroItens ?? 0),
                valorPago: Number(notaFiscal.preco_final_pago ?? notaFiscal.valorPago ?? 0),
                desconto: Number(notaFiscal.desconto_total ?? notaFiscal.desconto ?? 0)
            })));
        } catch (error) {
            console.error('Erro ao buscar notas fiscais do usuário:', error);
            setNotasFiscais([]);
        }
    }, [usuarioId]);

  useEffect(() => {
    if (estadoTela === 'login') { return }
    buscarNotasFiscais()
  }, [estadoTela, buscarNotasFiscais])

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
    finally {
      console.log('Servidor acordado com sucesso!');
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
        <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." img={S2S_logo} />
        <QrScanner funcAnalisarRecibo={AnalisarRecibo} />
        <PopUpDeInformacoes usuarioId={usuarioId} conteudo={parseRecibo(textoRecibo)} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos}/>
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
            <GrafDespesasCategoriasPeriodo />
          </div>
        </div>
      </>
    );
  }

  return null
}

export default App

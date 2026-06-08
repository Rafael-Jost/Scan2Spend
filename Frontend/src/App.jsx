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
import GrafDespesasOrcamento from './components/GrafDespesasOrcamento.jsx'
import GrafDescontos from './components/GrafDescontos.jsx'
import Login from './components/Login.jsx'
import CadastroUsuario from './components/CadastroUsuario.jsx'
import PopUpPerfil from './components/PopUpPerfil.jsx'
import Cookies from 'js-cookie'
import S2S_logo from './assets/Scan2Spend_logo.png'
import PerfilDespesas from './components/PerfilDespesas.jsx'
import Swal from 'sweetalert2'
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
  const [despesasCategoriasPeriodo, setDespesasCategoriasPeriodo] = useState([])
  const [descontos, setDescontos] = useState([])
  const [insights, setInsights] = useState([])
  const [dadosPerfilDespesas, setDadosPerfilDespesas] = useState({})
  const [topProdutos, setTopProdutos] = useState([])
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [sobrenomeUsuario, setSobrenomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [orcamentoMensal, setOrcamentoMensal] = useState(null)
  const [exibirPopUpPerfil, setExibirPopUpPerfil] = useState(false)
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [tipoGrafDespesasCategorias, setTipoGrafDespesasCategorias] = useState('default') // 'default' para gráfico de pizza, 'periodo' para gráfico de linhas ao longo do tempo
  const [perfilDespesas, setPerfilDespesas] = useState(true)
  const [avisoFimSessaoExibido, setAvisoFimSessaoExibido] = useState(false)

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
          const dados_usuario_response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/me`, {
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
    setNomeUsuario(dadosUsuario.nome)
    setSobrenomeUsuario(dadosUsuario.sobrenome)
    setEmailUsuario(dadosUsuario.email)
    setOrcamentoMensal(dadosUsuario.orcamento_mensal)
  }, [estadoTela])

  // -------------------------------
  // Função para logout do usuário
  // -------------------------------
  const logoutUsuario = useCallback(() => {
    Cookies.remove('usuarioLogado');
    setUsuarioLogado(false)
    Cookies.remove('estadoTela');
    setEstadoTela('login')
    setNomeUsuario('')
    setAvisoFimSessaoExibido(false)
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
        const response = await fetch('https://scan2spend-backend-97637633938.southamerica-east1.run.app/validarToken', {
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

            if ((horaExpiracao - data_atual < 5 * 60 * 1000) && !avisoFimSessaoExibido) { // Se faltar menos de 5 minutos para expirar
              Swal.fire({
                position: 'top',
                title: 'Atenção!',
                text: 'Sua sessão irá expirar em 5 minutos, por favor faça login novamente para continuar usando o Scan2Spend sem interrupções.',
                icon: 'info',
                timer: 15000,
                timerProgressBar: true
              })
              setAvisoFimSessaoExibido(true)
            } 
          }
        } else if (response.status === 401) {
          console.warn('Token inválido ou expirado. Realizando logout.')
          logoutUsuario()
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error)
        Swal.fire({
                    toast: true,
                    position: 'top-start',
                    title: 'Algo deu errado :(',
                    text: 'Ocorreu um erro ao verificar o token. Tente novamente mais tarde.',
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                })
      }
    }

    verificarToken()
    const verificarTokenIntervalo = setInterval(verificarToken, 60000) // Verifica a cada 1 minuto

    return () => clearInterval(verificarTokenIntervalo)
  }, [usuarioLogado, logoutUsuario, avisoFimSessaoExibido])


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
      dt_inicio: dt_inicio,
      dt_fim: dt_fim,
      tipo_agrupamento: tipo_agrupamento
    }).toString();

    try {
      const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/?${params}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json();
        setDespesasTotais(data);
      } else {
        console.error('Erro ao buscar dados.');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar despesas totais. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, []);

  // ----------------------------------------------------
  // Função para buscar despesas por categoria de produto
  // ----------------------------------------------------
  const buscarDespesasCategorias = useCallback(async (dt_inicio, dt_fim) => {

    if (usuarioLogado == false || usuarioLogado == '') { return }

    if (!dt_inicio || !dt_fim ) {
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
    }
    const params = new URLSearchParams({
      dt_inicio: dt_inicio,
      dt_fim: dt_fim
    }).toString();

    try {
      const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/categorias?${params}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json();
        setDespesasCategorias(data);
      } else {
        console.error('Erro ao buscar dados.');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar despesas por categoria. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, [])

  // ------------------------------------------------------
  // Função para buscar despesas por categoria ao longo do tempo
  // ------------------------------------------------------ 
  const buscarDespesasCategoriasPeriodo = useCallback( async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (!dt_inicio || !dt_fim || !tipo_agrupamento){
      dt_inicio = '01/01/' + new Date().getFullYear();
      dt_fim = '31/12/' + new Date().getFullYear();
      tipo_agrupamento = 'MES'
    }

    const params = new URLSearchParams({ dt_inicio, dt_fim, tipo_agrupamento }).toString();

    try {
      const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/categorias/periodo?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dados de despesas por categoria e período recebidos:', data);
        setDespesasCategoriasPeriodo(data);
      } else {
        console.error('Erro ao buscar dados.');
      }
    }
    catch (error) {
      console.error('Erro ao buscar dados:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar despesas por categoria e período. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, [])


  // ------------------------------------------------------
  // Função pra buscar Descontos recebidos pelo usuário
  // ------------------------------------------------------
  const buscarDescontos = useCallback( async (dt_inicio, dt_fim, tipo_agrupamento) => {
    if (usuarioLogado == false || usuarioLogado == '') { return }
    if (!dt_inicio || !dt_fim || !tipo_agrupamento){
      dt_inicio = '01/01/' + new Date().getFullYear()
      dt_fim = '31/12/' + new Date().getFullYear()
      tipo_agrupamento = 'MES'
    }

    const params = new URLSearchParams({ dt_inicio, dt_fim, tipo_agrupamento }).toString();

    try {
      const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/descontos/?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Descontos recebidos:', data);
        setDescontos(data);
      } else {
        console.error('Erro ao buscar descontos.');
      }
    } catch (error) {
      console.error('Erro ao buscar descontos:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar descontos. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, [])

  // ------------------------------------------------------
  // Função para buscar insights personalizados para o usuário
  // ------------------------------------------------------
  const buscarInsights = useCallback( async () => {
    if (usuarioLogado == false || usuarioLogado == '') { return }

    try {
      const response = await fetch('https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/insights', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Insights recebidos:', data);
        setInsights(data);
      }else {
        console.error('Erro ao buscar insights.');
      }
    } catch (error) {
      console.error('Erro ao buscar insights:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar insights. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, [])


  // ------------------------------------------------------
  // Função para buscar os produtos mais comprados pelo usuário
  // ------------------------------------------------------
  const buscarTopProdutos = useCallback( async (dt_inicio, dt_fim) => {
    if (usuarioLogado == false || usuarioLogado == '') { return }

    if (!dt_inicio || !dt_fim){
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = String(hoje.getMonth() + 1).padStart(2, '0')
      const ultimoDiaMes = new Date(ano, hoje.getMonth() + 1, 0).getDate()

      dt_inicio = `01/${mes}/${ano}`
      dt_fim = `${String(ultimoDiaMes).padStart(2, '0')}/${mes}/${ano}`
    }
    const params = new URLSearchParams({ dt_inicio, dt_fim }).toString();

    try {
      const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/topProdutos?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Top produtos recebidos:', data);
        setTopProdutos(data);
      } else {
        console.error('Erro ao buscar top produtos.');
      }
    } catch (error) {
      console.error('Erro ao buscar top produtos:', error)
      Swal.fire({
                    toast: true,
                    position: 'top-start',
                    title: 'Algo deu errado :(',
                    text: 'Ocorreu um erro ao buscar os top produtos. Tente novamente mais tarde.',
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                })
    }
  }, [])

  const buscarDadosPerfilDespesas = useCallback(async () =>{

    try{
      const response = await fetch('https://scan2spend-backend-97637633938.southamerica-east1.run.app/despesas/perfil', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dados de perfil de despesas recebidos:', data);
        setDadosPerfilDespesas(data);
      } else {
        console.error('Erro ao buscar Dados de perfil de despesas.');
      }
    } catch (error) {
      console.error('Erro ao buscar Dados de perfil de despesas:', error)
      Swal.fire({
                  toast: true,
                  position: 'top-start',
                  title: 'Algo deu errado :(',
                  text: 'Ocorreu um erro ao buscar Dados de perfil de despesas. Tente novamente mais tarde.',
                  icon: 'error',
                  showConfirmButton: false,
                  timer: 2000,
                  timerProgressBar: true
              })
    }
  }, [])

  // ------------------------------------------------------
  // Função para atualizar ambos os gráficos de despesas 
  // ------------------------------------------------------
  const atualizarGraficos = useCallback(() => {
    if (!nomeUsuario) { return }

    buscarDespesasTotais();
    buscarDespesasCategorias();
    buscarDespesasCategoriasPeriodo();
    buscarInsights();
    buscarTopProdutos();
    buscarDadosPerfilDespesas();
    buscarDescontos();
  }, [buscarDespesasTotais, buscarDespesasCategorias, buscarDespesasCategoriasPeriodo, buscarInsights, buscarTopProdutos, buscarDadosPerfilDespesas, buscarDescontos, nomeUsuario])

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
            nomeUsuario={nomeUsuario}
            sobrenomeUsuario={sobrenomeUsuario}
            emailUsuario={emailUsuario}
            orcamentoMensal={orcamentoMensal}
            fncLogout={logoutUsuario}
            fncFechar={() => setExibirPopUpPerfil(false)}
            setPopUpInformacoesAberto={setPopupAberto}
            setConteudo = {setTextoRecibo}
            carregaUsuario={carregaUsuario}
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

      try {
        const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/analisar_nf/?QRurl=${encodeURIComponent(url)}`, {
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
      } catch (error) {
        console.error('Erro ao analisar recibo:', error)
        Swal.fire({
                    toast: true,
                    position: 'top-start',
                    title: 'Algo deu errado :(',
                    text: 'Ocorreu um erro ao analisar o recibo. Tente novamente mais tarde.',
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                })
      }
  }


  const buscarNotasFiscais = useCallback(async () => {
        if (!nomeUsuario) {
            setNotasFiscais([]);
            return;
        }
        try {
            const response = await fetch(`https://scan2spend-backend-97637633938.southamerica-east1.run.app/nota_fiscal`, {
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
            Swal.fire({
                        toast: true,
                        position: 'top-start',
                        title: 'Algo deu errado :(',
                        text: 'Ocorreu um erro ao buscar as notas fiscais. Tente novamente mais tarde.',
                        icon: 'error',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    })
            setNotasFiscais([]);
        }
    }, [nomeUsuario]);

  useEffect(() => {
    if (estadoTela === 'login') { return }
    buscarNotasFiscais()
  }, [estadoTela, buscarNotasFiscais])



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
        <PopUpDeInformacoes conteudo={parseRecibo(textoRecibo)} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos}/>
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
        <BotaoSimples className="botao-menu pagina-inicial" icone={paginaInicialIcon} onClick={() => {
            setEstadoTela('inicial')
            atualizarGraficos()
        }}></BotaoSimples>
        <PopUpDeInformacoes conteudo={parseRecibo(textoRecibo)} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos}/>
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
              <PerfilDespesas nomeUsuario={nomeUsuario} insights={insights} topProdutos={topProdutos} dadosPerfilDespesas={dadosPerfilDespesas}/>
            </>
          ) : (
            <>
              <div id="graficos-row-1">
                <GrafDespesasTotais dados={despesasTotais} buscarDespesasTotais={buscarDespesasTotais} />
                {tipoGrafDespesasCategorias === 'default' ? 
                  <GrafDespesasCategorias dados={despesasCategorias} buscarDespesasCategorias={buscarDespesasCategorias} setTipoGrafDespesasCategorias={setTipoGrafDespesasCategorias}/>
                  : ''} 
                {tipoGrafDespesasCategorias === 'periodo' ? 
                  <GrafDespesasCategoriasPeriodo dados={despesasCategoriasPeriodo} buscarDespesasCategoriasPeriodo={buscarDespesasCategoriasPeriodo} setTipoGrafDespesasCategorias={setTipoGrafDespesasCategorias}/>
                  : ''}
              </div>
              <div id="graficos-row-2">
                <GrafDespesasOrcamento orcamentoMensal={orcamentoMensal} despesasTotais={despesasTotais} />
                <GrafDescontos dados={descontos}/>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return null
}

export default App

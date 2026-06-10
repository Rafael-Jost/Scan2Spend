import { useState } from 'react'
import QrScanner from '../components/QrScanner.jsx'
import PopUpDeInformacoes from '../components/PopUpDeInformacoes.jsx'
import BotaoSimples from '../components/BotaoSimples.jsx'
import BotaoPerfil from '../components/BotaoPerfil.jsx'
import CardSemLink from '../components/CardSemLink.jsx'
import parseRecibo from '../utils/parseRecibo.js'
import { authFetch } from '../utils/authFetch'
import despesasIcon from '../assets/despesas.png'
import S2S_logo from '../assets/Scan2Spend_logo.png'
import Swal from 'sweetalert2'

export default function PaginaInicial({
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
  carregaUsuario
}) {
  const [textoMensagem, setTextoMensagem] = useState(null)
  const [classeMensagem, setClasseMensagem] = useState('oculto')

  const AnalisarRecibo = async (url) => {
    if (!url) {
      console.error("URL vazia/undefined em AnalisarRecibo")
      return
    }
    const formData = new FormData()
    formData.append('QRurl', url)

    setClasseMensagem("carregando")
    setTextoMensagem("Analisando...")

    try {
      const response = await authFetch(`/api/analisar_nf/?QRurl=${encodeURIComponent(url)}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setTextoRecibo(data.text)
        setClasseMensagem("sucesso")
        setTextoMensagem("Análise Completa!")

        setTimeout(() => {
          setPopupAberto(true)
        }, 1000)
      } else {
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
      <BotaoSimples className="botao-menu despesas" icone={despesasIcon} onClick={() => {
        setEstadoTela('despesas')
      }}></BotaoSimples>
      <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Escaneie seus recibos, rastreie seus gastos e receba dicas de economia." img={S2S_logo} />
      <QrScanner funcAnalisarRecibo={AnalisarRecibo} />
      <PopUpDeInformacoes conteudo={parseRecibo(textoRecibo)} popupAberto={popupAberto} setPopupAberto={setPopupAberto} atualizarGraficos={atualizarGraficos} />
      <BotaoSimples id="botao-upload" texto={textoMensagem} className={classeMensagem} onClick={() => {
        setPopupAberto(true)
      }} />
    </>
  )
}

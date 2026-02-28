import { useState } from 'react'
import QrScanner from './components/QrScanner.jsx'
import CardEdicao, { SalvarPayload }from './components/CardsEdicao.jsx'
import CardSemLink from './components/CardSemLink.jsx'
import PopUpDeInformacoes from './components/PopUpDeInformacoes.jsx'
import BotaoSimples from './components/BotaoSimples.jsx'
import parseRecibo from './utils/parseRecibo.js'
import './App.css'

function App() {
  const [textoMensagem, setTextoMensagem] = useState(null)
  const [classeMensagem, setClasseMensagem] = useState('oculto')
  const [textoRecibo, setTextoRecibo] = useState(null)


  const AnalisarRecibo = async (url) => {
    if (!url) {
      console.error("URL vazia/undefined em AnalisarRecibo");
      return;
    }
    const formData = new FormData()
      formData.append('QRurl', url)

      setClasseMensagem("carregando")
      setTextoMensagem("Analisando...")

      const response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/receiptExpenses/?QRurl=${encodeURIComponent(url)}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
          setTextoRecibo(data.text)
          setClasseMensagem("sucesso")
          setTextoMensagem("Análise Completa!")

        setTimeout(() => {
            const popup = document.getElementById('popup-informacoes')
            if(popup) popup.style.display = 'flex';
          }
      , 1000)
      }else {
          setTextoRecibo("Erro ao analisar recibo")
          setClasseMensagem("erro")
          setTextoMensagem("Erro ao analisar")
      }
  }

  return (
    <>
      <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." />
      <QrScanner funcAnalisarRecibo={AnalisarRecibo} />
      <PopUpDeInformacoes conteudo={<CardEdicao json={parseRecibo(textoRecibo)} />}></PopUpDeInformacoes>
      <BotaoSimples texto={textoMensagem} className={classeMensagem} onClick={() => {
        const popup = document.getElementById('popup-informacoes')
        if(popup) popup.style.display = 'flex';
      }} />
    </>
  );
}

export default App

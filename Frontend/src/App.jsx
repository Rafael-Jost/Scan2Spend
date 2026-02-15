import { useState } from 'react'
import QrScanner from './components/QrScanner.jsx'
import './App.css'

function CardSemLink({titulo, descricao}) {
  return (
    <div className="card-sem-link">
      <h2>{titulo}</h2>
      <div className="descricao-card">
        <p>{descricao}</p>
      </div>
    </div>
  )
}

function PopUpDeInformacoes({conteudo}){

    return (
    <div id="popup-informacoes">
      <div id="painel-de-informacoes">
        <h4 style={{ margin: 0, marginBottom: 8 }}>Informações:</h4>
        {conteudo}
        <button
          style={{ marginTop: '20px' }}
          onClick={() => {
            const popup = document.getElementById('popup-informacoes')
            if(popup) popup.style.display = 'none';
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
  
}

function BotaoSimples({texto, onClick, className}){
  return <button id="botao-upload" className={className} onClick={onClick}>{texto}</button>
}

function MensagemDeStatus({texto, className}){
  return (
  <div style={{display: 'flex', marginTop: '20px', justifyContent: 'center'}}>
    <span id="mensagem-status" className={className}>{texto}</span>
  </div>
  )
  }

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
      <PopUpDeInformacoes conteudo={<div id="texto-recibo">{textoRecibo && <p>TEXTO RECIBO: {textoRecibo}</p>}</div>} />
      <MensagemDeStatus texto={textoMensagem} className={classeMensagem} />
    </>
  );
}

export default App

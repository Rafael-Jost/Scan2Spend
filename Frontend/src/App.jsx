import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
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

function Dropzone({imagemOut}){
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState("Solte seu arquivo aqui!")

  const drag = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add("dragover")
  }

  const dragLeave = (e) => {
    e.currentTarget.classList.remove("dragover")
  }

  const drop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]

    imagemOut(droppedFile)

    if (!droppedFile.type.startsWith('image/')){
      setMessage("Apenas imagens são permitidas!")
      return
    }
    setFile(droppedFile)
    setMessage("Imagem adicionada: " + droppedFile.name)

    setTimeout(() => {
      setMessage("Solte seu arquivo aqui!")
    }, 3000)
  }

  return <div id="dropzone-container" onDragOver={drag} onDragLeave={dragLeave} onDrop={drop}>{message}</div>
}

function PainelDeInformacoesDaImagem({nome}, {tamanho}, {tipo}){
  return <div id="painel-de-informacoes-da-imagem">
    <h5>Informações da Imagem:</h5>
    <p>Nome: {nome}</p>
    <p>Tamanho: {tamanho} bytes</p>
    <p>Tipo: {tipo}</p>
  </div>
}

function BotaoSimples({texto, onClick, className}){
  return <button id="botao-upload" className={className} onClick={onClick}>{texto}</button>
}

function App() {
  const [arquivo, setArquivo] = useState(null)
  const[dadosAnalisados, setDadosAnalisados] = useState(null)
  const [textoBotao, setTextoBotao] = useState("Analisar Recibo")
  const [classeBotao, setClasseBotao] = useState(null)

  const uploadArquivo = async () => {
    if (!arquivo) {
      setTextoBotao("Nenhum arquivo selecionado")
      return
    }

    setTextoBotao("Enviando...")

    const formData = new FormData()
    formData.append('receipt', arquivo)

    const response = await fetch('https://scan2spend-fastapi.onrender.com/upreceipt/', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      setDadosAnalisados(data)
      console.log(data)
      setClasseBotao("botao-sucesso")
      setTextoBotao("Análise Completa!")

    } else {
      setClasseBotao("botao-erro")
      setTextoBotao("Erro ao enviar arquivo")
    }

    setTimeout(() => {
      setTextoBotao("Analisar Recibo")
      setClasseBotao(null)
    }, 3000)
  }

  return (
    <>
      <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." />
      <Dropzone imagemOut={setArquivo}/>
      <BotaoSimples texto={textoBotao} onClick={uploadArquivo} className={classeBotao} />
    </>
  );
}

export default App

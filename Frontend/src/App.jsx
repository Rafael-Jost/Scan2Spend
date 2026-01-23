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
  const [message, setMessage] = useState("Solte sua imagem aqui!")

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
      setMessage("Solte sua imagem aqui!")
    }, 3000)
  }

  return <div id="dropzone-container" onDragOver={drag} onDragLeave={dragLeave} onDrop={drop}>{message}</div>
}

function PainelDeInformacoesDaImagem({imagem}){
  if (!imagem){
    return 
  }
  return <div id="painel-de-informacoes-da-imagem">
    <h5>Informações da Imagem:</h5>
    <p>Nome: {imagem.name}</p>
    <p>Tamanho: {imagem.size} bytes</p>
    <p>Tipo: {imagem.type}</p>
  </div>
}

function App() {
  const [arquivo, setArquivo] = useState(null)

  return (
    <>
      <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." />
      <Dropzone imagemOut={setArquivo}/>
      <PainelDeInformacoesDaImagem imagem={arquivo} />
    </>
  );
}

export default App

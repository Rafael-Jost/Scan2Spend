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

function Dropzone(){
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

function App() {
  return (
    <>
      <CardSemLink titulo="Bem-vindo ao Scan2Spend!" descricao="Faça upload dos seus recibos, rastreie seus gastos e receba dicas de economia." />
      <Dropzone />
    </>
  );
}

export default App

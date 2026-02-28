function BotaoSimples({texto, onClick, className}){
  return <button id="botao-upload" className={className} onClick={onClick}>{texto}</button>
}

export default BotaoSimples

function BotaoSimples({id, texto, onClick, className, icone, ref}){
  return <>
    <button ref={ref} id={id} className={className} onClick={onClick}>
      {icone ? <img style={{ width: '30px', height: '30px' }} src={icone}/> : null}
      {texto}
    </button>
  </>
}

export default BotaoSimples

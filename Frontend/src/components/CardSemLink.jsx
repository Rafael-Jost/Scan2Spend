function CardSemLink({titulo, descricao, img}) {
  return (
    <div className="card-sem-link">
      {img && <img src={img} alt="Logo Scan2Spend" className='s2s-logo' />}
      <h2 className="card-sem-link-titulo">{titulo}</h2>
      <div className="descricao-card">
        <p>{descricao}</p>
      </div>
    </div>
  )
}

export default CardSemLink

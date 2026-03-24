import perfilIcon from '../assets/perfil.png'

function PopUpPerfil({ nomeUsuario, emailUsuario, fncLogout, fncFechar }) {

    return (
        <div className="popup-perfil">
            <div className="popup-perfil-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={perfilIcon} alt="Perfil" style={{"width": "40px", "height": "40px", "backgroundColor": "lightgray", borderRadius: "100%"}}/>
                    <span>{nomeUsuario}</span>
                </div>
                <p style={{ margin: 0 }}><strong>Email:</strong> <span>{emailUsuario}</span></p>
                <button style={{width: '100%'}} onClick={fncLogout}>
                    Sair
                </button>
            </div>
        </div>
    )
}

export default PopUpPerfil;
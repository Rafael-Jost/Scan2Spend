import perfilIcon from '../assets/perfil.png'

function PerfilDespesas({nomeUsuario, usuarioID}){

    return (
        <div className="perfil-despesas">
            <div className="perfil-despesas-col">
                <img src={perfilIcon} alt="Perfil" style={{"width": "80px", "height": "80px", "backgroundColor": "lightgray", borderRadius: "100%", border: "2px solid #ccc"}}/>
                <p></p>
            </div>
            <div className="perfil-despesas-col">
                <h2>informações adicionais</h2>
            </div>
            <div className="perfil-despesas-col">
                <h2>informações adicionais</h2>
            </div>
        </div>
    )
}

export default PerfilDespesas
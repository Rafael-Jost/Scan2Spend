function ResetSenha() {
    const token = new URLSearchParams(window.location.search).get('token');

    return (
        <div>
            <h1>Resetar Senha</h1>
            <p>Em breve, esta funcionalidade estará disponível.</p>
            <p>Token recebido: {token}</p>
        </div>
    );
}

export default ResetSenha;
import { useState } from 'react'
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import Swal from 'sweetalert2'

function ResetSenha() {
    const [senhaVisivel, setSenhaVisivel] = useState(false)
    const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false)
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [email, setEmail] = useState('')
    const [erroReset, setErroReset] = useState(null)
    const token = new URLSearchParams(window.location.search).get('token');

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (senha !== confirmarSenha) {
            Swal.fire({
                toast: true,
                position: 'top-start',
                title: 'Atenção!',
                text: 'As senhas não coincidem!',
                icon: 'error',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            })
            return
        }
        const response = await fetch('https://scan2spend-backend-97637633938.southamerica-east1.run.app/redefinir_senha?token=' + token + '&nova_senha=' + senha, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            const erroData = await response.json()
            console.error('Erro ao redefinir senha:', erroData)
            setErroReset(erroData?.detail || 'Erro ao redefinir senha!')
            return
        }
        Swal.fire({
            toast: true,
            position: 'top-start',
            title: 'Sucesso!',
            text: 'Senha redefinida com sucesso!',
            icon: 'success',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        })
        setTimeout(() => {
            window.location.href = '/'
        }, 2000)
    };

    const handleSubmitNoToken = async (e) => {
        e.preventDefault()

        const response = await fetch('https://scan2spend-backend-97637633938.southamerica-east1.run.app/redefinir_senha?email_destino=' + email , {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            const erroData = await response.json()
            console.error('Erro ao redefinir senha:', erroData)

            if (response.status === 404) {
                setErroReset('Email não encontrado!')
                return
            } 
            setErroReset(erroData?.detail || 'Erro ao redefinir senha!')
            return
        }
        setErroReset(null)
        Swal.fire({
            toast: true,
            position: 'top-start',
            title: 'Sucesso!',
            text: 'Senha redefinida com sucesso!',
            icon: 'success',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        })
        setTimeout(() => {
            window.location.href = '/'
        }, 2000)
    };

    if (token) {
        return (
            <div className="pagina-login cadastro-usuario" style={{ paddingTop: '8vh' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                        <FaLock style={{ fontSize: '2rem', color: '#4ab0d8' }} />
                    </div>
                    <h1 style={{ margin: '4px 0 2px', fontSize: '1.4rem' }}>Escolha sua nova senha</h1>
                    <p style={{ margin: '0 0 4px', fontSize: '0.88rem', color: 'color-mix(in srgb, CanvasText 55%, transparent)', textAlign: 'center' }}>
                        Digite e confirme sua nova senha abaixo.
                    </p>

                    <div className='input-container senha-container'>
                        <input
                            className='login-input'
                            type={senhaVisivel ? "text" : "password"}
                            placeholder="Nova senha"
                            onChange={(e) => setSenha(e.target.value)} />
                        {senhaVisivel
                            ? <FaEyeSlash className='icon-visibilidade-senha' onClick={() => setSenhaVisivel(false)} />
                            : <FaEye className='icon-visibilidade-senha' onClick={() => setSenhaVisivel(true)} />
                        }
                    </div>

                    <div className='input-container senha-container'>
                        <input
                            className='login-input'
                            type={confirmarSenhaVisivel ? "text" : "password"}
                            placeholder="Confirmar nova senha"
                            onChange={(e) => setConfirmarSenha(e.target.value)} />
                        {confirmarSenhaVisivel
                            ? <FaEyeSlash className='icon-visibilidade-senha' onClick={() => setConfirmarSenhaVisivel(false)} />
                            : <FaEye className='icon-visibilidade-senha' onClick={() => setConfirmarSenhaVisivel(true)} />
                        }
                    </div>
                    <span className={erroReset ? 'span-msg-erro' : 'span-msg-erro oculto'}>{erroReset}</span>
                    <button id="btn-login" type="submit">Redefinir Senha</button>
                </form>
            </div>
        );
    } else {
        return (
            <div className="pagina-login cadastro-usuario" style={{ paddingTop: '8vh' }}>
                <form onSubmit={handleSubmitNoToken}>
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                        <FaLock style={{ fontSize: '2rem', color: '#4ab0d8' }} />
                    </div>
                    <h1 style={{ margin: '4px 0 2px', fontSize: '1.4rem' }}>Solicitar Redefinição de Senha</h1>
                    <p style={{ margin: '0 0 4px', fontSize: '0.88rem', color: 'color-mix(in srgb, CanvasText 55%, transparent)', textAlign: 'center' }}>
                        Digite seu email para solicitar a redefinição de senha.
                    </p>

                    <div className='input-container senha-container'>
                        <input
                            className='login-input'
                            type="email"
                            placeholder="Email"
                            onChange={(e) => setEmail(e.target.value)} />
                        
                    </div>
                    <span className={erroReset ? 'span-msg-erro' : 'span-msg-erro oculto'}>{erroReset}</span>
                    <button id="btn-login" type="submit">Redefinir Senha</button>
                </form>
            </div>
        );
    }
                
}

export default ResetSenha;
import {FaUser, FaLock} from 'react-icons/fa'
import { useEffect } from 'react'
import {useState} from 'react'

function Login({ funcaoLogin }) {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [token, setToken] = useState('')

    useEffect (() =>{
        if (!token) return

        (async () => {
            const dados_usuario_response = await fetch(`https://scan2spend-fastapi-dockerbased.onrender.com/me?token=${token}`, {
                method: 'GET'
            })
            // setDadosUsuario(await dados_usuario_response.json())
            funcaoLogin(await dados_usuario_response.json())
        })()
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const token_response = await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login: email, senha })
        })

        if (!token_response.ok) {
            console.error('Erro no login:', await token_response.json())
            return
        }

        const token_data = await token_response.json()
        setToken(token_data.token)

        console.log('token:' + token_data.token)
    }

    return <>
        <div className="pagina-login">
            <form onSubmit={handleSubmit}>
                <h1>Login</h1>
                <div className='input-container'> 
                    <FaUser className='login-icon' /> 
                    <input 
                      className='login-input'
                      type="email" 
                      placeholder="Email" 
                      onChange={(e) => setEmail(e.target.value)}></input></div>
                <div className='input-container'>
                    <FaLock className='login-icon' /> 
                    <input 
                      className='login-input'
                      type="password" 
                      placeholder="Senha" 
                      onChange={(e) => setSenha(e.target.value)}/>
                </div>
                <label> <input type="checkbox" /> Não me esqueça :(</label>
                <button type="submit">Entrar</button>
                <label>Não tem uma conta? <a href="#">Cadastre-se</a></label>
                <label><a href="#">Esqueci minha senha</a></label>
            </form>
        </div>
    </>
}

export default Login;
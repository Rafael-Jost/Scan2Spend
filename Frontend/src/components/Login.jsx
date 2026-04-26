import {FaUser, FaLock, FaEye, FaEyeSlash} from 'react-icons/fa'
import { use, useEffect } from 'react'
import {useState} from 'react'
import Cookies from 'js-cookie'
import S2S_logo from '../assets/Scan2Spend_logo.png'

function Login({ setUsuarioLogado, setCadastrandoUsuario}) {
    const [email, setEmail] = useState(Cookies.get('email') || '')
    const [senha, setSenha] = useState('')
    const [lembrarMe, setLembrarMe] = useState(Cookies.get('email') ? true : false)
    const [senhaVisivel, setSenhaVisivel] = useState(false)

    // const [token, setToken] = useState('')
    const [erroLogin, setErroLogin] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErroLogin(null)

        const response = await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ login: email, senha })
        })

        if (!response.ok) {
            const erroData = await response.json()
            console.error('Erro no login:', erroData)
            setErroLogin(erroData?.detail || 'Erro no login!')
            return
        }

        const token_data = await response.json()
        setUsuarioLogado(true)
        console.log('Login bem-sucedido! msg:', token_data.msg)

        if (lembrarMe) {
            Cookies.set('email', email, { expires: 30 })
        }else {
            Cookies.remove('email')
        }

    }
    
    
    return <>
        <div className="pagina-login">
            <form onSubmit={handleSubmit}>
                <img style={{marginBottom: '-30px'}} src={S2S_logo} alt="Logo Scan2Spend" className='s2s-logo' />
                <h1>Login</h1>
                <div className='input-container'> 
                    <FaUser className='login-icon' /> 
                    <input 
                      className='login-input'
                      type="email" 
                      placeholder="Email" 
                      onChange={(e) => setEmail(e.target.value)}
                      defaultValue={email}
                    ></input></div>
                    <div className='input-container senha-container'>
                    <FaLock className='login-icon' /> 
                    <input 
                      className='login-input'
                      type={ senhaVisivel ? "text" : "password"} 
                      placeholder="Senha" 
                      onChange={(e) => setSenha(e.target.value)}/>
                    {senhaVisivel 
                    ? 
                        <FaEyeSlash className='icon-visibilidade-senha' onClick={() => setSenhaVisivel(false)}></FaEyeSlash> 
                    : 
                        <FaEye className='icon-visibilidade-senha' onClick={() => setSenhaVisivel(true)}></FaEye>
                    }
                </div>
                <label> <input type="checkbox" defaultChecked={lembrarMe} onChange={(e) => {setLembrarMe(e.target.checked ? true : false)}} /> Não me esqueça :(</label>
                <span className={erroLogin ? 'span-msg-erro' : 'span-msg-erro oculto'}>{erroLogin}</span>
                <button id="btn-login" type="submit">Entrar</button>
                <label>Não tem uma conta? 
                    <a href="#" onClick={(e) => {
                        e.preventDefault()
                        setCadastrandoUsuario(true)
                    }}> Cadastre-se</a>
                </label>
                <label><a href="#">Esqueci minha senha</a></label>
            </form>
        </div>
    </>
}

export default Login;

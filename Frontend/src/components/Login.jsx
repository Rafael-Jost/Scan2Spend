import {FaUser, FaLock} from 'react-icons/fa'
import {useState} from 'react'

function Login() {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')

    return <>
        <div className="pagina-login">
            <form>
                <h1>Login</h1>
                <div> <FaUser /> <input type="email" placeholder="Email"></input></div>
                <div><FaLock /> <input type="password" placeholder="Senha"></input></div>
                <label> <input type="checkbox" /> Não me esqueça :(</label>
                <button type="submit">Entrar</button>
                <label>Não tem uma conta? <a href="#">Cadastre-se</a></label>
                <label><a href="#">Esqueci minha senha</a></label>
            </form>
        </div>
    </>
}

export default Login;
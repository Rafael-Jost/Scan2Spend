import {FaUser, FaLock, FaArrowLeft} from 'react-icons/fa'
import { IoMdMail } from "react-icons/io";
import { useEffect } from 'react'
import {useState} from 'react'
import Cookies from 'js-cookie'

function CadastroUsuario({setCadastrandoUsuario}) {
    const [nome, setNome] = useState('')
    const [sobrenome, setSobrenome] = useState('')
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [erroCadastro, setErroCadastro] = useState('')
    const [sucessoCadastro, setSucessoCadastro] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (senha && confirmarSenha && senha !== confirmarSenha) {
            console.log('As senhas digitadas não coincidem!')
            setErroCadastro('As senhas digitadas não coincidem!')
        }else{
            console.log('deu certo')
            setErroCadastro('')

            const response = await fetch('https://scan2spend-fastapi-dockerbased.onrender.com/cadastrarUsuario/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    nome,
                    sobrenome,
                    email,
                    senha
                })
            })

            if (response.ok) {
                // Cadastro realizado com sucesso
                setSucessoCadastro('Usuário cadastrado com sucesso!')
                setInterval(() => {
                    setCadastrandoUsuario(false)
                }, 2000)
            } else {
                // Tratar erro de cadastro
                setErroCadastro('Erro ao cadastrar usuário.')
            }
        }
    }


    return <>
        <div className="pagina-login">
            <a style={{display: "flex", width: "25px",  height:"25px",color: "white"}} onClick={() => setCadastrandoUsuario(false)}><FaArrowLeft/></a>
            <form>
                <h1>Cadastro</h1>
                <div className='input-container' style={{gap: "10px"}}>
                    {/* <FaUser className='login-icon' /> */}
                    <input className='cadastro-input' type='text' placeholder='Nome' onChange={(e) => {setNome(e.target.value)}}/>
                    <input className='cadastro-input' type='text' placeholder='Sobrenome' onChange={(e) => {setSobrenome(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    {/* <IoMdMail className='login-icon' /> */}
                    <input className='cadastro-input' type='email' placeholder='Email' onChange={(e) => {setEmail(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    {/* <FaLock className='login-icon' /> */}
                    <input className='cadastro-input' type='password' placeholder='Senha' onChange={(e) => {setSenha(e.target.value)}}/>
                </div>
                <div className='input-container'>
                    {/* <FaLock className='login-icon' /> */}
                    <input className='cadastro-input' type='password' placeholder='Confirmar Senha' onChange={(e) => {setConfirmarSenha(e.target.value)}}/>
                </div>
                <span className={erroCadastro ? 'span-msg-erro' : 'span-msg-erro oculto'}>{erroCadastro}</span>
                <span className={sucessoCadastro ? 'span-msg-sucesso' : 'span-msg-sucesso oculto'}>{sucessoCadastro}</span>
                <button id="btn-cadastro" type="submit" onClick={handleSubmit}>Cadastrar</button>
            </form> 
        </div>
    </>
}

export default CadastroUsuario;
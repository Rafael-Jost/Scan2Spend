import {FaUser, FaLock, FaArrowLeft} from 'react-icons/fa'
import { IoMdMail } from "react-icons/io";
import { useEffect } from 'react'
import {useState} from 'react'
import Cookies from 'js-cookie'

function CadastroUsuario({setCadastrandoUsuario}) {
    return <>
        <div className="pagina-login">
            <a style={{display: "flex", width: "25px"}} onClick={() => setCadastrandoUsuario(false)}><FaArrowLeft/></a>
            <form>
                <h1>Cadastro</h1>
                <div className='input-container'>
                    <FaUser className='login-icon' />
                    <input className='cadastro-input' type='text' placeholder='Nome'/>
                </div>
                <div className='input-container'>
                    <IoMdMail className='login-icon' />
                    <input className='cadastro-input' type='email' placeholder='Email'/>
                </div>
                <div className='input-container'>
                    <FaLock className='login-icon' />
                    <input className='cadastro-input' type='password' placeholder='Senha'/>
                </div>
                <div className='input-container'>
                    <FaLock className='login-icon' />
                    <input className='cadastro-input' type='password' placeholder='Confirmar Senha'/>
                </div>
                <button id="btn-cadastro" type="submit">Cadastrar</button>
            </form> 
        </div>
    </>
}

export default CadastroUsuario;
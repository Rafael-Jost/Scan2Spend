import os
import jwt
import oracledb
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request, Response, Depends

from database import get_db
from models.schemas import (
    Login, LoginResponse, CadastroUsuario, AtualizarUsuario,
    CadastroUsuarioResponse, MeResponse, ValidadeTokenResponse, MessageResponse,
    RedefinirSenhaRequest
)
from functions import enviar_redefinicao_senha

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")

def gerar_token_login(usuario_id):
    
    payload = {
        "usuario_id": usuario_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def validar_token_login(token):
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        fuso_brasil = timezone(timedelta(hours=-3))
        return payload["usuario_id"], datetime.fromtimestamp(
            payload["exp"],
            tz=fuso_brasil
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


@router.post('/cadastrarUsuario/', response_model=CadastroUsuarioResponse)
def cadastroUsuario(dados_usuario: CadastroUsuario, connection=Depends(get_db)):
    try:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO usuarios(nome, sobrenome, email, senha, orcamento_mensal) "
            "VALUES (:nome, :sobrenome, :email, PKG_AUTH.encrypt_pwd(:senha), :orcamento_mensal)",
            {
                'nome': dados_usuario.nome.capitalize(),
                'sobrenome': dados_usuario.sobrenome.capitalize(),
                'email': dados_usuario.email,
                'senha': dados_usuario.senha,
                'orcamento_mensal': dados_usuario.orcamento_mensal
            }
        )
        connection.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao cadastrar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao cadastrar usuário")
    else:
        return CadastroUsuarioResponse(msg="Usuário cadastrado com sucesso")


@router.put('/usuario', response_model=MessageResponse)
def atualizarUsuario(request: Request, dados_usuario: AtualizarUsuario, connection=Depends(get_db)):
    try:
        usuario_id, _ = validar_token_login(request.cookies.get("__session"))

        cursor = connection.cursor()
        cursor.execute("""
            UPDATE usuarios
            SET nome = :nome,
                sobrenome = :sobrenome,
                email = :email,
                orcamento_mensal = :orcamento_mensal
            WHERE usuario_id = :usuario_id
        """, {
            'usuario_id': usuario_id,
            'nome': dados_usuario.nome.capitalize(),
            'sobrenome': dados_usuario.sobrenome.capitalize(),
            'email': dados_usuario.email,
            'orcamento_mensal': dados_usuario.orcamento_mensal
        })
        connection.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar usuário")
    else:
        return MessageResponse(msg="Usuário atualizado com sucesso")


@router.post('/login', response_model=LoginResponse)
def login(credenciais: Login, response: Response, connection=Depends(get_db)):

    try:
        cursor = connection.cursor()
        usuario_id_var = cursor.var(int)
        cursor.execute("""
            BEGIN
                PKG_AUTH.auth(
                    p_login => :login,
                    p_senha => :senha,
                    p_usuario_id => :usuario_id
                );
            END;
        """, {
            "login": credenciais.login,
            "senha": credenciais.senha,
            "usuario_id": usuario_id_var
        })

        usuario_id = usuario_id_var.getvalue()
        if usuario_id is None:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

    except HTTPException:
        raise
    except oracledb.DatabaseError as e:
        print(f"Erro de banco ao fazer login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")
    except Exception as e:
        print(f"Erro ao fazer login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao fazer login")
    else:
        token = gerar_token_login(usuario_id)
        response.set_cookie(
            key="__session",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            expires=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
        return LoginResponse(msg="Login realizado com sucesso")


@router.get('/validarToken', response_model=ValidadeTokenResponse)
def validar_token(request: Request):
    try:
        token = request.cookies.get("__session")
        _, hora_expiracao = validar_token_login(token)
    except HTTPException:
        raise
    else:
        return ValidadeTokenResponse(
            msg="Token válido",
            hora_expiracao=hora_expiracao.strftime("%d/%m/%Y %H:%M")
        )


@router.get('/me', response_model=MeResponse)
def me(request: Request, connection=Depends(get_db)):
    try:
        token = request.cookies.get("__session")
        usuario_id, _ = validar_token_login(token)

        cursor = connection.cursor()

        nome_var = cursor.var(str)
        sobrenome_var = cursor.var(str)
        email_var = cursor.var(str)
        orcamento_var = cursor.var(float)
        cursor.execute("""
            BEGIN
                PKG_AUTH.post_auth(
                    p_usuario_id => :usuario_id,
                    p_nome       => :nome,
                    p_sobrenome  => :sobrenome,
                    p_email      => :email,
                    p_orcamento  => :orcamento_mensal
                );
            END;
        """, {
            "usuario_id": usuario_id,
            "nome": nome_var,
            "sobrenome": sobrenome_var,
            "email": email_var,
            "orcamento_mensal": orcamento_var
        })

        nome = nome_var.getvalue()
        sobrenome = sobrenome_var.getvalue()
        email = email_var.getvalue()
        orcamento = orcamento_var.getvalue()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar informações do usuário: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar informações do usuário")
    else:
        return MeResponse(nome=nome, sobrenome=sobrenome, email=email, orcamento_mensal=orcamento)


@router.post("/redefinir_senha", response_model=MessageResponse)
def redefinir_senha(email_destino: str, connection=Depends(get_db)):

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT usuario_id FROM usuarios WHERE email = :email", {"email": email_destino})
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Email não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao gerar token de redefinição de senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar token de redefinição de senha.")

    
    try:
        token = jwt.encode(
            {"email": email_destino, "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1)},
            SECRET_KEY,
            algorithm="HS256"
        )
        enviar_redefinicao_senha(email_destino, token)
    except Exception as e:
        print(f"Erro ao enviar email de redefinição de senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar email de redefinição de senha.")
    else:
        return MessageResponse(msg="Email de redefinição de senha enviado com sucesso.")


@router.put("/redefinir_senha", response_model=MessageResponse)
def atualizar_senha(body: RedefinirSenhaRequest, connection=Depends(get_db)):
    

    try:
        if not body.nova_senha:
            raise HTTPException(status_code=400, detail="Nova senha é obrigatória")
        
        payload = jwt.decode(body.token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=404, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=404, detail="Token expirado")
    except jwt.InvalidTokenError as e:
        print(f"Erro ao decodificar token JWT: {e}")
        raise HTTPException(status_code=404, detail="Token inválido")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao validar token JWT: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao validar token JWT.")

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT usuario_id FROM usuarios WHERE email = :email", {"email": email})
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Email não encontrado")

        usuario_id = result[0]
        cursor.execute(
            "UPDATE usuarios SET senha = pkg_auth.encrypt_pwd(:senha) WHERE usuario_id = :usuario_id",
            {"senha": body.nova_senha, "usuario_id": usuario_id}
        )
        connection.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao atualizar senha: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar senha.")
    else:
        return MessageResponse(msg="Senha atualizada com sucesso.")

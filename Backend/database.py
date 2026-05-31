import os
import zipfile
import oracledb

_wallet_dir = None

def setup_wallet():
    global _wallet_dir
    if _wallet_dir:
        return _wallet_dir

    wallet_path = os.getenv("DB_WALLET_LOCATION", "")
    if wallet_path.endswith(".zip") and os.path.exists(wallet_path):
        _wallet_dir = "/tmp/oracle_wallet"
        os.makedirs(_wallet_dir, exist_ok=True)
        with zipfile.ZipFile(wallet_path, "r") as zf:
            zf.extractall(_wallet_dir)
    else:
        _wallet_dir = wallet_path

    return _wallet_dir

def makeDBconnection():
    try:
        wallet_dir = setup_wallet()
        connection = oracledb.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dsn=os.getenv("DB_SERVICE_NAME"),
            config_dir=wallet_dir,
            wallet_location=wallet_dir,
            wallet_password=os.getenv("DB_WALLET_PASSWORD")
        )
    
    except Exception as e:
        print(f"Erro ao estabelecer conexão com o banco de dados: {e}")
        return 'Erro ao estabelecer conexão: ' + str(e)
    
    else:
        return connection

def get_db():
    connection = makeDBconnection()
    try:
        yield connection
    finally:
        if connection and not isinstance(connection, str):
            connection.close()
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import os

def enviar_redefinicao_senha(email_destino, token):
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("related")
    msg["Subject"] = "Redefinição de senha"
    msg["From"] = email_sender
    msg["To"] = email_destino

    template_path = './utils/email_redefinicao_senha.html'
    with open(template_path, encoding="utf-8") as f:
        html = f.read().replace("{{token}}", token)

    msg.attach(MIMEText(html, "html"))

    logo_path = os.path.join(os.path.dirname(__file__), '..', 'Frontend', 'src', 'assets', 'Scan2Spend_logo.png')
    with open(logo_path, 'rb') as f:
        img = MIMEImage(f.read())
        img.add_header('Content-ID', '<logo_scan2spend>')
        img.add_header('Content-Disposition', 'inline')
        msg.attach(img)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(email_sender, email_password)
        smtp.send_message(msg)
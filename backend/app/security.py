import jwt
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from app.config import settings

# Fernet secret key
_fernet = Fernet(settings.encryption_key.encode())

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def encrypt_token(token: str) -> str:
    """Encrypts a plaintext token for secure db storage."""
    if not token:
        return ""
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypts a token from the db back to plaintext."""
    if not encrypted_token:
        return ""
    return _fernet.decrypt(encrypted_token.encode()).decode()


def create_access_token(data: dict) -> str:
    """Creates a JWT for frontend session management."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)
    return encoded_jwt

import time
import jwt
import httpx
from pathlib import Path
from app.config import settings


def load_private_key() -> bytes:
    """
    GitHub App private key, resolved relative to root.
    """
    current_file = Path(__file__).resolve()
    project_root = current_file.parents[2]

    key_path_str = settings.github_private_key_path
    key_path = Path(key_path_str)

    if not key_path.is_absolute():
        key_path = project_root / key_path_str

    if not key_path.exists():
        # Fallback, relative to CWD
        if Path(key_path_str).exists():
            return Path(key_path_str).read_bytes()
        raise FileNotFoundError(f"GitHub private key not found at: {key_path}")

    return key_path.read_bytes()


def generate_github_jwt() -> str:
    """
    Generates a JWT for authenticating as the GitHub App.
    Algorithm: RS256
    Expiration: 10 minutes
    """
    private_key = load_private_key()

    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + (10 * 60), "iss": settings.github_app_id}

    return jwt.encode(payload, private_key, algorithm="RS256")


async def get_installation_access_token(installation_id: int) -> str:
    """
    Exchanges an installation_id for an Installation Access Token (IAT).
    """
    jwt_token = generate_github_jwt()

    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["token"]

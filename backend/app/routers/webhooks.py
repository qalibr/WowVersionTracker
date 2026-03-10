import hmac
import hashlib
import logging
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlmodel import select, Session

from app.config import settings
from app.database import get_session
from app.models import User

router = APIRouter(tags=["webhooks"])
logger = logging.getLogger(__name__)


async def verify_signature(request: Request):
    """
    Verifies that the payload was sent by GitHub using the secret.
    """
    signature = request.headers.get("X-Hub-Signature-256")
    if not signature:
        raise HTTPException(status_code=403, detail="Missing signature header")

    body = await request.body()
    
    # Create local hash
    local_signature = "sha256=" + hmac.new(
        key=settings.github_webhook_secret.encode(),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(local_signature, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: str = Header(alias="X-GitHub-Event"),
    db: Session = Depends(get_session),
):
    # 1. Verify Signature
    await verify_signature(request)

    payload = await request.json()
    action = payload.get("action")

    # 2. Handle Installation Events
    if x_github_event == "installation":
        if action == "deleted":
            installation_id = payload.get("installation", {}).get("id")
            logger.info(f"Installation {installation_id} deleted. Removing from DB.")
            
            # Find user with this installation_id and clear it
            statement = select(User).where(User.installation_id == installation_id)
            user = db.exec(statement).first()
            if user:
                user.installation_id = None
                db.add(user)
                db.commit()

    # 3. Handle Push Events (Sync logic)
    elif x_github_event == "push":
        # TODO: Identify which repo was pushed to and trigger an immediate check
        repo_full_name = payload.get("repository", {}).get("full_name")
        logger.info(f"Received push event for {repo_full_name}")

    return {"status": "ok"}
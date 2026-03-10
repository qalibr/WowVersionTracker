import logging
import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from datetime import datetime, timezone

from app.models import User
from app.database import get_session
from app.config import settings
from app.security import encrypt_token, create_access_token

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


@router.get("/github/login")
async def github_login():
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize?client_id={settings.github_client_id.strip()}"
    )


@router.get("/github/callback")
async def github_callback(
    request: Request,
    db: Session = Depends(get_session),
    code: str = None,
    error: str = None,
    installation_id: int = None,
    setup_action: str = None,
):
    if error:
        return RedirectResponse(url=settings.frontend_url)

    # Handle Post-Installation: User installed app and was redirected back (No code, but has installation_id)
    if not code and installation_id:
        token_cookie = request.cookies.get("access_token")
        if token_cookie:
            token_str = token_cookie.replace("Bearer ", "")
            try:
                payload = jwt.decode(
                    token_str, settings.jwt_secret, algorithms=["HS256"]
                )
                user_id = int(payload.get("sub"))
                user = db.get(User, user_id)
                if user:
                    user.installation_id = installation_id
                    db.add(user)
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to link installation: {e}")
        return RedirectResponse(url=settings.frontend_url)

    if not code:
        return RedirectResponse(url=settings.frontend_url)

    client_id = settings.github_client_id
    client_secret = settings.github_client_secret

    # Exchange the temporary code for a real access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            logger.error(
                f"GitHub Token Exchange Failed ({token_res.status_code}): {token_res.text}"
            )
            return RedirectResponse(
                url=f"{settings.frontend_url}?error=token_exchange_failed"
            )

        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            logger.error(f"GitHub Token Exchange Error: {token_data}")
            return RedirectResponse(
                url=f"{settings.frontend_url}?error=no_access_token"
            )

        # Fetch the user's public profile from GitHub
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_res.status_code != 200:
            logger.error(
                f"GitHub User Profile Fetch Failed ({user_res.status_code}): {user_res.text}"
            )
            return RedirectResponse(
                url=f"{settings.frontend_url}?error=user_fetch_failed"
            )

        gh_user = user_res.json()

    # Upsert the user
    statement = select(User).where(User.github_id == gh_user["id"])
    db_user = db.exec(statement).first()

    if not db_user:
        db_user = User(
            github_id=gh_user["id"],
            username=gh_user["login"],
            email=gh_user.get("email"),
        )
        db.add(db_user)

    # Always update the token in case it changed/expired
    db_user.github_access_token = encrypt_token(access_token)

    # If this was an installation flow, save the installation_id
    if installation_id:
        db_user.installation_id = installation_id

    db.commit()
    db.refresh(db_user)

    # Create a JWT session for the React frontend
    jwt_token = create_access_token(data={"sub": str(db_user.id)})

    redirect_response = RedirectResponse(url=settings.frontend_url)
    redirect_response.set_cookie(
        key="access_token",
        value=f"Bearer {jwt_token}",
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )

    # Check if the user has installed the app
    if not db_user.installation_id and not installation_id:
        redirect_response = RedirectResponse(
            url=f"https://github.com/apps/{settings.github_app_slug}/installations/new"
        )
        # Re-attach the cookie so the session persists through the installation
        redirect_response.set_cookie(
            key="access_token",
            value=f"Bearer {jwt_token}",
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 7,
            path="/",
        )
        return redirect_response

    return redirect_response


@router.get("/me")
async def get_current_user(request: Request, db: Session = Depends(get_session)):
    """Let's React check if the user is currently logged in."""
    token_cookie = request.cookies.get("access_token")
    if not token_cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_str = token_cookie.replace("Bearer ", "")

    try:
        payload = jwt.decode(token_str, settings.jwt_secret, algorithms=["HS256"])
        user_id_str = payload.get("sub")

        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        user_id = int(user_id_str)

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": user.id, "username": user.username, "github_id": user.github_id}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

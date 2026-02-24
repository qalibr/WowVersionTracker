import logging

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import WowVersion

router = APIRouter()
logger = logging.getLogger(__name__)
@router.get("/versions/{product}")
async def get_versions(product: str, db: Session = Depends(get_session)):
    """
    Get the latest discovered version for each region of a given product.
    """
    subquery = (
        select(
            WowVersion.region,
            func.max(WowVersion.discovered_at).label("max_discovered_at"),
        )
        .where(WowVersion.product == product)
        .group_by(WowVersion.region)
        .subquery()
    )

    statement = (
        select(WowVersion)
        .join(
            subquery,
            (WowVersion.region == subquery.c.region)
            & (WowVersion.discovered_at == subquery.c.max_discovered_at),
        )
        .where(WowVersion.product == product)
        .order_by(WowVersion.region)
    )

    versions = db.exec(statement).all()
    return versions


@router.get("/products")
async def get_wow_products(db: Session = Depends(get_session)):
    """
    Get a list of all products that have at least one version in the database.
    """
    statement = select(WowVersion.product).distinct()
    db_products = db.exec(statement).all()

    db_products.sort(key=lambda x: (x != "wow", x))

    return {"products": db_products}


@router.get("/status")
async def health_check():
    return {"status": "ok", "message": "API is running."}

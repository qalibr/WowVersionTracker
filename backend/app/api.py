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
    Get the top 3 latest discovered versions for each region of a given product.
    Returns a dictionary keyed by region, containing lists of versions.
    """
    statement = (
        select(WowVersion)
        .where(WowVersion.product == product)
        .order_by(WowVersion.region, WowVersion.discovered_at.desc())
    )
    all_versions = db.exec(statement).all()

    grouped_versions = {}
    for v in all_versions:
        if v.region not in grouped_versions:
            grouped_versions[v.region] = []

        if len(grouped_versions[v.region]) < 3:
            grouped_versions[v.region].append(v)

    return grouped_versions


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

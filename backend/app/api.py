import asyncio
import time
import logging

from fastapi import APIRouter, Depends
from app.ribbit import RibbitClient
from sqlmodel import Session, select
from app.database import get_session
from app.models import WowVersion

router = APIRouter()
logger = logging.getLogger(__name__)

version_cache = {}
CACHE_TTL_SECONDS = 60 * 15

products_cache = {"timestamp": 0, "data": []}
PRODUCTS_CACHE_TIL_SECONDS = 60 * 60

KNOWN_WOW_PRODUCTS = [
    "wow",
    "wowt",
    "wowxptr",
    "wow_beta",
    "wow_classic",
    "wow_classic_ptr",
    "wow_classic_beta",
    "wow_classic_era",
    "wow_classic_era_ptr",
    "wowdev",
    "wowlivetest",
]


@router.get("/versions/{product}")
async def get_versions(product: str, db: Session = Depends(get_session)):
    if product in version_cache:
        timestamp, data = version_cache[product]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            return data

    client = RibbitClient(product)
    data = await asyncio.to_thread(client.fetch_data)

    if data:
        version_cache[product] = (time.time(), data)
        for version_data in data:
            statement = select(WowVersion).where(
                WowVersion.product == product,
                WowVersion.version_name == version_data.get("VersionsName"),
                WowVersion.build_id == version_data.get("BuildId"),
            )
            existing_version = db.exec(statement).first()

            if not existing_version:
                new_version = WowVersion(
                    product=product,
                    version_name=version_data.get("VersionsName"),
                    build_id=version_data.get("BuildId"),
                )
                db.add(new_version)
        db.commit()

    return data


@router.get("/products")
async def get_wow_products(db: Session = Depends(get_session)):
    if (
        time.time() - products_cache["timestamp"] < PRODUCTS_CACHE_TIL_SECONDS
        and products_cache["data"]
    ):
        logger.info("Serving /products from cache")
        return {"products": products_cache["data"]}

    logger.info("Cache miss for /products, fetching from CDN...")

    async def check_product(prod_name):
        client = RibbitClient(prod_name)
        data = await asyncio.to_thread(client.fetch_data)
        return prod_name, data

    tasks = [check_product(prod) for prod in KNOWN_WOW_PRODUCTS]
    results = await asyncio.gather(*tasks)

    active_products = []

    for prod_name, data in results:
        if data:
            active_products.append(prod_name)
            for version_data in data:
                statement = select(WowVersion).where(
                    WowVersion.product == prod_name,
                    WowVersion.version_name == version_data.get("VersionsName"),
                    WowVersion.build_id == version_data.get("BuildId"),
                )
                existing_version = db.exec(statement).first()

                if not existing_version:
                    new_version = WowVersion(
                        product=prod_name,
                        version_name=version_data.get("VersionsName"),
                        build_id=version_data.get("BuildId"),
                    )
                    db.add(new_version)

    db.commit()

    active_products.sort(key=lambda x: (x != "wow", x))

    products_cache["timestamp"] = time.time()
    products_cache["data"] = active_products

    return {"products": active_products}


@router.get("/status")
async def health_check():
    return {"status": "ok", "message": "API is running."}

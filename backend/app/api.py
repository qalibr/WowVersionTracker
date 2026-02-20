from fastapi import APIRouter
from app.ribbit import RibbitClient
import asyncio
import time
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

version_cache = {}
CACHE_TTL_SECONDS = 60 * 15

# The definitive list of all known WoW CDN branches
KNOWN_WOW_PRODUCTS = [
    "wow",  # Retail
    "wowt",  # Retail PTR
    "wowxptr",  # Retail PTR 2
    "wow_beta",  # Retail Beta
    "wow_classic",  # Progression Classic
    "wow_classic_ptr",  # Progression Classic PTR
    "wow_classic_beta",  # Progression Classic Beta
    "wow_classic_era",  # Classic Era / Hardcore / SoD
    "wow_classic_era_ptr",  # Classic Era PTR
    "wowdev",  # Internal Dev
    "wowlivetest",  # Internal Live Test
]


@router.get("/versions/{product}")
async def get_versions(product: str):
    if product in version_cache:
        timestamp, data = version_cache[product]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            return data

    client = RibbitClient(product)
    data = await asyncio.to_thread(client.fetch_data)

    if data:
        version_cache[product] = (time.time(), data)

    return data


@router.get("/products")
async def get_wow_products():
    active_products = []

    async def check_product(prod_name):
        client = RibbitClient(prod_name)
        data = await asyncio.to_thread(client.fetch_data)
        if data:
            active_products.append(prod_name)

    tasks = [check_product(prod) for prod in KNOWN_WOW_PRODUCTS]
    await asyncio.gather(*tasks)

    # Sort, retail first, then alphabetical
    active_products.sort(key=lambda x: (x != "wow", x))

    return {"products": active_products}


@router.get("/status")
async def health_check():
    return {"status": "ok", "message": "API is running."}

import asyncio
import logging

from sqlmodel import Session, select

from app.database import engine
from app.ribbit import RibbitClient
from app.models import WowVersion

logger = logging.getLogger(__name__)

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
FETCH_INTERVAL_SECONDS = 60 * 15


def _update_versions_in_db(db: Session, product: str, versions_data: list):
    """Helper to update the database with new versions for a product."""
    if not versions_data:
        return

    for version_data in versions_data:
        statement = select(WowVersion).where(
            WowVersion.product == product,
            WowVersion.region == version_data.get("Region"),
            WowVersion.version_name == version_data.get("VersionsName"),
            WowVersion.build_id == version_data.get("BuildId"),
        )
        if not db.exec(statement).first():
            logger.info(
                f"New version found for {product} ({version_data.get('Region')}): "
                f"{version_data.get('VersionsName')} ({version_data.get('BuildId')})"
            )
            new_version = WowVersion(
                product=product,
                region=version_data.get("Region"),
                version_name=version_data.get("VersionsName"),
                build_id=version_data.get("BuildId"),
                build_config=version_data.get("BuildConfig"),
            )
            db.add(new_version)
    db.commit()


async def periodic_version_check():
    """Periodically fetches versions for all known products and updates the DB."""
    logger.info("Starting periodic version check background task.")
    while True:
        logger.info("Running scheduled version check...")
        tasks = [asyncio.to_thread(RibbitClient(prod).fetch_data) for prod in KNOWN_WOW_PRODUCTS]
        results = await asyncio.gather(*tasks)

        with Session(engine) as session:
            for i, prod_name in enumerate(KNOWN_WOW_PRODUCTS):
                _update_versions_in_db(session, prod_name, results[i])

        logger.info(f"Version check finished. Sleeping for {FETCH_INTERVAL_SECONDS} seconds.")
        await asyncio.sleep(FETCH_INTERVAL_SECONDS)
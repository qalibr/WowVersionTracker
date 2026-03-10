import asyncio
import logging
import httpx

from sqlmodel import Session, select

from app.database import engine
from app.ribbit import RibbitClient
from app.models import WowVersion, User
from app.github_auth import get_installation_access_token

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


async def check_tracked_repos():
    """
    Iterates over users with an installation_id, gets an IAT, and checks their tracked repos.
    """
    with Session(engine) as session:
        # Find users who have installed the GitHub App
        statement = select(User).where(User.installation_id != None)
        users = session.exec(statement).all()

        for user in users:
            try:
                # 1. Get Installation Access Token (IAT)
                token = await get_installation_access_token(user.installation_id)

                # 2. Check each repo tracked by this user
                for repo in user.tracked_repos:
                    try:
                        # Fetch raw content of the .toc file
                        # TODO this annoys Vite reload
                        url = f"https://api.github.com/repos/{repo.repo_full_name}/contents/{repo.toc_file_path}"
                        headers = {
                            "Authorization": f"Bearer {token}",
                            "Accept": "application/vnd.github.raw+json",
                        }
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(url, headers=headers)
                            if resp.status_code == 200:
                                content = resp.text
                                # TODO: Parse 'Interface: 12345' from content and update DB
                                logger.info(f"Fetched TOC for {repo.repo_full_name}: {len(content)} bytes")
                            else:
                                logger.warning(f"Failed to fetch {repo.repo_full_name}: {resp.status_code}")
                    except Exception as e:
                        logger.error(f"Error checking repo {repo.repo_full_name}: {e}")
            except Exception as e:
                logger.error(f"Error processing user {user.username} (install_id={user.installation_id}): {e}")

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

        # Also check user repositories
        await check_tracked_repos()

        logger.info(f"Version check finished. Sleeping for {FETCH_INTERVAL_SECONDS} seconds.")
        await asyncio.sleep(FETCH_INTERVAL_SECONDS)
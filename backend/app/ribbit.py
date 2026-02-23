import logging
import urllib.request
import urllib.error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RibbitClient:
    BASE_URL = "http://eu.patch.battle.net:1119"
    TIMEOUT = 5

    def __init__(self, product="wow"):
        self.product = product

    def fetch_data(self):
        url = f"{self.BASE_URL}/{self.product}/versions"

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=self.TIMEOUT) as response:
                text_data = response.read().decode("utf-8")
                return self._parse_v2_response(text_data)

        except urllib.error.HTTPError as e:
            if e.code != 404:
                logger.error(
                    f"HTTP fetch failed for {self.product}: {e.code} {e.reason}"
                )
        except Exception as e:
            logger.error(f"Unexpected error fetching {self.product}: {e}")

        return []

    def _parse_v2_response(self, text):
        lines = text.strip().split("\n")
        if len(lines) < 3:
            return []

        # Line 0 is headers
        raw_headers = lines[0].split("|")
        headers = [h.split("!")[0] for h in raw_headers]

        results = []
        # Skip the '## seqn = X' line and parse the data
        for line in lines[2:]:
            values = line.split("|")
            if len(values) == len(headers):
                results.append(dict(zip(headers, values)))

        return results

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawRecord:
    source: str
    collected_at: datetime
    content_hash: str
    payload: dict


class BaseConnector(ABC):
    source_name: str
    base_url: str

    @abstractmethod
    async def collect(self) -> list[RawRecord]: ...

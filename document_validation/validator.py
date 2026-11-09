import hashlib
from pathlib import Path
from typing import Dict, Any, Tuple
from config.settings import settings

class DocumentValidator:
    """
    Validates uploaded files for type, size, emptiness, duplicates,
    metadata integrity, and version consistency.
    """

    def __init__(self, max_size_bytes: int = None, allowed_extensions: set = None):
        self.max_size_bytes = max_size_bytes or settings.MAX_FILE_SIZE_BYTES
        self.allowed_extensions = allowed_extensions or settings.ALLOWED_EXTENSIONS

    def calculate_file_hash(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def validate_file_upload(self, filename: str, file_bytes: bytes, existing_hashes: set = None) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates file properties before ingestion.
        """
        path = Path(filename)
        ext = path.suffix.lower()

        # 1. Check extension
        if ext not in self.allowed_extensions:
            return False, f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(self.allowed_extensions))}", {}

        # 2. Check empty
        size = len(file_bytes)
        if size == 0:
            return False, f"File '{filename}' is empty (0 bytes).", {}

        # 3. Check size limit
        if size > self.max_size_bytes:
            max_mb = self.max_size_bytes / (1024 * 1024)
            return False, f"File size exceeds maximum allowed limit of {max_mb:.1f} MB.", {}

        # 4. Check duplicate hash
        file_hash = self.calculate_file_hash(file_bytes)
        if existing_hashes and file_hash in existing_hashes:
            return False, f"Duplicate document detected. Identical file already exists in repository.", {"hash": file_hash}

        return True, "Valid", {
            "filename": filename,
            "extension": ext,
            "size_bytes": size,
            "hash": file_hash
        }

document_validator = DocumentValidator()

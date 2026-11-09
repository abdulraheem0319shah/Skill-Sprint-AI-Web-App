from typing import List, Dict, Any
from document_processing.parser import document_parser

class DocumentChunker:
    """
    Dedicated semantic chunker for enterprise document processing.
    Preserves document code, version, section titles, and location references.
    """

    def __init__(self, chunk_size: int = 1500):
        self.chunk_size = chunk_size

    def chunk(self, parsed_document: Dict[str, Any]) -> List[Dict[str, Any]]:
        return document_parser.chunk_document(parsed_document, max_chunk_chars=self.chunk_size)

document_chunker = DocumentChunker()

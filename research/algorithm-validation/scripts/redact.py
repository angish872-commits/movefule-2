#!/usr/bin/env python3
from __future__ import annotations
import os
import re
import sys
from pathlib import Path

SECRET_NAMES = {
    "GEMINI_API_KEY",
    "USDA_FDC_API_KEY",
    "FDC_API_KEY",
    "APPWRITE_API_KEY",
    "APPWRITE_KEY",
}


def redact(text: str) -> str:
    values = [os.getenv(name, "") for name in SECRET_NAMES]
    for value in values:
        if value and len(value) >= 6:
            text = text.replace(value, "[REDACTED_SECRET]")
    # Generic key=value safety net for common secret variable names.
    text = re.sub(r"(?im)^((?:GEMINI|USDA_FDC|FDC|APPWRITE)[A-Z0-9_]*(?:KEY|TOKEN|SECRET)\s*=\s*).+$", r"\1[REDACTED_SECRET]", text)
    return text


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: redact.py <input> <output>", file=sys.stderr)
        return 2
    src, dst = map(Path, sys.argv[1:])
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(redact(src.read_text(encoding="utf-8", errors="replace")), encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

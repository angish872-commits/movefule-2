"""Small JSON worker used by the Node OpenCV pixel-quality adapter."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .vision_quality import assessment_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    print(json.dumps(assessment_json(args.image), separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

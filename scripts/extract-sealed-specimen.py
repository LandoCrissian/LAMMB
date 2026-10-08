"""Crop the owner-authorized preview views; requires an existing Pillow install.

No resizing, repainting, filtering, downloads or inference. The entire source
stays outside public/. Coordinates are native pixels, right/bottom exclusive.
"""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE_SHA256 = "5f7becf4b2effc8c59be38da8d0ab52cfd957d6765a3eb85abdb1933b7a80bd2"
VIEWS = {
    "front": (899, 43, 1013, 190),
    "side": (1015, 43, 1114, 190),
    "rear": (1120, 43, 1224, 190),
}


def preserve(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"Refusing to overwrite different bytes: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError("STOP_FOR_ART_ASSET: source digest mismatch")
    root = Path(__file__).resolve().parent.parent
    preserve(root / "artifacts/generated/task-005c/source/LAMMB-REF-003.jpg", raw)
    output = root / "apps/web/public/art/sealed-specimen"
    output.mkdir(parents=True, exist_ok=True)
    derivatives = []
    with Image.open(args.source) as source:
        if source.size != (1280, 853) or source.mode != "RGB":
            raise ValueError("Unexpected source dimensions/mode")
        for view, bounds in VIEWS.items():
            from io import BytesIO

            crop = source.crop(bounds)
            buffer = BytesIO()
            crop.save(buffer, format="PNG", compress_level=9)
            data = buffer.getvalue()
            preserve(output / f"{view}.png", data)
            derivatives.append({
                "view": view,
                "path": f"/art/sealed-specimen/{view}.png",
                "cropBounds": list(bounds),
                "width": crop.width,
                "height": crop.height,
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
                "operation": "NATIVE_PIXEL_CROP_TO_LOSSLESS_PNG",
            })
    manifest = {
        "version": "lammb-sealed-preview/1",
        "authorization": "OWNER_TASK_005C_WEBSITE_PREVIEW_ONLY",
        "productionNFTArtworkApproved": False,
        "source": {
            "id": "LAMMB-REF-003",
            "originalFilename": "3-Photo-3.jpg",
            "attachmentIdentifier": "01a114b7-7fce-7830-8e15-0054cd40bb6d/40EE5D54-FD1A-448A-BF53-1FFCFD49A853/3-Photo-3.jpg",
            "sha256": SOURCE_SHA256,
            "width": 1280,
            "height": 853,
            "bytes": len(raw),
            "provenance": "OWNER_SUPPLIED_CONCEPT_SHEET; original preserved byte-for-byte offline, not publicly served",
        },
        "coordinates": "Native decoded RGB pixels; [left, top, right, bottom], right/bottom exclusive",
        "excluded": "Captions, arrows, borders, post-reveal character example, other sheet panels, rarity and partner claims",
        "limitations": "Small JPEG source panels; no enhancement or reconstructed detail. Three 2D concept views, not a 3D model or minted specimen.",
        "derivatives": derivatives,
    }
    manifest_path = output / "provenance.json"
    if manifest_path.exists():
        if json.loads(manifest_path.read_text(encoding="utf-8")) != manifest:
            raise ValueError("Refusing to replace different provenance")
    else:
        preserve(manifest_path, (json.dumps(manifest, indent=2) + "\n").encode())
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

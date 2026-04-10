import marimo

__generated_with = "0.21.0"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return


@app.cell
def _():
    import h5py
    import polars
    import numpy as np
    import altair as alt
    from PIL import Image, ImageOps

    return Image, ImageOps, h5py, np


@app.cell
def _(h5py, np):
    with h5py.File("./data/dual-task/pilot-0.2.h5") as hdf:
        drawings = np.asarray(hdf["drawings"])
        scenes = np.asarray(hdf["scene_id"])
        doors = np.asarray(hdf["door"])
    return doors, drawings, scenes


@app.cell
def _(doors, np, scenes):
    unique_scenes = np.unique(scenes, sorted=True)
    unique_doors = np.unique(doors, sorted=True)
    return unique_doors, unique_scenes


@app.cell
def _(
    Image,
    ImageOps,
    doors,
    drawings,
    np,
    scenes,
    unique_doors,
    unique_scenes,
):
    averaged_drawings = []
    H, W = (491, 873)  # As of pilot-0.2, March 2025

    for door in unique_doors:
        door_mask = doors == door
        for scene in unique_scenes:
            mask = (scenes == scene) & door_mask
            average = np.mean(drawings[mask], axis=0)[:, :, 0]
            average = Image.fromarray((average * 255).astype(np.uint8))
            average = ImageOps.scale(average, 0.5)
            if scene % 2 == 0:
                average = average.transpose(Image.FLIP_LEFT_RIGHT)

            averaged_drawings.append(
                {"scene": int(scene), "door": int(door), "drawing": average}
            )
    return (averaged_drawings,)


@app.cell
def _(averaged_drawings):
    averaged_drawings[0]["drawing"]
    return


@app.cell
def _(Image, unique_doors, unique_scenes):
    def create_grid(images):
        rows = len(unique_scenes)
        cols = len(unique_doors)
        width = images[0]["drawing"].width
        height = images[0]["drawing"].height

        grid = Image.new("RGB", (width * cols, height * rows))

        for chunk in images:
            x = chunk["door"] - 1
            y = chunk["scene"] - 1
            grid.paste(chunk["drawing"], ((x % cols) * width, y * height))

        return grid

    return (create_grid,)


@app.cell
def _(averaged_drawings, create_grid):
    create_grid(averaged_drawings)
    return


if __name__ == "__main__":
    app.run()

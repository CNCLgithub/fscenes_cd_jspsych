#!/usr/bin/env python3

import io
import os
import json
import glob
import h5py
import base64
import argparse
import numpy as np
import polars as pl
from PIL import Image


cd_schema = {
    'scene' : pl.UInt16,
    'door' : pl.UInt8,
    'same' : pl.Boolean,
    'correct' : pl.Boolean,
    'rt' : pl.Float64,
    'order' : pl.Int64,
    'uid' : pl.Int64,
    'pid' : pl.String
}

DRAWING_DATABASE='./data/hand_drawings_by_scene.h5'
DRAWING_DIM = (491, 873) # As of pilot-0.2, March 2025

def add_drawing(f, uid: int, scene_id: int, door: bool, img: np.ndarray):
    """ img shape should be (H,W) or (H,W,1) or (H,W,3) """
    img = np.asarray(img)
    if img.ndim == 2:
        img = img[..., None]  # → (H,W,1)

    if "drawings" not in f:
        maxshape = (None, *img.shape)
        dset = f.create_dataset("drawings", shape=(0, *img.shape),
                               maxshape=maxshape,
                               dtype=np.uint8,
                               compression="gzip",
                               chunks=(1, *img.shape))
        f.create_dataset("uid", shape=(0,), maxshape=(None,), dtype=np.uint32)
        f["uid"].attrs["description"] = "Unique subject identifier"
        f.create_dataset("scene_id", shape=(0,), maxshape=(None,), dtype=np.uint32)
        f.create_dataset("door", shape=(0,), maxshape=(None,), dtype=np.uint8)
        f["door"].attrs["description"] = \
            "Whether the door is to the left (1) or right (2)"
    else:
        dset = f["drawings"]

    # Resize all datasets
    n = len(f["uid"])
    for name in ["drawings", "uid", "scene_id", "door"]:
        f[name].resize(n+1, axis=0)

    f["drawings"][n] = img
    f["uid"][n]      = uid
    f["scene_id"][n] = scene_id
    f["door"][n]     = door

def parse_cd_trial(df, data : dict):
    scene, door = data['a'].split('_')[:2]
    df['scene'].append(int(scene))
    df['door'].append(int(door))
    same = data['a'] == data['b']
    correct = data['response'] == 'f' if same else data['response'] == 'j'
    df['same'].append(same)
    df['correct'].append(correct)
    df['rt'].append(data['rt'])
    df['order'].append(data['trial_index'])

# from: https://stackoverflow.com/a/45123730
stub = "data:image/png;base64,"
def decode_img(msg):
    msg = msg[(msg.find(stub)+len(stub)):]
    msg = base64.b64decode(msg)
    buf = io.BytesIO(msg)
    img = Image.open(buf).convert('L')
    img = np.asarray(img)
    return img

def parse_draw_trial(f, uid: int, data: dict):
    scene, door = data['img'].split('_')[:2]
    drawing = decode_img(data['png'])
    add_drawing(f, uid, scene, door, drawing)

def parse_subj_data(drawing_file, timeline: list, unique_id: int):

    pid = None
    # get prolific id
    for step in timeline:
        if step.get('type', None) == 'prolific_id':
            pid = step['response']['Q0']

    # look for the start of the experimental trials
    exp_start = 0
    for i, step in enumerate(timeline):
        if step.get('type', None) == 'comp_quiz' and step.get('correct', False):
            exp_start = i + 2 # two ahead
            break

    timeline = timeline[exp_start:-1] # last step is the exit page
    data = {'scene' : [], 'door' : [], 'same' : [],
            'correct' : [], 'rt' : [], 'order' : []}

    for step in timeline:
        trial_type = step.get('trial_type', '')
        has_response = step.get('response', False)
        # Change detection trial
        if trial_type == 'html-keyboard-response' and has_response:
            parse_cd_trial(data, step)
        elif trial_type == 'sketchpad' and has_response:
            parse_draw_trial(drawing_file, unique_id, step)

    data['uid'] = unique_id
    data['pid'] = pid
    return pl.DataFrame(data, schema=cd_schema)

def main():

    parser = argparse.ArgumentParser(
        description = 'Parses JATOS data',
        formatter_class = argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('dataset', type = str,
                        help = "Which scene dataset to use")
    args = parser.parse_args()
    raw = []

    with open(args.dataset, "r") as f:
        for (i, subj) in enumerate(f):
            try:
                raw.append(json.loads(subj))
            except:
                print(f'Could not interpret entry {i}')

    drawings_out = args.dataset.replace(".txt", ".h5")
    result = pl.DataFrame(schema=cd_schema)
    with h5py.File(drawings_out, "w") as draw_file:
        for idx, subj in enumerate(raw):
            df = parse_subj_data(draw_file, subj, idx)
            result.vstack(df, in_place=True)

    pl.Config.set_tbl_rows(100)
    subjects = result.group_by('pid').agg(pl.len())
    print(result.group_by("same", "door").agg(pl.mean("correct")).sort("same", "door"))

    result_out = args.dataset.replace(".txt", ".csv")
    print(result_out)
    result.write_csv(result_out)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3

import os
import json
import glob
import argparse
import numpy as np
import polars as pl

import io
import base64
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
    img.save('test.png')
    img = np.asarray(img)
    return img

def parse_draw_trial(data: dict):
    scene, door = data['img'].split('_')[:2]
    return decode_img(data['png'])
    # df['scene'].append(int(scene))
    # df['door'].append(int(door))
    # df['same'].append(same)
    # df['correct'].append(correct)
    # df['rt'].append(data['rt'])
    # df['order'].append(data['trial_index'])



def parse_subj_data(timeline: list, unique_id: int):

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
        print(trial_type)
        has_response = step.get('response', False)
        # Change detection trial
        if trial_type == 'html-keyboard-response' and has_response:
            parse_cd_trial(data, step)
        elif trial_type == 'sketchpad' and has_response:
            print('Found draw trial')
            img = parse_draw_trial(step)
            print(img.shape)

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

    result = pl.DataFrame(schema=cd_schema)
    for idx, subj in enumerate(raw):
        df = parse_subj_data(subj, idx)
        result.vstack(df, in_place=True)

    pl.Config.set_tbl_rows(100)
    subjects = result.group_by('pid').agg(pl.len())
    print(result.group_by("same", "door").agg(pl.mean("correct")).sort("same", "door"))

    result_out = args.dataset.replace(".txt", ".csv")
    print(result_out)
    result.write_csv(result_out)

if __name__ == '__main__':
    main()

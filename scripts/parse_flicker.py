#!/usr/bin/env python3

import os
import json
import glob
import argparse
import polars as pl


df_schema = {
    'scene': pl.UInt8,
    'door': pl.UInt8,
    'click_x' : pl.Float64,
    'click_y' : pl.Float64,
    'rt': pl.Float64,
    'order': pl.UInt16,
    'uid': pl.UInt16,
    'pid': pl.String,
}

def parse_trial_data(df, data : dict):
    scene, door = data['first_stim'].split('_')[:2]
    door, _ = os.path.splitext(door)
    df['scene'].append(int(scene))
    df['door'].append(int(door))
    df['click_x'].append(data['clickX'])
    df['click_y'].append(data['clickY'])
    df['rt'].append(data['rt'])
    df['order'].append(data['trial_index'])

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
    data = {'scene' : [], 'door' : [], 'click_x' : [],
            'click_y' : [], 'rt' : [], 'order' : []}

    for step in timeline:
        if step.get('response_trial', False):
            parse_trial_data(data, step)

    data['uid'] = unique_id
    data['pid'] = pid
    return pl.DataFrame(data, schema=df_schema)

def main():

    parser = argparse.ArgumentParser(
        description = 'Parses JATOS data',
        formatter_class = argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('dataset', type = str, nargs="+",
                        help = "Which scene dataset to use")
    args = parser.parse_args()
    raw = []
    for dfile in args.dataset:
        with open(dfile, "r") as f:
            for row in f:
                raw.append(json.loads(row))

    result = pl.DataFrame(schema=df_schema)
    for idx, subj in enumerate(raw):
        df = parse_subj_data(subj, idx)
        result.vstack(df, in_place=True)

    pl.Config.set_tbl_rows(100)
    subjects = result.group_by('pid').agg(pl.len())
    print(subjects.filter(pl.col('pid') == '652aad53d29f472a6dd31bb1'))
    print(result.group_by("uid", "door").agg(pl.mean("rt")).sort("uid", "door"))
    print(result.group_by("door").agg(pl.mean("rt")).sort("door"))

    dpath_name = args.dataset[0]
    result_out = dpath_name.replace(".txt", ".csv")
    result.write_csv(result_out)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3

import os
import json
import glob
import argparse
import polars as pl


df_schema = {
    'scene': pl.UInt8,
    'door': pl.UInt8,
    'correct': pl.Boolean,
    'rt': pl.Float64,
    'order': pl.UInt16,
    'uid': pl.UInt16
}

def parse_trial_data(df, data : dict):
    scene, door = data['a'].split('_')[:2]
    df['scene'].append(int(scene))
    df['door'].append(int(door))
    # NOTE: Only door '2' has path change
    correct = data['response'] == 'j' if door == '2' else data['response'] == 'f'
    df['correct'].append(correct)
    df['rt'].append(data['rt'])
    df['order'].append(data['trial_index'])

def parse_subj_data(timeline: dict, unique_id: int):

    # look for the start of the experimental trials
    exp_start = 0
    for i, step in enumerate(timeline):
        if step.get('type', None) == 'comp_quiz' and step.get('correct', False):
            exp_start = i + 2 # two ahead
            break

    timeline = timeline[exp_start:-1] # last step is the exit page
    data = {'scene' : [], 'door' : [],
            'correct' : [], 'rt' : [], 'order' : []}

    for exp_trial in timeline:
        if exp_trial.get('response', None) is None:
            continue
        parse_trial_data(data, exp_trial)

    data['uid'] = unique_id
    return pl.DataFrame(data, schema=df_schema)

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

    result = pl.DataFrame(schema=df_schema)
    for idx, subj in enumerate(raw):
        df = parse_subj_data(subj, idx)
        result.vstack(df, in_place=True)

    print(result)
    print(result.group_by('uid').agg(pl.len()))
    print(result.group_by("door").agg(pl.mean("correct"), pl.mean('rt')))

    with pl.Config(tbl_rows=20):
        print(
            result
            .group_by("scene", "door")
            .agg(pl.mean("correct"), pl.mean('rt'))
            .sort('scene', 'door')
        )

    dpath_name = args.dataset[0]
    result_out = dpath_name.replace(".txt", ".csv")
    result.write_csv(result_out)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3

import os
import json
import glob
import argparse
import polars as pl


df_schema = {
    'scene': pl.UInt8,
    'door': pl.UInt8,
    'same': pl.Boolean,
    'correct': pl.Boolean,
    'rt': pl.Float64,
    'order': pl.UInt16,
    'uid': pl.UInt16
}

schema = {
         'scene' : pl.UInt16,
         'door' : pl.UInt8,
         'correct' : pl.Boolean,
         'rt' : pl.Float64,
         'order' : pl.Int64,
         'uid' : pl.Int64,
         'pid' : pl.String
    }


def parse_trial_data(df, data : dict):
    scene, door = data['a'].split('_')[:2]
    df['scene'].append(int(scene))
    df['door'].append(int(door))
    same = data['a'] == data['b']
    correct = data['response'] == 'f' if same else data['response'] == 'j'
    df['same'].append(same)
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
    data = {'scene' : [], 'door' : [], 'same' : [],
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

    result_out = args.dataset.replace(".txt", ".csv")
    result.write_csv(result_out)

if __name__ == '__main__':
    main()

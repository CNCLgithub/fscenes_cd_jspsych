#!/usr/bin/env python3

import json
import glob
import polars as pl

def parse_trial_data(df, data : dict):
    scene, door = data['a'].split('_')
    df['scene'].append(int(scene))
    df['door'].append(int(door))
    df['same'].append(data['answer'] == 'same')
    df['correct'].append(data['correct'])
    df['rt'].append(data['rt'])
    df['order'].append(data['trial_index'])

def parse_jatos_file(path : str):

    unique_id = int(path.split('_')[-1][:-9])

    with open(path, 'r') as f:
        timeline = json.load(f)

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
        parse_trial_data(data, exp_trial)

    data['uid'] = unique_id
    return pl.DataFrame(data)

def main():
    data_dir = "data"
    data_files = glob.glob(f'{data_dir}/study_result_*/*/data.txt')
    result = pl.DataFrame()
    for f in data_files:
        df = parse_jatos_file(f)
        result = result.vstack(df)

    print(result)
    result.write_csv(f'{data_dir}/parsed_trials.csv')

if __name__ == '__main__':
    main()

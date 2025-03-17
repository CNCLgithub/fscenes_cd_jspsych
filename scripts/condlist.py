#!/usr/bin/env python3
import os
import csv
import json
import argparse

def main():

    parser = argparse.ArgumentParser(
        description = 'Generates condlist for experiment',
        formatter_class = argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--dataset', type = str,
                        help = "Which scene dataset to use",
                        default = 'window-0.1/2025-02-05_vifdDO')
    parser.add_argument('--exp', type = str,
                        help = "Which experiment",
                        default = 'implicit',
                        choices = ['implicit', 'pathchange'])
    args = parser.parse_args()

    dataset = 'data/datasets/' + args.dataset


    trials = []
    with open(dataset + '/scenes.csv', 'r') as f:
        reader = csv.reader(f)
        # groupby move
        for (i, row) in enumerate(reader):
            if i == 0:
                continue
            scene = int(row[0])
            flipx = row[1] == 'true'
            for door in [1, 2]:
                a = '{0:d}_{1:d}.png'.format(scene, door)
                # then proceed to make `a -> b` trials
                b = '{0:d}_{1:d}_blocked.png'.format(scene, door)
                trials.append([a, b, flipx])
                # add no change trials
                if args.exp == 'implicit':
                    trials.append([a, a, flipx])


    with open('assets/condlist.json', 'w') as f:
       json.dump(trials, f)


if __name__ == '__main__':
    main()

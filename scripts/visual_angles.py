#!/usr/bin/env python3

# from https://osdoc.cogsci.nl/3.3/visualangle/#convert-visual-degrees-to-pixels

# 10.65cm for 10-degrees @ ~60cm
# 15.7 cm for 15-degrees @ ~60cm

from math import atan2, degrees
h = 19.5         # Monitor height in cm
d = 60           # Distance between monitor and participant in cm
r = 1080         # Vertical resolution of the monitor
size_in_deg = 10. # The stimulus size in pixels
# Calculate the number of degrees that correspond to a single pixel. This will
# generally be a very small value, something like 0.03.
deg_per_px = degrees(atan2(.5 * h, d)) / (.5 * r)
print(f'{deg_per_px} degrees correspond to a single pixel')
# Calculate the size of the stimulus in degrees
size_in_px = size_in_deg / deg_per_px
print(f'The size of the stimulus is {size_in_px} pixels and {size_in_deg} visual degrees')

#!/usr/bin/env python3


"""
read each json file in data/ in sequence, and output the difference between each successive two files
"""

from natsort import natsorted
import os
import glob

files = natsorted(glob.glob('data/*.json'))

i = 0
while i < len(files)-1:
	f1 = files[i]
	f2 = files[i+1]

	os.system(f'diff -u {f1} {f2} | less +G')
	new_files = natsorted(glob.glob('data/*.json'))
	
	for f in new_files:
		if f not in files:
			files.append(f)

	i+=1



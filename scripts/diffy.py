#!/usr/bin/env python3


"""
read each json file in data/ in sequence, and output the difference between each successive two files
"""

from natsort import natsorted
import os
import glob, json

for f in natsorted(glob.glob('data/*.json')):
	with open(f) as ff:
		j = json.load(ff)
	print(f"""{j['inputs']['incomeYearOfLoan']}, {j['inputs']['fullTermOfAmalgamatedLoan']}, {j['inputs']['incomeYearOfEnquiring']}""")
	
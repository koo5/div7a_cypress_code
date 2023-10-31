#!/usr/bin/env python3


import json
from natsort import natsorted
import os
import glob


def json_load(fn):
	with open(fn) as f:
		return json.load(f)


def ato_monetary_to_float_str(s):
	"""
	Converts a monetary string to a float string by removing the dollar sign and commas.

	Args:
		s (str): The monetary string to convert.

	Returns:
		str: The converted float string.

	"""
	if not isinstance(s, str):
		raise Exception(f'not a string: {s}')
	if s == '':
		raise Exception(f'empty string')
	
	return s.replace('$', '').replace(',', '')



files = natsorted(glob.glob('../data/*.json'))

for f in files:
	j = json_load(f)
	o = j['outputs']
	
	ob = float(ato_monetary_to_float_str(o['amalgamatedLoanNotPaidByEOIYFormatted']))
	principal_paid = float(ato_monetary_to_float_str(o['principalFormatted']))
	
	if ob != principal_paid:
		if ob - principal_paid < 0:
			print(ob - principal_paid)
		
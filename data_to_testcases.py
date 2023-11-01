#!/usr/bin/env python3
import itertools
from xml.dom import minidom
from xml.dom.minidom import getDOMImplementation
impl = getDOMImplementation()
import json,os,sys
from pathlib import Path as P
from joblib import Parallel, delayed


def ato_date_to_xml(date):
	items = date.split('/') # dmy
	y = int(items[2])
	m = int(items[1])
	d = int(items[0])
	if not (0 < m <= 12):
		raise Exception(f'invalid month: {m}')
	if not (0 < d <= 31):
		raise Exception(f'invalid day: {d}')
	if not (1980 < y <= 2050):
		raise Exception(f'invalid year: {y}')
	return f'{y}-{m:02}-{d:02}' # ymd

def ato_monetary_to_float_str(s):
	return s.replace('$', '').replace(',', '')



datadir = sys.argv[1]

cases_dir = P(f'{datadir}/endpoint_tests/loan/good_atocalc_autogen/')


def rmrf():
	#os.system(f'rm -rf {cases_dir}.old')
	pass


def run():
	#os.system(f'mv {cases_dir} {cases_dir}.old')
	with Parallel(n_jobs=25) as parallel:
		parallel(itertools.chain([delayed(rmrf)()], [delayed(process_testcase)(f) for f in P(f'{datadir}/data/').glob('*.json')]))
	print('done')


def process_testcase(f):
		#print(f)
		#sys.stdout.write('.')

		with open(f, 'r') as f:
			j = json.load(f)

		id = j['id']

		case_dir = P(f'{cases_dir}/{id}')
		case_dir.mkdir(parents=True)

		inputs_dir = case_dir / 'request'
		inputs_dir.mkdir(parents=True)

		outputs_dir = case_dir/ 'responses'
		outputs_dir.mkdir(parents=True)

		response_fn = case_dir / 'response.json'
		with open(response_fn, 'w') as f:
			json.dump({"status":200,"result":'responses/response.xml'}, f)

		income_year_of_computation = j['inputs']['incomeYearOfEnquiring']
		opening_balance = j['inputs']['amalgamatedLoanNotPaidByEOIY']

		def write_request_xml():
	
			request_fn = inputs_dir / 'request.xml'
	
			doc = impl.createDocument(None, "reports", None)
			loan = doc.documentElement.appendChild(doc.createElement('loanDetails'))
			
			agreement = loan.appendChild(doc.createElement('loanAgreement'))
			repayments = loan.appendChild(doc.createElement('repayments'))
	
			def field(name, value):
				field = agreement.appendChild(doc.createElement('field'))
				field.setAttribute('name', name)
				field.setAttribute('value', str(value))
	
			income_year_of_loan_creation	 = j['inputs']['incomeYearOfLoan']
			full_term_of_loan_in_years		 = j['inputs']['fullTermOfAmalgamatedLoan']
			lodgement_day_of_private_company = j['inputs']['lodgement_date']

			field('Income year of loan creation', income_year_of_loan_creation)
			field('Full term of loan in years', full_term_of_loan_in_years)
			if lodgement_day_of_private_company is not None:
				field('Lodgement day of private company', ato_date_to_xml(lodgement_day_of_private_company))
			field('Income year of computation', income_year_of_computation)

			# maybe we could generate some testcases with principal rather than opening balance tag, it will mean the same thing.
			field('Opening balance of computation', opening_balance)
			#field('Principal amount of loan', opening_balance)

			for r in j['repayments']:
				repayment = repayments.appendChild(doc.createElement('repayment'))
				repayment.setAttribute('date', ato_date_to_xml(r['rd']))
				repayment.setAttribute('value', str(r['ra']))
				
			with open(request_fn, 'w') as f:
				f.write(doc.toprettyxml(indent='\t'))


		write_request_xml()
		
		def write_response_xml():
			response_fn = outputs_dir / 'response.xml'
			
			doc = impl.createDocument(None, "LoanSummary", None)
			root = doc.documentElement
			root.setAttribute('xmlns:xsd', "http://www.w3.org/2001/XMLSchema")
			root.setAttribute('xmlns:xsi', "http://www.w3.org/2001/XMLSchema-instance")
			root.setAttribute('xsi:schemaLocation', "loan_response.xsd")
			
			def add(name, value):
				e = root.appendChild(doc.createElement(name))
				e.appendChild(doc.createTextNode(str(value)))

			totalAmountOfRepayment = ato_monetary_to_float_str(j['outputs']['totalAmountOfRepaymentFormatted'])
			minimumYearRepayment   = ato_monetary_to_float_str(j['outputs']['minimumYearRepaymentFormatted'])
			
			shortfall = max(0, float(minimumYearRepayment) - float(totalAmountOfRepayment))

			# i forgot to take closing balance. But we can parse it from alert.
			enquiryYearEndDisplay = j['outputs']['enquiryYearEndDisplay']
			xxx = j['alert'].split('$')
			
			ClosingBalance = '$' + xxx[-1]
			expected = f"""\n\nClosing balance\n\nDate: {enquiryYearEndDisplay}\n\nBalance: {ClosingBalance}"""
			
			if not j['alert'].endswith(expected):
				raise Exception(f"""unexpected alert format, expected: {expected}, got: {j['alert']}""")

			loanAmountFormatted = j['outputs'].get('loanAmountFormatted')  
			if loanAmountFormatted is not None:
				#print(f'loanAmountFormatted: {loanAmountFormatted}')
				if loanAmountFormatted != ClosingBalance:
					raise Exception(f"""kinda thought that loanAmountFormatted == ClosingBalance: {loanAmountFormatted} vs {ClosingBalance}""")

			principal_str = ato_monetary_to_float_str(j['outputs']['principalFormatted'])
			principal = float(principal_str)
			if principal > opening_balance:
				overpayment = principal - opening_balance
				print(f'overpayment: {principal - opening_balance}')
			else:
				overpayment = None
				
			
			add('IncomeYear'			, income_year_of_computation);
			add('OpeningBalance'		, opening_balance);
			add('InterestRate'			, j['outputs']['enquiryRateFormatted'][:-1]);
			add('MinYearlyRepayment'	, minimumYearRepayment);
			add('TotalRepayment'		, totalAmountOfRepayment) # note that all the ato calculations are only for one year, while robust calc would sum up all repayments across all years, if provided 	
			add('RepaymentShortfall'	, shortfall);
			add('TotalInterest'		, ato_monetary_to_float_str(j['outputs']['totalInterestFormatted']));
			add('TotalPrincipal'		, principal_str); # only reason to use the _str is to not change too much at once here, float would be fine.
			add('ClosingBalance'		, ato_monetary_to_float_str(ClosingBalance));
			if overpayment is not None:
				root.appendChild(doc.createComment(f'overpayment: {overpayment}'))
				add('Overpayment'		, overpayment);
			
			with open(response_fn, 'w') as f:
				f.write(doc.toprettyxml(indent=''))

			with open(case_dir / 'request.json', 'w') as f:
				f.write('{"requested_output_format":"immediate_xml"}')

		write_response_xml()

if __name__ == '__main__':
	run()

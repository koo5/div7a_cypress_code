/// <reference types="cypress" />

/*


python3 -m pip install -U "watchdog[watchmedo] natsort"

watchmedo auto-restart -q -d data -- fish -c 'cd data; echo -e "\n\n\n"; tail -n 55555555 -f (ls -t . | head -1)'
watchmedo is flaky (inotify api, probably), so, there isnt really a good way to watch the results in real time, you can
add a command to write out a last.json, but then if you open it, cypress will error out trying to write to it.

see diffz.py and diffy.py for comparing pairs of results.

tweak the repayments starting date and lodgement date step as desired, manually, here. 

the calculator does not let us enter invalid inputs, and i believe i have covered all legal inputs here (except an infinite number of repayments, for example), so, a testing script can try all min-1, max+1 etc inputs, to verify that they fail in our calc too, and if anything succeeds in our calculator, we can compare it with the ato to see what's up.

cypress is a b*tch. Read the docs on asynchronicity and yielding and variables and whatnot, and see the examples, first. You still won't make sense of it. 
I proobably possibly have some unnecessary cy.wrap calls, and some strange ways to do things here, but, it works, so, whatever. Still don't know if the `cy.wrap(db`... calls are legal/correct/needed with cypress, but it seems to work. Still dont understand how the (async stuff) sequencing works.

The logic around adding repayments is tricky, because we want to run the calc after each repayment added, to save time, rather than clear them out every time.

Except the browser crashes. You get crashes in chrome and in firefox too. Oh and you maybe need to install firefox from repo, not the snap one.

if you get: Error: Cannot find module 'fs/promises', remember to 'nvm use 16' or something like that.

>>

node_modules/.bin/cypress open
 .. click E2E, firefox, a firefox window opens.

```
nvm use 16
while true; npx cypress run --no-runner-ui; ga data; gcam ..; gp; sleep 100; end;
```
<<


*/

var done;

describe('example to-do app', () => {
  beforeEach(() => {
	cy.log('hello');
	cy.visit('https://www.ato.gov.au/Calculators-and-tools/Host/?anchor=DIV7A#DIV7A/questions');
	cy.viewport(1400, 1080);
	idx = 0;
	cy.writeFile('hello', {});
	cy.readFile('done.json').then((d) => {done = d});
  })

  it('generate_testcase', () => {

	cy.contains('Calculate a minimum yearly repayment and the amount of the loan not repaid by the end of an income year').click()
	cy.get('[id=ddl-incomeYearOfLoan]').find('option').each(($el) => {
		let incomeYearOfLoan_text = $el[0].innerText;
		if (incomeYearOfLoan_text != " - Select -")
		{
			let tc0 = {
				incomeYearOfLoan:Number(incomeYearOfLoan_text.substring(0, 4)) + 1
			};


			cy.get('[id=ddl-incomeYearOfLoan]').select(incomeYearOfLoan_text);
			cy.get('[id=vrb-loanType-span-1]').click();
			

			var termsArr = Array.from({length:7},(v,k)=>k+1);
			cy.wrap(termsArr).each((term) => 
			{
				cy.get('[id=textfullTermOfAmalgamatedLoan]').type('{selectall}{backspace}' + term,{delay: 0});
				cy.get('[id=ddl-incomeYearOfEnquiring]').find('option').each(($el) => 
				{
					let incomeYearOfEnquiring_text = $el[0].innerText;
					let donekey = incomeYearOfLoan_text + '_' + term + '_' + incomeYearOfEnquiring_text;
					if (incomeYearOfEnquiring_text !== " - Select -" && (done[donekey] != true))
					{
						let incomeYearOfEnquiring_number = Number(incomeYearOfEnquiring_text.substring(0, 4)) + 1;

						cy.log('selecting ' + incomeYearOfEnquiring_text);
						cy.get('[id=ddl-incomeYearOfEnquiring]').select(incomeYearOfEnquiring_text);
						
						let amalgamatedLoanNotPaidByEOIY;
						if (Math.random() < 0.5)
							amalgamatedLoanNotPaidByEOIY = 1+Math.floor(Math.random() * 12300);
						else
							amalgamatedLoanNotPaidByEOIY = 1+Math.random() * 123;
						
						cy.get('[id=textamalgamatedLoanNotPaidByEOIY]').type('{selectall}{backspace}' + amalgamatedLoanNotPaidByEOIY,{delay: 0});
						cy.get('[id=vrb-calculateAmountOfTheAmalgamatedLoan-span-0]').click();

						
						let tc = {
							...tc0,
							fullTermOfAmalgamatedLoan: term,
							incomeYearOfEnquiring:incomeYearOfEnquiring_number,
							amalgamatedLoanNotPaidByEOIY:amalgamatedLoanNotPaidByEOIY,
						}
							
						let addings = repayment_addings(amalgamatedLoanNotPaidByEOIY, incomeYearOfEnquiring_number);
						
						cy.wrap(addings).each((adding) =>
						{		
							
							let r = adding.add;
							if (r)
							{
								cy.get('[id="btn_repayment_add"]').click();
								cy.get('[id="textdateOfLoanRepaymentadd"]').type('{selectall}{backspace}' + r.rd,{delay: 0});
								cy.get('[id="textamountOfRepaymentadd"]').type('{selectall}{backspace}' + r.ra,{delay: 0});
								cy.get('[id="btn_repayment_save"]').click()
								cy.wait(200);
							}
							cy.wrap(f1({
								...tc,
								repayments: adding.get.slice()
							}));								 
						});

						cy.wrap(addings.at(-1).get).each((_) => 
						{
							cy.get('[id^="toggle_collapseMethod_repayment"]').first().click();
							cy.get('[id="btn_repayment_delete"]').first().click();
							done[donekey] = true;
							cy.writeFile('done.json', done);
						});
					}	
				});
			});
		}
	});
  })
})

function repayment_addings(amalgamatedLoanNotPaidByEOIY, incomeYearOfEnquiring_number)
{
	let rs = random_repayment_list(amalgamatedLoanNotPaidByEOIY, incomeYearOfEnquiring_number);
	let rss = [{add:null, get:[]}];	
	for (var i = 0; i < rs.length; i++)
		rss.push({add:rs.at(i), get:rs.slice(0,i+1)});
	return rss;
}

function random_repayment_list(amalgamatedLoanNotPaidByEOIY, incomeYearOfEnquiring_number)
{
	let repayments = [];
	let remaining = amalgamatedLoanNotPaidByEOIY * 10;
	let min = new Date(incomeYearOfEnquiring_number-1 ,7-1, 1);
	
	//comment for repayments starting from 1/7 of year 1
	min.setDate(min.getDate() + Math.floor(Math.random() * 365));
	
	let max = new Date(incomeYearOfEnquiring_number, 6-1, 30);
	let sparsity = Math.floor(Math.random() * 1000);
	let start = new Date(min);
	start.setDate(start.getDate() + Math.floor(Math.random() * sparsity));
					
	for (var d = new Date(min); d <= max && remaining > 0; d.setDate(d.getDate() + 1 + Math.floor(Math.random() * sparsity)))
	{
		let rd = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
		let ra = Math.floor(Math.random() * 10000);
		if (repayments.length > 5)
			ra *= 1000;
		remaining -= ra;
		if (remaining < 0)
			ra += remaining;
		repayments.push({rd,ra});
	}
	return repayments;
}

function f1(tc)
{
	if (tc.incomeYearOfEnquiring - tc.incomeYearOfLoan > 1)
	{
		cy.wrap(f2({
			...tc,
			lodgement_date:null
		}))
	}
	else
	{
		let min = new Date(tc.incomeYearOfLoan,  7-1, 1);
		let max = new Date(tc.incomeYearOfLoan+1,6-1, 30);

		var dates = [];
		for (var d = new Date(min); d <= max; d.setDate(d.getDate() + 30)) //lodgement day step
			dates.push(new Date(d));
		
		cy.wrap(dates).each((d) =>
		{
			cy.wrap(lodgement_f(tc, d));
		});
		
		cy.wrap(lodgement_f(tc, max));
	}
}

function lodgement_f(tc, d)
{
	let lodgement_date_string = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
	cy.get('[id=textlodgmentDate]').type('{selectall}{backspace}' + lodgement_date_string,{delay: 0});
	cy.get('[data-bind="text: pageTitle"]').click();
	cy.wrap(f2({
		...tc,
		repayments:tc.repayments.map((r) => ({...r})),
		lodgement_date:lodgement_date_string
	}))
}

var idx = 0;

function f2(tc0)
{
	cy.contains('Show result', {timeout:60000}).first().trigger('click').then(() => {
	
		let outputs = {};
		let tc = {
			id: new Date().toISOString() + Math.random(),
			alert: null,
			outputs,
			repayments: tc0.repayments,
			inputs: {...tc0, repayments:null},
			idx: idx++,
		}

		cy.wrap(db(outputs,'enquiryRateFormatted'), {log:true, timeout:60000});
		cy.wrap(db(outputs,'enquiryYearEndMinusOneDisplay'), {log:true});
		cy.wrap(db(outputs,'amalgamatedLoanNotPaidByEOIYFormatted'), {log:true});
		cy.wrap(db(outputs,'openingBalancePayDays'), {log:true});
		cy.wrap(db(outputs,'openingBalanceInterestFormatted'), {log:true});
		cy.wrap(db(outputs,'totalAmountOfRepaymentFormatted'), {log:true});
		cy.wrap(db(outputs,'totalInterestFormatted'), {log:true});
		cy.wrap(db(outputs,'principalFormatted'), {log:true});
		cy.wrap(db(outputs,'enquiryYearEndDisplay'), {log:true});
		cy.wrap(db(outputs,'minimumYearRepaymentFormatted'), {log:true});
		cy.wrap(db(outputs,'loanAmountFormatted'), {log:true});
		
		cy.get('.alert-attention').then(($el) => {tc['alert'] = $el[0].innerText});
	
		cy.writeFile('data/' + tc.id + '_' + tc.idx + '.json', tc);
	})
}


function db(tc, k)
{
	cy.get('[data-bind="text: '+k+'"]').then(($el) => {tc[k] = $el[0].innerText});
}

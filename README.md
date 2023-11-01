cypress code to generate json files with ato calc inputs and its results. Python code to read the json and generate xml request/result pairs.


# cypress/e2e/1-getting-started/todo.cy.js
```
mkdir data
killall -9 Cypress
nvm install 20
nvm use 20
rm -rf node_modules/
npm i
npx cypress run --e2e --no-runner-ui --headed
# or maybe: DISPLAY= DEBUG="*" npx cypress run -b firefox

```

* Dont store the data in the code repo, otherwise cypress will hang. *

see also: https://docs.cypress.io/guides/references/troubleshooting


# for the python side:
```
virtualenv -p /usr/bin/python3.10 venv
. ./venv/bin/activate.fish
pip install joblib natsort
./data_to_testcases.sh
```

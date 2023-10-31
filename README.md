
*Dont store the data in the code repo, otherwise cypress will hang.*

# cypress/e2e/1-getting-started/todo.cy.js
```
mkdir data
killall -9 Cypress
nvm install 20
nvm use 20
rm -rf node_modules/
npm i
npx cypress run --e2e  --no-runner-ui --headed
#DISPLAY= DEBUG="*" npx cypress run -b firefox

```

# for the python side:
```
virtualenv -p /usr/bin/python3.10 venv
. ./venv/bin/activate.fish
pip install joblib natsort
./data_to_testcases.sh
```

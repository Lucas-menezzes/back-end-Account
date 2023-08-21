const express = require('express');
const app = express();
const {v4: uuidv4} = require("uuid")

app.use(express.json())

const customers = [];
const accounts = [];

// Middleware
function verifyExistAccountCPF(request, response, next) {
    const {cpf} = request.headers;
    // Não deve ser possível fazer depósito em uma conta não existente
    const customer = customers.find(customer => customer.cpf === cpf);

    if(!customer){
        return response.status(400).json({error: 'Customer Not Found'});
    }
    request.customer = customer;

    return next();
}
function getBalance(statement){
    const balance = statement.reduce((acc, operation) => {
        if(operation === 'credit') {
            return acc + operation.amount;
        }else {
            return acc - operation.amount;
        }
    }, 0)
    return balance;
}

// cpf - string
// name - string
// id - uuid  identificadores 
// statement []

app.post('/account', (request, response) => {
    const {cpf, name}  = request.body;
    ///Não deve ser possível cadastrar uma conta com CPF já existente
    const customerAlreadyExist = customers.some(
        (customer) => customer.cpf === cpf
    );
    if (customerAlreadyExist) {
        return response.status(400).json({error:"Customer already exist"});
    }
    customers.push({
        cpf, 
        name, 
        id: uuidv4(),
        statement:[]
        });
    return response.status(201).send();
})

app.get('/accounts', (request, response) => {
    response.json(customers)
})

app.use(verifyExistAccountCPF);

app.get('/statement', verifyExistAccountCPF, (request, response) => {
    const {customer} = request
    return response.json(customer.statement)
})

app.post('/deposit', verifyExistAccountCPF, (request, response) => {
    const {amount, description} = request.body
    const {customer} = request
    const statementOperation = {
        description,
        amount,
        createdAt: new Date(),
        type: "credit"
    }
    customer.statement.push(statementOperation)
    return response.status(201).send()
})

app.post('/withdraw', verifyExistAccountCPF, (request, response) => {
    const {amount} = request.body
    const {customer} = request
    const balance = getBalance(customer.statement);

    if(balance > amount) {
        return response.status(400).json({errors: "Insufficient funds"})
    }
    const statementOperation ={
        amount,
        createdAt: new Date(),
        type: "debit"
    };
    customer.statement.push(statementOperation)
    return response.status(201).send();
})
//trazer extrato por data 
app.get('/statement/date', verifyExistAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
    (statement) => 
        statement.createdAt.toDateString() ===
        new Date(dateFormat).toDateString()
    );

    return response.json(statement);
});

app.put('/edit', verifyExistAccountCPF, (request, response) => {
    const {name} = request.body;
    const {customer} = request

    customer.name = name
    return response.status(201).send();

});

app.delete('/account', verifyExistAccountCPF, (request, response) => {
    const {customer} = request
    customers.splice(customer, 1)

    return response.status(200).json(customers)
});

app.get('/balance', (request, response) => {
    const {customer} = request
    const balance = getBalance(customer.statement);
    
    return response.json(balance)

})



app.listen(3333);
require("dotenv").config();

const pg = require("pg");
const express = require("express");

const app = express();
app.use(express.json());

const client = new pg.Client(
  process.env.DATABASE_URL || `postgres://localhost/${process.env.DB_NAME}`
);

const init = async () => {
  await client.connect();
  console.log("connected to database");

  let SQL = /*SQL*/ `
    DROP TABLE IF EXISTS employees; 
    DROP TABLE IF EXISTS department;


    CREATE TABLE department(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50)
    );
    
    CREATE TABLE employees(
     id SERIAL PRIMARY KEY,
     name VARCHAR(50),
     department_id INTEGER REFERENCES Department(id) NOT NULL,
     created_at TIMESTAMP DEFAULT now(),
     updated_at TIMESTAMP DEFAULT now()
  )
  `;
  await client.query(SQL);
  console.log("table created");

  SQL = /*SQL*/ `
    INSERT INTO department (name) VALUES('Human Resources');
    INSERT INTO department (name) VALUES('IT');
    INSERT INTO department (name) VALUES ('FRONT DESK');
    INSERT INTO employees (name, department_id) VALUES ('Freddy K', (SELECT id from department WHERE name = 'Human Resources'));
    INSERT INTO employees (name, department_id) VALUES ('Michael M', (SELECT id from department WHERE name = 'IT'));
    INSERT INTO employees (name, department_id) VALUES ('Jason V', (SELECT id from department WHERE name = 'FRONT DESK'));  
    INSERT INTO employees (name, department_id) VALUES ('Carrie S', (SELECT id from department WHERE name = 'FRONT DESK'));  
  
  `;
  await client.query(SQL);
  console.log("tables seeded");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
});

//GET DEPARTMENTS

app.get("/api/department", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `SELECT * from department`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

//GET EMPLOYEES
app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `SELECT * from employees`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

//POST (CREATE) NEW EMPLOYEE
app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `
        INSERT INTO employees (name, department_id)
        VALUES($1, $2)
        RETURNING * 
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

//DELETE EMPLOYEE
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = /* SQL*/ `
        DELETE from employees WHERE id=$1
        `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

//PUT employee
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const employeesId = req.params.id;

    const SQL = /*SQL*/ `
      UPDATE employees
      SET name=$1, department_id=$2, updated_at=now()
      WHERE id=$3
      RETURNING *
      `;

    const response = await client.query(SQL, [
      name,
      department_id,
      employeesId,
    ]);
    if (response.rows.length === 0) {
      return res.status(404).send("Employee not found");
    }
      res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

init();

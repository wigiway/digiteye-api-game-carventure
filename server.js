const express = require('express');
const AWS = require('aws-sdk');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');


AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.json({ message: 'DIGITEYE API' });
});



const tableName = 'digiteye-api-game-carventure';

app.post('/redeem', (req, res) => {
  const { name, email, point } = req.body;
  // Check if the email already exists in the database
  const params = {
      TableName: tableName,
      IndexName: "email-index", // ต้องสร้าง Global Secondary Index ใน DynamoDB สำหรับคอลัมน์ email
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
          ":email": email
      }
  };

  dynamoDb.query(params, (err, data) => {
      if (err) {
          res.status(500).send({ message: "Error accessing the database", error: err });
      } else if (data.Items.length > 0) {
          // Email already exists
          res.status(400).send({ message: "This email has already claimed a reward." });
      } else {
          // Email is unique, proceed to save the new data
          const insertParams = {
              TableName: tableName,
              Item: { name, email, point }
          };

          dynamoDb.put(insertParams, (err) => {
              if (err) {
                  res.status(500).send({ message: "Error saving data", error: err });
              } else {
                  // Respond with success message including the points
                  res.status(201).send({
                    message: "Data saved successfully",
                    pointsReceived: point,
                    name: name, // เพิ่ม name ในการตอบกลับ
                    email: email // เพิ่ม email ในการตอบกลับ
                });                
              }
          });
      }
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

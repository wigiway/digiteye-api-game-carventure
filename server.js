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

//========================================================================== GAME CARVENTER

const tableName = 'digiteye-api-game-carventure';
const tableNameAdventuerNFTDigitalConfirm = 'adventurenft-digitalconfirm-carventer';

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
              Item: { name, email, point, redeemed: false }
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

//========================================================================== GAME CARVENTER

//========================================================================== APP AdVentureNFT

app.get('/carventure/read/digitalconfirm', (req, res) => {
  // รับ hashkey จาก query parameter
  const { hashkey } = req.query;

  if (!hashkey) {
    return res.status(400).send({ error: 'Hashkey is required as a query parameter.' });
  }

  const params = {
    TableName: tableNameAdventuerNFTDigitalConfirm,
    Key: {
      'hashkey': hashkey,
    },
  };

  // ทำการอ่านข้อมูลจาก DynamoDB
  dynamoDb.get(params, (err, data) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).send({ error: 'Could not fetch data from DynamoDB' });
    } else {
      if (data.Item) {
        // สร้าง object ใหม่ที่ไม่รวม hashkey
        const { hashkey, ...itemWithoutHashkey } = data.Item;
        // ส่ง object นี้กลับไปใน response
        res.status(200).send(itemWithoutHashkey);
      } else {
        res.status(404).send({ error: 'No record found for this hashkey' });
      }
    }
  });
});


app.post('/carventure/create/digitalconfirm', (req, res) => {
  const { hashkey, tax, version, artist_name, number_of_product, special_color, edition_color, number_of_edition } = req.body;

  // Generate an ISO 8601 formatted string for the current date and time
  const currentDate = new Date().toISOString();

  const params = {
      TableName: tableNameAdventuerNFTDigitalConfirm,
      Item: {
          'hashkey': hashkey,
          'tax': tax,
          'version': version,
          'artist_name': artist_name,
          'number_of_product': number_of_product,
          'special_color': special_color,
          'edition_color': edition_color,
          'number_of_edition': number_of_edition,
          'owner': "",
          'date_tranfer': "",
          'date_update': currentDate, // Set 'date_update' to the current date
      }
  };

  dynamoDb.put(params, (err, data) => {
      if (err) {
          console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
          res.status(500).send({ error: 'Could not create digital confirm' });
      } else {
          res.status(200).send({ message: 'Digital confirm created successfully' });
      }
  });
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

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

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.json({ message: 'DIGITEYE API' });
});



const tableName = 'digiteye-api-game-carventure';

app.post('/digiteye-api/addpointuser', async (req, res) => {
  const { name, email, point } = req.body;

  try {
    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    const params = {
      TableName: tableName,
      Key: {
        'email': email,
      },
    };

    const { Item } = await dynamoDB.get(params).promise();

    if (Item) {
      // อัพเดทผู้ใช้
      const updateParams = {
        TableName: tableName,
        Key: {
          'email': email,
        },
        UpdateExpression: 'set point = point + :val',
        ExpressionAttributeValues:{
          ':val': point,
        },
        ReturnValues:"UPDATED_NEW"
      };

      await dynamoDB.update(updateParams).promise();
      res.status(200).send('Points updated successfully.');
    } else {
      // สร้างผู้ใช้ใหม่
      const putParams = {
        TableName: tableName,
        Item: {
          'email': email,
          'name': name,
          'point': point,
        },
      };

      await dynamoDB.put(putParams).promise();
      res.status(201).send('successfully.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

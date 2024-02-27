const express = require('express');
const AWS = require('aws-sdk');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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

function generateToken(user) {
  return jwt.sign({ email: user.email }, process.env.JWT_SECRET_ACCESS_KEY, { expiresIn: '720h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET_ACCESS_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/digiteye-api/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const params = {
      TableName: "digiteye-api-game-carventure",
      Item: {
        "email": email,
        "username": username,
        "password": hashedPassword,
        "point": 0
      },
      ConditionExpression: "attribute_not_exists(email)"
    };

    await dynamoDB.put(params).promise();
    res.json({ message: "User registered successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not register user" });
  }
});

app.post('/digiteye-api/login', async (req, res) => {
  const { email, password } = req.body;
  const params = {
    TableName: "digiteye-api-game-carventure",
    Key: {
      "email": email
    }
  };

  try {
    const { Item } = await dynamoDB.get(params).promise();
    if (Item) {
      const match = await bcrypt.compare(password, Item.password);
      if (match) {
        const token = generateToken({ email: Item.email });
        res.json({ message: "Login successful", token });
      } else {
        res.status(400).json({ error: "Password is incorrect" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Login error" });
  }
});

app.get('/digiteye-api/checkboxtoken', authenticateToken, async (req, res) => {
  const email = req.user.email;
  const params = {
    TableName: "digiteye-api-game-carventure",
    Key: {
      "email": email
    }
  };

  try {
    const { Item } = await dynamoDB.get(params).promise();
    if (Item) {
      // เพิ่มการส่งค่า username และปรับ point เป็น point ใน response
      res.json({ email: Item.email, username: Item.username, point: Item.point });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user information" });
  }
});

app.post('/digiteye-api/addpointuser', authenticateToken, async (req, res) => {
  const email = req.user.email; // ใช้ email จากข้อมูลที่ได้จาก JWT token
  const { pointsToAdd } = req.body; // รับคะแนนที่ต้องการเพิ่มจาก body ของ request

  const getUserParams = {
    TableName: "digiteye-api-game-carventure",
    Key: {
      "email": email
    }
  };

  try {
    // ดึงข้อมูลผู้ใช้จาก DynamoDB
    const { Item } = await dynamoDB.get(getUserParams).promise();
    if (!Item) {
      return res.status(404).json({ error: "User not found" });
    }

    // คำนวณคะแนนใหม่
    const newPoints = (Item.point || 0) + pointsToAdd;

    // อัปเดตคะแนนของผู้ใช้ใน DynamoDB
    const updateParams = {
      TableName: "digiteye-api-game-carventure",
      Key: {
        "email": email
      },
      UpdateExpression: "set point = :p",
      ExpressionAttributeValues:{
        ":p": newPoints
      },
      ReturnValues:"UPDATED_NEW"
    };

    await dynamoDB.update(updateParams).promise();

    res.json({ message: "User points updated successfully", newPoints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update user points" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

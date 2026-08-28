const express = require('express');
const cookieParser = require('cookie-parser');

const authRouter = require(",/routes/auth.route");
const app = express();

app.use("/api/auth", authRouter);
app.use(cookieParser());

app.use(express.json());
module.exports = app;
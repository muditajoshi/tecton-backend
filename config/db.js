//  Tectonlife.com Developed by: S3B Global

// `Email: info@s3bglobal.com, sunil@s3bglobal.com`

// Development Team: Rajat Sharma, Mudita Joshi

// Version No: 0.0.0.5 (2023-05-08)

const mongoose = require("mongoose");

// connect to the mongoDB collection

const connectDB = () => {
  mongoose
    .connect(
    `mongodb+srv://MongoDb:FQozgQgQK5On7X8N@cluster0.zbaz4.mongodb.net/tectonlife?retryWrites=true&w=majority&appName=Cluster0
`,
   {
        //.connect("mongodb://localhost:27017/tectonlife", {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true,
      }
    )
    .then((res) =>
      console.log(
        `MongoDB Connected: ${res.connection.host}`.cyan.underline.bold
      )
    )
    .catch((err) => {
      console.error(`Error: ${err.message}`.red.underline.bold);
      process.exit(1);
    });
};

module.exports = connectDB;

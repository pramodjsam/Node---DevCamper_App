const express= require("express");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({path:"./config/config.env"});
const morgan = require("morgan");
const colors = require("colors");
const cookieParser = require("cookie-parser");
const fileupload = require("express-fileupload");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const bootcamps = require("./routes/bootcamps");
const courses = require("./routes/courses");
const reviews = require("./routes/reviews");
const users = require("./routes/users");
const auth = require("./routes/auth");
const logger = require("./middleware/logger");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

const app= express();

app.use(express.json());

connectDB();

//	Dev logging middleware
if(process.env.NODE_ENV == 'development'){
	app.use(morgan("dev"));
}

// File uploading
app.use(fileupload());

// Cookie parser
app.use(cookieParser());

// Sanitize data (Prevent NoSQL injection)
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate Limiting
const limiter = rateLimit({
	windowMs: 10 *60 *1000, //10 mins
	max:100
})
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname,"public")))

// Routes files
app.use("/api/v1/bootcamps",bootcamps);
app.use("/api/v1/courses",courses);
app.use("/api/v1/auth",auth);
app.use("/api/v1/users",users);
app.use("/api/v1/reviews",reviews);

app.use(errorHandler);

const port = process.env.PORT || 4000;

const server = app.listen(port,()=>{
	console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${port}`.yellow.bold);
})

process.on("unhandledRejection",(err,promise)=>{
	console.log(`error: ${err.message}`.red);
	server.close(()=>process.exit(1));
})

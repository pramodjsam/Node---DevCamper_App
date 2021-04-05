const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");

exports.protect = asyncHandler(async(req,res,next)=>{
	let token;

	if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
	// Set token from bearer token in header
		token = req.headers.authorization.split(" ")[1];
	}
	// Set token from cookie
	// else if(req.cookies.token){
	// 	token = req.cookies.token
	// }
	// Make sure token exists
	if(!token || token == "none"){
		return next(new ErrorResponse("Not authorized to access this route",401));
	}

	try{
		// Verify
		const decoded = jwt.verify(token,process.env.JWT_SECRET);

		req.user =await User.findById(decoded.id);

		next();
;	}catch(err){
		console.log(err);
	}
})

// Grant access to specific roles
exports.authorize = (...roles)=>{
	return (req,res,next)=>{
		if(!roles.includes(req.user.role)){
			return next(new ErrorResponse(`User role "${req.user.role}" is not authorized to access this route`,403));
		}
		next();
	}
}
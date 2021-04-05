const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

// @desc	Register User
// @routes	POST /api/v1/auth/register
// @access	Public
exports.register = asyncHandler(async(req,res,next)=>{
	const {name, email, password, role} = req.body;

	const user = await User.create({
		name,
		email,
		password,
		role
	});
	// Create token
	// const token = user.getSignedJwtToken();
	// res.status(201).json({success:true, token:token})

	sendTokenResponse(user,201,res);
})


// @desc	Login User
// @routes	POST /api/v1/auth/login
// @access	Public
exports.login = asyncHandler(async(req,res,next)=>{
	const {email, password} = req.body;

	// Validate email and password
	if(!email || !password){
		return next(new ErrorResponse(`Please provide an email and password`,400));
	}

	// Check for user
	const user = await User.findOne({email:email}).select("+password");

	if(!user){
		return next(new ErrorResponse(`Invalid credential`,401));
	}

	// Check if password matches
	const isMatch = await user.matchPassword(password);

	if(!isMatch){
		return next(new ErrorResponse(`Invalid credential`,401));
	}

	// Create token
	// const token = user.getSignedJwtToken();
	// res.status(200).json({success:true, token:token})

	sendTokenResponse(user,200,res);
})

// @desc	Log user out / clear cookie
// @routes	GET /api/v1/auth/logout
// @access	Private
exports.logout = asyncHandler(async(req,res,next)=>{
	res.cookie("token",'none',{
		expire: new Date(Date.now() + 10 *1000),
		httpOnly:true
	})

	res.status(200).json({
		success:true,
		data:{}
	})
})

// @desc	Get current logged in user
// @routes	GET /api/v1/auth/me
// @access	Private
exports.getMe = asyncHandler(async(req,res,next)=>{
	const user = await User.findById(req.user.id);

	res.status(200).json({
		success:true,
		data:user
	})
})

// @desc	Forgot password
// @routes	POST /api/v1/auth/forgotpassword
// @access	Public
exports.forgotPassword = asyncHandler(async(req,res,next)=>{
	const user = await User.findOne({email:req.body.email})

	if(!user){
		return(next(new ErrorResponse(`There is not user with that email`,404)))
	}

	// Get reset token
	const resetToken = user.generateResetPasswordToken();

	await user.save({validateBeforeSave:false})

	// Create reset URL
	const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/resetpassword/${resetToken}`

	const message = `You are receiving this message because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`

	try{
		await sendEmail({
			email:req.body.email,
			subject:"Password Reset Token",
			message:message
		})
		res.status(200).json({
			success:true,
			data:"Email sent"
		})
	}catch(err){
		console.log(err);
		this.resetPasswordToken = undefined;
		this.resetPasswordExpire = undefined;
		await user.save({validateBeforeSave:true})
		return next(new ErrorResponse("Email could not be sent",500))
	}	
})

// @desc	Reset password
// @routes	PUT /api/v1/auth/resetpassword/:resettoken
// @access	Private
exports.resetPassword = asyncHandler(async(req,res,next)=>{
	// Get hashed token
	const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

	const user = await User.findOne({
		resetPasswordToken:resetPasswordToken,
		resetPasswordExpire: {$gt:Date.now()}
	})

	if(!user){
		return next(new ErrorResponse("Invalid token",400))
	}

	// Set new password
	user.password = req.body.password;
	user.resetPasswordToken = undefined;
	user.resetPasswordExpire = undefined;
	await user.save();

	sendTokenResponse(user,200,res);
})

// @desc	Update user details
// @routes	PUT /api/v1/auth/updatedetails
// @access	Private
exports.updateDetails = asyncHandler(async(req,res,next)=>{
	const fieldsToUpdate={
		email:req.body.email,
		name:req.body.name
	}
	const user = await User.findByIdAndUpdate(req.user.id,fieldsToUpdate,{
		new:true,
		runValidators:true
	});

	res.status(200).json({
		success:true,
		data:user
	})
})

// @desc	Update Password
// @routes	GET /api/v1/auth/updatepassword
// @access	Private
exports.updatePassword = asyncHandler(async(req,res,next)=>{
	const user = await User.findById(req.user.id).select("+password");

	if(!(await user.matchPassword(req.body.currentPassword))){
		return next(new ErrorResponse("Password is incorrect",401))
	}

	user.password = req.body.newPassword;

	await user.save();

	sendTokenResponse(user,200,res);
})

// Get token from model, create cookie and send response
const sendTokenResponse = (user,statusCode,res)=>{
	// Create token
	const token = user.getSignedJwtToken();

	const options={
		expire: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
		httpOnly:true
	}

	if(process.env.NODE_ENV == 'production'){
		options.secure=true
	}

	res
		.status(statusCode)
		.cookie("token",token,options)
		.json({
			success:true,
			token:token
		})
}
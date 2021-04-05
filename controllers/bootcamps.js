const path = require("path");
const Bootcamp = require("../models/Bootcamp");
const ErrorResponse = require("../utils/errorResponse");
const geocoder = require("../utils/geocoder");
const asyncHandler = require("../middleware/async");

// @desc	Get all bootcamps
// @routes	GET /api/v1/bootcamps
// @access	Public
exports.getBootcamps = asyncHandler(async (req,res,next)=>{
	// let query;

	// // Copy req.query
	// const reqQuery = {...req.query};

	// // Fields to exclude
	// const removeFields = ["select","sort","page","limit"];

	// // Loop over the removeFields are remove them from reqQuery
	// removeFields.forEach(field => delete reqQuery[field]);

	// // Create query string
	// let queryStr = JSON.stringify(reqQuery);

	// // Create operators ($gte|$gt|$lte etc)
	// queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in)\b/g,match=>`$${match}`);

	// // Finding resource
	// query= Bootcamp.find(JSON.parse(queryStr)).populate("courses");

	// // Select fields
	// if(req.query.select){
	// 	const fields= req.query.select.split(",").join(" ");
	// 	query=query.select(fields);
	// }

	// // Sort
	// if(req.query.sort){
	// 	const sortBy = req.query.sort.split(",").join(" ");
	// 	query=query.sort(sortBy);
	// }else{
	// 	query=query.sort("-createdAt")
	// }

	// // Pagination
	// const page = parseInt(req.query.page) || 1;
	// const limit = parseInt(req.query.limit) || 25;
	// const skip = (page-1)*limit;
	// const endIndex = page * limit;
	// const total = await Bootcamp.countDocuments();
	// query = query.skip(skip).limit(limit);

	// // Executing query
	// const bootcamp = await query;

	// // Pagination Result
	// const pagination={};
	// if(endIndex < total){
	// 	pagination.next={
	// 		page:page+1,
	// 		limit:limit
	// 	}
	// }
	// if(skip > 0){
	// 	pagination.prev={
	// 		page:page-1,
	// 		limit:limit
	// 	}
	// }
	res.status(200).json(res.advancedResults);
});

// @desc	Get single bootcamps
// @routes	GET /api/v1/bootcamps/:id
// @access	Public
exports.getBootcamp =asyncHandler(async (req,res,next)=>{
	const bootcamp = await Bootcamp.findById(req.params.id);
	if(!bootcamp){
		return next(new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`,404));
	}
	res.status(200).json({success:true,data:bootcamp})
});

// @desc	Create bootcamp
// @routes	POST /api/v1/bootcamps
// @access	Private
exports.createBootcamp =asyncHandler(async (req,res,next)=>{
	// Add user to req.body
	req.body.user = req.user._id;

	// Check for published bootcamp
	const publishedBootcamp = await Bootcamp.findOne({user:req.user._id});

	// If the user is not an admin, they can only add one bootcamp
	if(publishedBootcamp  && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User with the ID ${req.user._id} has already published a bootcamp`))
	}

	const bootcamp = await Bootcamp.create(req.body);
	res.status(201).json({success:true,data:bootcamp});
})

// @desc	Update bootcamp
// @routes	PUT /api/v1/bootcamps/:id
// @access	Private
exports.updateBootcamp =asyncHandler(async (req,res,next)=>{
	let bootcamp = await Bootcamp.findById(req.params.id)
	if(!bootcamp){
		return next(new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`,404));
	}

	// Make sure user is the bootcamp owner
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== "admin"){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`,401));
	}

	bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id,req.body,{
		new:true,
		runValidators:true
	})

	res.status(200).json({success:true,data:bootcamp})
})

// @desc	Delete bootcamp
// @routes	DELETE /api/v1/bootcamps
// @access	Private
exports.deleteBootcamp =asyncHandler(async (req,res,next)=>{
	const bootcamp = await Bootcamp.findById(req.params.id);
	if(!bootcamp){
		return next(new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`,404));
	}

	// Make sure user is the bootcamp owner
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== "admin"){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`,401));
	}

	bootcamp.remove();

	res.status(200).json({success:true,data:{}})
})

// @desc	Get Bootcamps within a radius
// @routes	GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access	Private
exports.getBootcampsInRadius =asyncHandler(async (req,res,next)=>{
	const {zipcode,distance} = req.params;

	//Get lat/lng from geocode
	const loc = await geocoder.geocode(zipcode);
	const lat = loc[0].latitude;
	const lon = loc[0].longitude;

	// Calc radius using radians
	// Divide dist by the radius of the Earth
	// Earth Radius = 3,963 mi / 6,378 km
	const radius = distance / 3963;
	const bootcamp = await Bootcamp.find({
		location:{$geoWithin : {$centerSphere : [[lon,lat],radius]}}
	})
	res.status(200).json({
		success:true,
		count:bootcamp.length,
		data:bootcamp
	})
})

// @desc	Upload photo for bootcamp
// @routes	PUT /api/v1/bootcamps/:id/photo
// @access	Private
exports.bootcampPhotoUpload =asyncHandler(async (req,res,next)=>{
	const bootcamp = await Bootcamp.findById(req.params.id);

	if(!bootcamp){
		return next(new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`,404));
	}

	// Make sure user is the bootcamp owner
	if(bootcamp.user.toString() !== req.user.id && req.user.role !== "admin"){
		return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`,401));
	}
	
	if(!req.files){
		return next(new ErrorResponse(`Please upload a file`,400))
	}

	const file = req.files.file;

	// Make sure the image is a photo
	if(!file.mimetype.startsWith("image")){
		return next(new ErrorResponse(`Please upload an image`,400))
	}
	
	// Check file size
	if(file.size > process.env.MAX_FILE_UPLOAD){
		return next(new ErrorResponse(`Please upload an image less than 1MB`,400))
	}

	file.name=`photo_${bootcamp._id}${path.parse(file.name).ext}`;

	file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`,async err =>{
		if(err){
			console.log(err);
			return next(new ErrorResponse(`Error with file upload`,500))
		}
		await Bootcamp.findByIdAndUpdate(req.params.id,{
			photo:file.name
		})
		res.status(200).json({
			success:true,
			data:file.name
		})
	})
})
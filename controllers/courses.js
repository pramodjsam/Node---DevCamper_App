const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Course = require("../models/Course");
const Bootcamp = require("../models/Bootcamp");

// @desc 	Get All Courses
// @routes	GET /api/v1/courses
// @routes	GET /api/v1/bootcamps/:bootcampId/courses
// @access	Public
exports.getCourses= asyncHandler(async(req,res)=>{
	if(req.params.bootcampId){
		const courses = Course.find({bootcamp:req.params.bootcampId})
		return res.status(200).json({
			success:true,
			count:courses.length,
			data:courses
		})
	}else{
		// query = Course.find().populate({
		// 	path:"bootcamp",
		// 	select:"name description"
		// });
		res.status(200).json(res.advancedResults)
	}
})

// @desc 	Get Single Course
// @routes	GET /api/v1/courses/:id
// @access	Public
exports.getCourse= asyncHandler(async(req,res)=>{
	const course = await Course.findById(req.params.id).populate({
		path:"bootcamp",
		select:"name description"
	})

	if(!course){
		return new ErrorResponse(`No course with the id of ${req.params.id}`,404)
	}

	res.status(200).json({
		success:true,
		data:course
	})
})

// @desc 	Add Course
// @routes	POST /api/v1/bootcamps/:bootcampId/courses
// @access	Private
exports.addCourse= asyncHandler(async(req,res,next)=>{
	req.body.bootcamp = req.params.bootcampId;
	req.body.user = req.user.id;
	const bootcamp = await Bootcamp.findById(req.params.bootcampId);

	if(!bootcamp){
		return next(new ErrorResponse(`No bootcamp with the id of ${req.params.bootcampId}`,404))
	}

	// Make sure the user is the bootcamp owner
	if(bootcamp.user.toString() !== req.user.id  && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user._id} is not authorized to add course to this bootcamp ${bootcamp.id}`,401))
	}

	const course = await Course.create(req.body);

	res.status(200).json({
		success:true,
		data:course
	})
})

// @desc 	Update Course
// @routes	PUT /api/v1/courses/:id
// @access	Private
exports.updateCourse= asyncHandler(async(req,res,next)=>{
	let course = await Course.findById(req.params.id)

	if(!course){
		return next(new ErrorResponse(`No course with the id of ${req.params.id}`,404))
	}

	// Make sure the user is the course owner
	if(course.user.toString() !== req.user._id  && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user._id} is not authorized to update this course ${course.id}`,401));
	}

	course = await Course.findByIdAndUpdate(req.params.id,req.body,{
		new:true,
		runValidators:true
	})

	res.status(200).json({
		success:true,
		data:course
	})
})

// @desc 	Delete Course
// @routes	DELETE /api/v1/courses/:id
// @access	Private
exports.deleteCourse= asyncHandler(async(req,res,next)=>{
	const course = await Course.findById(req.params.id)

	if(!course){
		return next(new ErrorResponse(`No bootcamp with the id of ${req.params.bootcampId}`,404))
	}

	// Make sure the user is the course owner
	if(course.user.toString() !== req.user._id  && req.user.role !== 'admin'){
		return next(new ErrorResponse(`User ${req.user._id} is not authorized to update this course ${course.id}`,401));
	}

	await course.remove();

	res.status(200).json({
		success:true,
		data:{}
	})
})
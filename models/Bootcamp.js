const mongoose = require("mongoose");
const slugify = require("slugify");
const geocoder = require("../utils/geocoder");

const BootcampSchema =new mongoose.Schema({
	name:{
		type:String,
		required:[true,"Please add a name"],
		unique:true,
		trim:true,
		maxlength:[50,"Name cannot be more than 50 characters"]
	},
	slug:String,
	description:{
		type:String,
		required:[true,"Please add a description"],
		maxlength:[500,"description cannot be more than 500 characters"]
	},
	website:{
		type:String,
		match:[/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
		"Please add a valid URL with http or https"]
	},
	phone:{
		type:String,
		maxlength:[20,"phone number cannot be more than 20 number"]
	},
	email:{
		type:String,
		match:[/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/,
		"Please enter a valid email"]
	},
	address:{
		type:String,
		required:[true,"Please add an address"]
	},
	location:{
		type:{
			type:String,
			enum:["Point"]
		},
		coordinates:{
			type:[Number],
			index:'2dsphere'
		},
		formattedAddress:String,
		street:String,
		city:String,
		state:String,
		zipcode:String,
		country:String
	},
	careers:{
		type:[String],
		required:true,
		enum:["Web Development",
		"Mobile Development",
		"UI/UX",
		"Data Science",
		"Business",
		"Other"]
	},
	averageRating:{
		type:Number,
		min:[1,"Rating must be atleast 1"],
		max:[10,"Rating cannot be more than 10"]
	},
	averageCost:Number,
	photo:{
		type:String,
		default:"no-photo.jpg"
	},
	housing:{
		type:Boolean,
		default:false
	},
	jobAssistance:{
		type:Boolean,
		default:false
	},
	jobGuarantee:{
		type:Boolean,
		default:false
	},
	acceptGi:{
		type:Boolean,
		default:false
	},
	createdAt:{
		type:Date,
		default:Date.now()
	},
	user:{
		type:mongoose.Schema.ObjectId,
		ref:"User",
		required:true
	}
},{
	toObject:{virtuals:true},
	toJSON:{virtuals:true}
})

// Create bootcamp slug from the name
BootcampSchema.pre("save",function(next){
	this.slug= slugify(this.name,{lower:true});
	next();
})

// Cascade delete courses when a bootcamp is deleted
BootcampSchema.pre("remove",async function(next){
	await this.model("Course").deleteMany({bootcamp:this._id})
	next();
})

// Reverse populate with virtuals;
BootcampSchema.virtual("courses",{
	ref:"Course",
	localField:"_id",
	foreignField:"bootcamp"
})

// Geocode and create location field
BootcampSchema.pre("save",async function(next){
	const loc = await geocoder.geocode(this.address);
	this.location={
		type:"Point",
		coordinates:[loc[0].longitude,loc[0].latitude],
		formattedAddress:loc[0].formattedAddress,
		street:loc[0].streetName,
		city:loc[0].city,
		state:loc[0].stateCode,
		zipcode:loc[0].zipcode,
		country:loc[0].countryCode
	}
	// Do no save address in DB
	this.address = undefined;
	next();
})

module.exports = mongoose.model("Bootcamp",BootcampSchema);
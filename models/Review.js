const mongoose = require("mongoose");

const reviewSchema =new mongoose.Schema({
	title:{
		type:String,
		required:[true,"Please add a title for the review"],
		trim:true,
		maxlength:100
	},
	text:{
		type:String,
		required:[true,"Please add some text"]
	},
	rating:{
		type:Number,
		min:1,
		max:10,
		required:[true,"Please add a rating between 1 and 10"]
	},	
	createdAt:{
		type:Date,
		default:Date.now()
	},
	bootcamp:{
		type:mongoose.Schema.ObjectId,
		ref:"Bootcamp",
		required:true
	},
	user:{
		type:mongoose.Schema.ObjectId,
		ref:"User",
		required:true
	}
})

// Static method to get avg of rating
reviewSchema.statics.getAverageRating=async function(bootcampId){
	const obj=await this.aggregate([
		{
			$match:{bootcamp:bootcampId}
		},
		{
			$group:{
				_id:"$bootcamp",
				averageRating:{$avg:"$rating"}
			}
		}
	])
	try{
		await this.model("Bootcamp").findByIdAndUpdate(bootcampId,{
			averageRating:obj[0].averageRating
		})
	}catch(err){
		console.log(err);
	}
}

// Call getAverageRating after save
reviewSchema.post("save",function(){
	this.constructor.getAverageRating(this.bootcamp);
})

// Call getAverageRating before remove
reviewSchema.pre("remove",function(){
	this.constructor.getAverageRating(this.bootcamp);
})

// Prevent user from submitting more than one review per bootcamp
reviewSchema.index({bootcamp:1,user:1},{unique:true})

module.exports = mongoose.model("Review",reviewSchema);
const advancedResults = (model,populate) => async (req,res,next) =>{
	let query;

	// Copy req.query
	const reqQuery = {...req.query};

	// Fields to exclude
	const removeFields = ["select","sort","page","limit"];

	// Loop over the removeFields are remove them from reqQuery
	removeFields.forEach(field => delete reqQuery[field]);

	// Create query string
	let queryStr = JSON.stringify(reqQuery);

	// Create operators ($gte|$gt|$lte etc)
	queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in)\b/g,match=>`$${match}`);

	// Finding resource
	query= model.find(JSON.parse(queryStr))

	// Select fields
	if(req.query.select){
		const fields= req.query.select.split(",").join(" ");
		query=query.select(fields);
	}

	// Sort
	if(req.query.sort){
		const sortBy = req.query.sort.split(",").join(" ");
		query=query.sort(sortBy);
	}else{
		query=query.sort("-createdAt")
	}

	// Pagination
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 25;
	const skip = (page-1)*limit;
	const endIndex = page * limit;
	const total = await model.countDocuments();
	query = query.skip(skip).limit(limit);

	if(populate){
		query = query.populate(populate)
	}

	// Executing query
	const results = await query;

	// Pagination Result
	const pagination={};
	if(endIndex < total){
		pagination.next={
			page:page+1,
			limit:limit
		}
	}
	if(skip > 0){
		pagination.prev={
			page:page-1,
			limit:limit
		}
	}



	res.advancedResults={
		success:true,
		count:results.length,
		pagination:pagination,
		data:results
	}
	next();
}

module.exports = advancedResults;
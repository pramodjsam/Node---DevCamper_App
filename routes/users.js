const express = require("express");
const {getUsers,
	getUser,
	createUser,
	updateUser,
	deleteUser} = require("../controllers/users");
const router = express.Router();

const advancedResults = require("../middleware/advancedResults");
const {protect,authorize} = require("../middleware/auth");

const User = require("../models/User");

router.use(protect);
router.use(authorize("admin"));

router.route("/")
	.get(advancedResults(User),getUsers)
	.post(createUser)

router.route("/:id")
	.get(getUser)
	.put(updateUser)
	.delete(deleteUser)



module.exports = router;
const express = require("express");
const router = express.Router(); //suur "R" on oluline!
const general = require("../generalfnc")
const {newsHome,
	addNews,
	addingNews,
	newsList} = require("../controllers/newsController");

//kõikidele marsruutidele vahevara checkLogin
router.use(general.checkLogin);

//marsruudid
//kuna kõik on nkn "/news", ss lis "/"
//kuna tahame kasutada kontrolleried, ss .get tleb järgi
router.route("/").get(newsHome);

router.route("/add").get(addNews);

router.route("/add").post(addingNews);

router.route("/read").get(newsList);

module.exports = router;

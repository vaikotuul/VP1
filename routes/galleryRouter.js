const express = require("express");
const router = express.Router(); //suur "R" on oluline!!!
const general = require("../generalfnc");

//kõikidele marsruutidele ühine vahevara (middleware)
router.use(general.checkLogin);

//kontrollerid
const {
	galleryOpenPage,
	galleryPage} = require("../controllers/galleryController");

router.route("/").get(galleryOpenPage);

router.route("/:page").get(galleryPage);

module.exports = router;
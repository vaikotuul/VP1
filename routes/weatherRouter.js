const express = require("express");
const router = express.Router(); //suur "R" on oluline!
const {
	weatherHome,
	locationWeather
} = require("../controllers/weatherController");
//marsruudid
//kuna kõik on nkn "/weather", ss lis "/"
//kuna tahame kasutada kontrolleried, ss .get tleb järgi
router.route("/").get(weatherHome);

router.route("/location/:name").get(locationWeather);

module.exports = router;
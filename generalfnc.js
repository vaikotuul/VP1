exports.checkLogin = function(req, res, next) {
	if(req.session != null) {
		if(req.session.userId){
			console.log("Login OK!");
			next();
		}
		else {
			console.log("Login failed!");
			res.redirect("/");
		}
	}
	else {
		res.redirect("/");
	}
}
const express = require("express");
const dateTime = require("./dateTime");
const fs = require("fs");
const app = express();
//et saada kõik päringust kätte
const bodyparser = require("body-parser");
//andmebaasi andmed
const dbInfo = require("../../vp2024config");
//andmebaasiga suhtlemine
const mysql = require("mysql2");
//fotode üleslaadimiseks
const multer = require("multer");
//fotomanipulatsiooniks
const sharp = require("sharp");
//paroolide krüpteerimiseks
const bcrypt = require("bcrypt");
//sessioonihaldur
const session = require("express-session");
//asünkroonsuse võimaldaja
const asyn = require("async");

//määran view mootori
app.set("view engine", "ejs");
//määran jagatavate failide kausta
app.use(express.static("public"));
//kasutame body-parserit päringute parsimiseks (kui ainult tekst, siis false, kui ka pildid jms, siis true)
app.use(bodyparser.urlencoded({extended: true}));
//seadistame fotode üleslaadimiseks vahevara (middleware), mis määrab kataloogi, kuhu laetakse
const upload = multer({dest: "./public/gallery/orig"});
//sessioonihaldur
app.use(session({secret: "myCat", saveUninitialized: true, resave: true}));
let mySession;

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

app.get("/", (req, res)=>{
	//res.send("Express läks täitsa käima!");
	//console.log(dbInfo.configData.host);
	res.render("index");
});

app.post("/", (req, res)=>{
	let notice = null;
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log("Sisselogimise andmed pole täielikult korrektsed.");
		notice = "Sisselogimise andmeid on puudu!";
		res.render("index", {notice: notice});
	}
	else {
		let sqlReq = "SELECT id,password FROM vp2users WHERE email = ?";
		conn.execute(sqlReq, [req.body.emailInput], (err, result)=>{
			if(err){
				notice = "Tehnilise vea tõttu ei saa sisse logida";
				console.log(err);
				res.render("index", {notice: notice});
			}
			else {
				if(result[0] != null){
					//kontrollime kas sisselogimisel sisestatud paroolist saab sellise räsi nagu andmebaasis
					bcrypt.compare(req.body.passwordInput, result[0].password, (err, compareresult)=>{
						if(err){
							notice = "Tehnilise vea tõttu andmete kontrollimisel ei saa sisse logida!";
							console.log(err);
							res.render("index", {notice: notice});
						}
						else {
							//kui võrdlustulemus on positiivne
							if(compareresult){
								notice = "Oledki sisseloginud!";
								//võtame sessiooni kasututsele
								mySession = req.session;
								mySession.userId = result[0].id;
								//res.render("index", {notice: notice});
								res.redirect("/home");
							}
							else {
								notice = "Kasutajatunnus ja/või parool oli vale!";
								res.render("index", {notice: notice});
							}
						}
					});
				}
				else {
					notice = "Kasutajatunnus või parool oli vale!";
					res.render("index", {notice: notice});
				}
			}
		});
	}
	//res.render("index");
});

app.get("/", (req, res)=>{
	req.session.destroy();
	mySession = null;
	res.redirect("/");
});

app.get("/home", checkLogin, (req, res)=>{
	console.log("Sisse on loginud kasutaja: " + mySession.userId);
	res.render("home");
});

app.get("/signup", (req, res)=>{
	res.render("signup");
});

app.post("/signup", (req, res)=>{
	let notice = "Ootan andmeid";
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log("Andmeid puudu või paroolid ei kattu!");
		notice = "Andmeid puudu või paroolid ei kattu!";
		res.render("signup", {notice: notice});
	}
	else{
		notice = "Andmed korras!";
		bcrypt.genSalt(10, (err, salt)=>{
			if (err){
				notice = "Tehniline viga, kasutajat ei loodud.";
				res.render("signup", {notice: notice});
			}
			else {
				bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
					if (err){
						notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud.";
						res.render("signup", {notice: notice});
					}
					else {
						let sqlReq = "INSERT INTO vp2users (first_name, last_name, birth_date, gender, email, password) VALUES(?,?,?,?,?,?)";
						conn.execute(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
							if (err){
								notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud.";
								res.render("signup", {notice: notice});
							}
							else {
								notice = "Kasutaja " + req.body.emailInput + " edukalt loodud!";
								res.render("signup", {notice: notice});
							}
						});
						
					}
				});
			}
		});
		//res.render("signup", {notice: notice});
	}
	//res.render("signup");
});

app.get("/timenow", (req, res)=>{
	const weekdayNow = dateTime.weekDayEt();
	const dateNow = dateTime.dateFormattedEt();
	const timeNow = dateTime.timeFormattedEt();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});
});

app.get("/vanasonad", (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=>{
		if(err){
			throw err;
		}
		else {
			folkWisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
		}
	});
});

app.get("/reglist", (req, res)=>{
	let regList = [];
	fs.readFile("public/textfiles/log.txt", "utf8", (err, data)=>{
		if(err){
			throw err;
		}
		else{
			regList = data.split(";");
			res.render("reglist", {h1: "Regristreeritud külastused", listData: regList})
		}
	});
});

app.get("/regvisit", (req, res)=>{
	res.render("regvisit");
});

app.post("/regvisit", (req, res)=>{
	const weekdayNow = dateTime.weekDayEt();
	const dateNow = dateTime.dateFormattedEt();
	const timeNow = dateTime.timeFormattedEt();
	//console.log(req.body);
	//avan txt faili selliselt et kui seda pole olemas, luuakse
	fs.open("public/textfiles/log.txt", "a", (err, file)=>{
		if(err){
			throw err;
		}
		else {
			fs.appendFile("public/textfiles/log.txt",";" + req.body.firstNameInput + " " + req.body.lastNameInput + " " + dateNow + " " + timeNow, (err)=>{
				if(err){
					throw err;
				}
				else {
					console.log("Faili kirjutati!");
					res.render("regvisit");
				}
			});
		}
	});
});

app.get("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	//kontrollin kas kõik vajalikud andmed on olemas
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		//console.log("Osa andmeid puudu!");
		notice = "Osa andmeid puudu!";
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
	}
	else {
		let sqlReq = "INSERT INTO visitlog (first_name, last_name) VALUES(?,?)";
		conn.query(sqlReq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlRes)=>{
			if(err){
				notice = "Tehnilistel põhjustel andmeid ei salvestatud!";
				res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
				throw err;
			}
			else {
				//notice = "Andmed salvestati!";
				//res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
				res.redirect("/");
			}
		});
	}
});

app.get("/reglistdb", (req, res)=>{
	let sqlReq = "SELECT first_name, last_name FROM visitlog";
	conn.query(sqlReq, (err, sqlRes)=>{
		if(err){
			throw err;
		}
		else{
			res.render("reglistdb", {h1: "Regristreeritud külastused", visitlog: sqlRes});
		}
	});
});

app.get("/eestifilm", (req, res)=>{
	res.render("eestifilm");
});

//Filmiandmete lisamine andmebaasi
app.get("/eestifilm/lisa", (req, res)=>{
    let firstName = "";
    let lastName = "";
    let movieTitle = "";
    let productionYear = "";
    let duration = "";
    let movieDesc = "";
    let posName = "";
    let posDesc = "";
	notice = "";
    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
});

app.post("/eestifilm/lisa", (req, res)=>{
    let firstName = "";
    let lastName = "";
    let birthDate = "";
    let movieTitle = "";
    let productionYear = "";
    let duration = "";
    let movieDesc = "";
    let posName = "";
    let posDesc = "";
    if(req.body.personSubmit){
        if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput){
            notice = "Osa andmeid on puudu!";
            firstName = req.body.firstNameInput;
            lastName = req.body.lastNameInput;
            birthDate = req.body.birthDateInput;
            res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
        }
        else{
            let sqlReq = "INSERT INTO person (first_name, last_name, birth_date) VALUES (?,?,?)";
            conn.query(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput], (err, sqlRes)=>{
                if(err){
                    notice = "Esines viga!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                    throw err;
                }
                else{
                    notice = "Isik lisati andmebaasi!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                }
            });
        }
    }
    else if(req.body.movieSubmit){
        if(!req.body.movieTitleInput || !req.body.productionYearInput || !req.body.durationInput || !req.body.movieDescInput){
            notice = "Osa andmeid on puudu!";
            movieTitle = req.body.movieTitleInput;
            productionYear = req.body.productionYearInput;
            duration = req.body.durationInput;
            movieDesc = req.body.movieDescInput;
            res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
        }
        else{
            let sqlReq = "INSERT INTO movie (title, production_year, duration, description) VALUES (?,?,?,?)";
            conn.query(sqlReq, [req.body.movieTitleInput, req.body.productionYearInput, req.body.durationInput, req.body.movieDescInput], (err, sqlRes)=>{
                if(err){
                    notice = "Esines viga!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                    throw err;
                }
                else{
                    notice = "Film lisati andmebaasi!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                }
            });
        }
    }
    else if(req.body.positionSubmit){
        if(!req.body.posNameInput || !req.body.posDescInput){
            notice = "Osa andmeid on puudu!";
            posName = req.body.posNameInput;
            posDesc = req.body.posDescInput;
            res.render("addData", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
        }
        else{
            let sqlReq = "INSERT INTO position (position_name, description) VALUES (?,?)";
            conn.query(sqlReq, [req.body.posNameInput, req.body.posDescInput], (err, sqlRes)=>{
                if(err){
                    notice = "Esines viga!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                    throw err;
                }
                else{
                    notice = "Amet lisati andmebaasi!";
                    res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
                }
            });
        }
    }
    else{
        notice = "Esines viga!";
        res.render("addperson", {notice: notice, firstName: firstName, lastName: lastName, movieTitle: movieTitle, productionYear: productionYear, duration: duration, movieDesc: movieDesc, posName: posName, posDesc: posDesc});
    }
});

app.get("/eestifilm/lisaseos", (req, res)=>{
	//kasutades async moodulit panen mitu andmebaasi päringut paraleelselt toimima
	//loon SQL päringute (lausa tegevuste ehk funktsioonide) loendi
	const myQueries = [
		function(callback){
			conn.execute("SELECT id, first_name, last_name, birth_date FROM person", (err, result)=>{
				if(err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute("SELECT id, title, production_year FROM movie", (err, result)=>{
				if(err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute("SELECT id, position_name FROM position", (err, result)=>{
				if(err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
	];
	//paneme need tegevused paraleelselt tööle, tulemuse saab siis kui kõik tehtud
	//väljundiks üks koondlist
	asyn.parallel(myQueries, (err, results)=>{
		if(err){
			throw err;
		}
		else {
			console.log(results);
			res.render("addrelations", {personList: results[0], movieList: results[1], positionList: results[2]});
		}
	});
	//let sqlReq = "SELECT id, first_name, last_name, birth_date FROM person";
	//conn.execute(sqlReq, (err, result)=>{
	//	if(err){
	//		throw err
	//	}
	//	else {
	//		console.log(result);
	//		res.render("addrelations", {personList: result});
	//	}
	//})
});

app.get("/eestifilm/tegelased", (req, res)=>{
	//loon andmebaasi päringus
	let sqlReq = "SELECT id, first_name, last_name, birth_date FROM person";
	conn.query(sqlReq, (err, sqlRes)=>{
		if(err){
			res.render("tegelased", {persons: []});
			//throw err;
		}
		else {
			//console.log(sqlRes);
			res.render("tegelased", {persons: sqlRes});
		}
	});
	//res.render("tegelased");
});

app.get("/eestifilm/personrelations/:id", (req, res)=>{
	console.log(req.params.id);
	res.render("personrelations");
});

app.get("/photoupload", (req, res)=>{
	res.render("photoupload");
});

app.post("/photoupload", upload.single("photoInput"), (req, res)=>{
	console.log(req.body);
	console.log(req.file);
	const fileName = "vp_" + Date.now() + ".jpg";
	fs.rename(req.file.path, req.file.destination + "/" + fileName, (err)=>{
		console.log("Faili nime muutmise viga: " + err);
	});
	sharp(req.file.destination + "/" + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
	sharp(req.file.destination + "/" + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
	//salvestame info andmebaasi
	let sqlReq = "INSERT INTO photos (file_name, orig_name, alt_text, privacy, user_id) VALUES(?,?,?,?,?)";
	const userId = 1;
	conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
		if(err){
			throw(err);
		}
		else {
			res.render("photoupload");
		}
	});
});

app.get("/gallery", (req, res)=>{
	let sqlReq = "SELECT id, file_name, alt_text FROM photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC";
	const privacy = 3;
	let photoList = [];
	conn.execute(sqlReq, [privacy], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			for(let i = 0; i < result.length; i ++) {
				photoList.push({id: result[i].id, href: "/gallery/thumb/", filename: result[i].file_name, alt: result[i].alt_text});
			}
			res.render("gallery", {listData: photoList});
		}
	});
	//res.render("gallery");
});

function checkLogin(req, res, next){
	if(mySession != null) {
		if(mySession.userId){
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

app.listen(5221);
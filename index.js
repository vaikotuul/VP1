const express = require("express");
const dateTime = require("./dateTime");
const general = require("./generalfnc")
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
app.use(express.urlencoded({extended: true}));
//kasutame body-parserit päringute parsimiseks (kui ainult tekst, siis false, kui ka pildid jms, siis true)
app.use(bodyparser.urlencoded({extended: true}));
//seadistame fotode üleslaadimiseks vahevara (middleware), mis määrab kataloogi, kuhu laetakse
const upload = multer({dest: "./public/gallery/orig"});
//sessioonihaldur
app.use(session({secret: "myCat", saveUninitialized: true, resave: true}));
//let mySession;

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

//Uudiste osa eraldi ruuteriga
const newsRouter = require("./routes/newsrouter");
app.use("/news", newsRouter)
//Eesti filmi osa eraldi ruuteriga
const eestifilmRouter = require("./routes/eestifilmRouter");
app.use("/eestifilm", eestifilmRouter);
let notice = "";

//Avaleht
//Avaleht
app.get("/", (req, res)=>{
    const myQueries = [
        function(callback){
            conn.execute("SELECT id, file_name, alt_text FROM photos WHERE privacy = 3 AND deleted IS NULL ORDER BY added DESC", (err, result)=>{
                if(err) {
                    return callback(err);
                }
                else {
                    return callback(null, result);
                }
            });
        }
    ];
    //paneme need tegevused paralleelselt tööle. tulemuse saab siis kui kõik tehtud. tulemuseks üks koondlist.
    asyn.parallel(myQueries, (err, results)=>{
        if(err){
            console.log(err);
            res.render("index");
        }
        else{
            console.log(results[0][0]);
            res.render("index", {
                id: results[0][0].id,
                href: "/gallery/thumb/", 
                filename: results[0][0].file_name, 
                alt: results[0][0].alt_text
            });
        }
    });
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
								//mySession = req.session;
								//mySession.userId = result[0].id;
								req.session.userId = result[0].id;
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

//app.get("/", (req, res)=>{
//	req.session.destroy();
	//mySession = null;
//	res.redirect("/");
//});

app.get("/home", general.checkLogin, (req, res)=>{
	console.log("Sisse on loginud kasutaja: " + req.session.userId);
	res.render("home");
});

app.get("/signup", (req, res)=>{
	res.render("signup");
});

app.post("/signup", (req, res) => {
    let notice = "Ootan andmeid";
    if (!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput) {
        console.log("Andmeid puudu või paroolid ei kattu!");
        notice = "Andmeid puudu või paroolid ei kattu!";
        res.render("signup", {notice: notice, firstName: req.body.firstNameInput, lastName: req.body.lastNameInput, birthDate: req.body.birthDateInput, gender: req.body.genderInput, email: req.body.emailInput});
    } 
	else {
        // Kas emailiga on juba konto olemas
        let sqlCheckEmail = "SELECT id FROM vp2users WHERE email = ?";
        conn.execute(sqlCheckEmail, [req.body.emailInput], (err, result) => {
            if (err) {
                notice = "Tehniline viga, kasutajat ei loodud.";
                console.log(err);
                res.render("signup", {notice: notice});
            } 
			else if (result.length > 0) {
                notice = "Selle e-mailiga kasutaja on juba olemas!";
                res.render("signup", {notice: notice, firstName: req.body.firstNameInput, lastName: req.body.lastNameInput, birthDate: req.body.birthDateInput, gender: req.body.genderInput, email: req.body.emailInput});
            } 
			else {
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) {
                        notice = "Tehniline viga, kasutajat ei loodud.";
                        res.render("signup", {notice: notice});
                    } else {
                        bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash) => {
                            if (err) {
                                notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud.";
                                res.render("signup", {notice: notice});
                            } else {
                                let sqlInsert = "INSERT INTO vp2users (first_name, last_name, birth_date, gender, email, password) VALUES(?,?,?,?,?,?)";
                                conn.execute(sqlInsert, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result) => {
                                    if (err) {
                                        notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud.";
                                        res.render("signup", {notice: notice});
                                    } else {
                                        notice = "Kasutaja " + req.body.emailInput + " edukalt loodud!";
                                        res.render("signup", {notice: notice});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
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

app.get("/photoupload", general.checkLogin,(req, res)=>{
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

//galerii osa eraldi marsruutide failiga
const galleryRouter = require("./routes/galleryRouter");
app.use("/gallery", galleryRouter);

//galerii osa eraldi marsruutide failiga
const weatherRouter = require("./routes/weatherRouter");
app.use("/weather", weatherRouter);

app.listen(5221);
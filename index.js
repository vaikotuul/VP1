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

//määran view mootori
app.set("view engine", "ejs");
//määran jagatavate failide kausta
app.use(express.static("public"));
//kasutame body-parserit päringute parsimiseks (kui ainult tekst, siis false, kui ka pildid jms, siis true)
app.use(bodyparser.urlencoded({extended: false}));

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

app.get("/eestifilm/lisa", (req, res)=>{
	res.render("lisa")
});

app.post("/eestifilm/lisa", (req, res)=>{
	// Filmitegelase lisamine
    if (req.body.personSubmit) {
        const personName = req.body.personName();
        console.log("Lisatud tegelane:", {personName});
        res.send("Tegelane ", {personName}, " lisatud!");
    }

    // Filmi lisamine
    if (req.body.filmSubmit) {
        const filmTitle = req.body.filmTitle();
        const filmYear = req.body.filmYear();
        console.log("Lisatud film:", {filmTitle}, {filmYear});
        res.send("Film ", {filmTitle}, " ", {filmYear}, " lisatud!");
    }

    // Rolli lisamine
    if (req.body.roleSubmit) {
        const rolePerson = req.body.rolePerson();
        const roleFilm = req.body.roleFilm();
        const roleType = req.body.roleType();
        console.log("Lisatud roll: ", {rolePerson}, " filmis ", {roleFilm}, " kui ", {roleType});
        res.send("Roll ", {rolePerson}, " filmis ", {roleFilm}, " kui ", {roleType}, " lisatud!");
	}
	res.render("lisa");
});


app.get("/eestifilm/tegelased", (req, res)=>{
	//loon andmebaasi päringus
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
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



app.listen(5221);
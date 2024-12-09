const express = require("express");
const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const bodyparser = require("body-parser");
const app = express();

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

//avaleht
app.get("/", (req, res) => {
		res.render("index");
});

app.get("/viljavedu", (req, res) => {
    conn.query(
        "SELECT * FROM vp2viljavedu WHERE weight_out IS NULL",
        (err, results) => {
            if (err) throw err;
            res.render("viljavedu", { koormad: results });
        }
    );
});

app.post("/lisa-koorem", (req, res) => {
	const { truck, weight_in, weight_out } = req.body;
	conn.query(
		"INSERT INTO vp2viljavedu (truck, weight_in, weight_out) VALUES (?, ?, ?)",
		[truck, weight_in, weight_out || null],
		err => {
			if (err) throw err;
			res.redirect("/")
		}
	)
});

app.post("/uuenda-valjumismass", (req, res) => {
	const { id, weight_out } = req.body;
	conn.query(
		"UPDATE vp2viljavedu SET weight_out = ? WHERE id = ?",
		[weight_out, id],
		err => {
			if (err) throw err;
			res.redirect("/");
		}
	);
});

app.get("/kokkuvote", (req, res) => {
    const filter = req.query.filter;
    let query = "SELECT * FROM vp2viljavedu";
	const params = [];
	if (filter) {
		query += "WHERE truck LIKE ?"
		params.push(`%${filter}%`);
	}

    conn.query(query, params, (err, results) => {
        if (err) throw err;
		
		conn.query(
		"SELECT SUM(weight_in) AS total_in, SUM(weight_out) AS total_out FROM vp2viljavedu WHERE weight_out IS NOT NULL",
		(err, summary) => {
			if (err) throw err;
			
			const totalMass = (summary[0].total_in || 0) - (summary[0].total_out || 0);
			
			}
		);
    });
});

app.listen(5221);
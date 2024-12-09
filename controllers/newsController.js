const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const dateTime = require("../dateTime");

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

//@desc homepage for news section
//@route GET /api/news
//@access private

const newsHome = (req, res)=>{
	res.render("news");
};

//@desc page for adding news
//@route GET /api/news
//@access private

const addNews = (req, res)=>{
	res.render("addnews");
};

//@desc adding news
//@route POST /api/news
//@access private

const addingNews = (req, res)=>{
	if(!req.body.titleInput || !req.body.contentInput || !req.body.expireInput){
		console.log('Uudisega jama');
		notice = 'Andmeid puudu!';
		res.render('addnews', {notice: notice});
	}
	else {
		let sql = 'INSERT INTO vp2news (news_title, news_text, expire_date, user_id) VALUES(?,?,?,?)';
			//andmebaasi osa
			conn.execute(sql, [req.body.titleInput, req.body.contentInput, req.body.expireInput, req.session.userId], (err, result)=>{
				if(err) {
					throw err;
					notice = 'Uudise salvestamine ebaõnnestus!';
					res.render('addnews', {notice: notice});
				} else {
					notice = 'Uudis edukalt salvestatud!';
					res.render('addnews', {notice: notice});
				}
			});
	}
};

//@desc page for reading news headings
//@route GET /api/news
//@access private

const newsList = (req, res)=>{
	let sql = "SELECT id, news_title FROM vp2news WHERE expire_date > ? ORDER BY id DESC";
		//let userid = 1;
		//andmebaasi osa
		conn.execute(sql, [new Date()], (err, result)=>{
			if(err) {
				//throw err;
				const news = [{id: 0, news_title: "Uudiseid pole!"}];
				notice = 'Uudiste lugemine ebaõnnestus!' + err;
				res.render('readnews', {news: news});
			} else {
				notice = 'Uudised edukalt loetud!';
				res.render('readnews', {news: result});
			}
		});
	//res.render("readnews");
};

//@desc page for reading news headings
//@route GET /api/news
//@access private

const newsreader = (req, res)=>{
	let sql = "SELECT news_title, news_text, news_date FROM vp2news WHERE id = ? AND expire_date > ?";
		//let userid = 1;
		//andmebaasi osa
		conn.execute(sql, [req.params.id, new Date()], (err, result)=>{
			if(err) {
				//throw err;
				console.log(err);
				const news = {id: 0, news_title: "Sellist uudist pole!", news_text: "", news_date: null};
				res.render('readnewsitem', {news: news});
			} else {
				console.log(dateTime.fromDateFormattedEt(result[0].news_date));
				let news = {news_title: result[0].news_title, news_text: result[0].news_text, news_date: dateTime.fromDateFormattedEt(result[0].news_date)};
				res.render('readnewsitem', {news: news});
			}
		});
	//res.render("readnews");
};

//@desc page for editing news
//@route GET /api/news
//@access private

const editnews = (req, res)=>{
    let sqlReq = "SELECT id, news_title, news_date FROM vp2news WHERE expire_date > DATE(NOW()) ORDER BY news_date DESC";
    conn.execute(sqlReq, (err, sqlRes)=>{
        if(err){
            res.render("editnews", {news: []});
        }
        else{
            res.render("editnews", {news: sqlRes});
        }
    });
};

//@desc page for editing news
//@route GET /api/news
//@access private

const editarticle = (req, res)=>{
    let sqlReq = "SELECT id, news_title, news_text, expire_date FROM vp2news WHERE id = ?";
    conn.execute(sqlReq, [req.params.id], (err, sqlRes)=>{
        if(err){
            console.log("Ei saanud artiklit kätte!");
			res.render("editarticle", { notice: "Sellist artiklit ei eksisteeri!" });
        } else {
            res.render("editarticle", {
            news: {
					id: sqlRes[0].id,
					title: sqlRes[0].news_title,
					content: sqlRes[0].news_text,
					expirationDate: sqlRes[0].expire_date.toISOString().split('T')[0],
				   },
			});
        }
    });
};

//@desc editing news
//@route GET /api/news
//@access private

const editingarticle = (req, res)=>{
    if(!req.body.titleInput || !req.body.contentInput || !req.body.expireInput){
		console.log('Uudisega jama');
		notice = 'Andmeid puudu!';
		res.render('editarticle', {notice: notice});
	} else {
		let sqlReq = 'UPDATE vp2news SET news_title = ?, news_text = ?, expire_date = ? WHERE id = ?';
        //andmebaasi osa
        conn.execute(sqlReq, [req.body.titleInput, req.body.contentInput, req.body.expireInput, req.params.id], (err, result)=>{
            if(err) {
                notice = 'Uudise uuendamine ebaõnnestus!';
                res.render('editarticle', {notice: notice});
                throw err;
            } else {
                notice = 'Uudis edukalt salvestatud!';
                res.render('news', {notice: notice});
            }
        });
        //andmebaasi osa lõppeb
    }
};

module.exports = {
	newsHome,
	addNews,
	addingNews,
	newsList,
	newsreader,
    editnews,
    editarticle,
    editingarticle
};
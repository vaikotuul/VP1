const weekdayNamesEt = ["p�hap�ev", "esmasp�ev", "teisip�ev", "kolmap�ev", "neljap�ev", "reede", "laup�ev"];
const monthNamesEt = ["jaanuar", "veebruar", "m�rts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"];

const dateFormattedEt = function(){	
	let timeNow = new Date();
	let dateNow = timeNow.getDate();
	let monthNow = timeNow.getMonth();
	let yearNow = timeNow.getFullYear();
	return dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
}

const fromDateFormattedEt = function(timeNow){	
	//let timeNow = new Date();
	let dateNow = timeNow.getDate();
	let monthNow = timeNow.getMonth();
	let yearNow = timeNow.getFullYear();
	return dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
}

const weekDayEt = function(){
	let timeNow = new Date();
	let dayNow = timeNow.getDay();
	return weekdayNamesEt[dayNow];
}

const timeFormattedEt = function(){
	let timeNow = new Date();
	let hourNow = timeNow.getHours();
	let minuteNow = timeNow.getMinutes();
	let secondNow = timeNow.getSeconds();
	return hourNow + ":" + minuteNow + ":" + secondNow;
}

const partOfDay = function(){
	let dPart = "suvaline aeg";
	let hourNow = new Date().getHours();
	//   OR   ||   AND  &&
	// >   <    >=  <=    !=   ==    ===
	if(hourNow > 8 && hourNow <= 16){
		dPart = "kooliaeg";
	}
	return dPart;
}

//ekspordin k�ik vajaliku
module.exports = {dateFormattedEt: dateFormattedEt, fromDateFormattedEt: fromDateFormattedEt, weekDayEt: weekDayEt, timeFormattedEt: timeFormattedEt, weekdayNamesEt: weekdayNamesEt, monthNamesEt: monthNamesEt, dayPart: partOfDay};
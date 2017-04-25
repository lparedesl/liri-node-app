var keys = require("./keys.js");
var fs = require("fs");
var request = require("request");
var inquirer = require('inquirer');
var open = require('open');
var twitter = require('twitter');
var spotify = require('spotify');
var choice = "";
var dataResponse = "";

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function showTweets(query) {
	var client = new twitter(keys.twitterKeys);
	client.get("search/tweets", {
		q: query,
		count: 20,
	}, function(error, tweets, response) {
		if(error) throw error;
		for (var i = 0; i < tweets.statuses.length; i++) {
			dataResponse += "\n\n" + "@" +
						   tweets.statuses[i].user.screen_name + ":\n" +
						   tweets.statuses[i].text + "\n" +
						   tweets.statuses[i].created_at.split(" +")[0];
		}
		console.log(dataResponse);
		fs.appendFileSync("log.txt", "\ncommand: " + choice + "\n\n" + dataResponse + "\n");
	});
}

function spotifyThis(type, query) {
	console.log("searching for " + query);
	console.log("");
	spotify.search({
		type: type,
		query: query,
	}, function(error, data) {
	    if(error) throw error;
	    var externalUrl = data[type + "s"].items[0].external_urls.spotify;
	    dataResponse = type.capitalizeFirstLetter() + ": " + data[type + "s"].items[0].name + "\n";
	    switch(type) {
	    	case "track":
		    	var durationMin = Math.floor(data.tracks.items[0].duration_ms / 60000);
		    	var durationSec = Math.floor(data.tracks.items[0].duration_ms / 1000 % 60);
		    	dataResponse += "Artist: " + data.tracks.items[0].artists[0].name + "\n" +
					    	   "Album: " + data.tracks.items[0].album.name + "\n" +
					    	   "Duration: " + durationMin + ":" + durationSec + " min\n" +
					    	   "Popularity: " + data.tracks.items[0].popularity + "\n";
	    		break;

	    	case "artist":
    		    var genres = "Genres: ";
    		    for (var j = 0; j < data.artists.items[0].genres.length; j++) {
    		    	genres += data.artists.items[0].genres[j] + ", ";
    		    }
    		    genres = genres.substring(0, genres.length-2);
    		    dataResponse += genres + "\n" +
    		    				"Popularity: " + data.artists.items[0].popularity + "\n";
	    		break;

	    	case "album":
	    		dataResponse += "Artist: " + data.albums.items[0].artists[0].name + "\n";
	    		break;
	    }
	    dataResponse += "URI: " + data[type + "s"].items[0].uri;
	    console.log(dataResponse);
	    console.log("");
	    fs.appendFileSync("log.txt", "\ncommand: " + choice + "\n\n" + dataResponse + "\n");
        inquirer.prompt([
    	{
    		type: "confirm",
    		message: "Play?",
    		name: "play",
    		default: false
    	}
        ]).then(function(response) {
    		if (response.play) {
    			open(externalUrl);
    		}
        });
	});
}

function movieThis(movieName) {
	var queryUrl = "";

	if (movieName === "") {
		queryUrl = "http://www.omdbapi.com/?t=mr.nobody&y=&plot=short&r=json";
	} else {
		queryUrl = "http://www.omdbapi.com/?t=" + movieName + "&y=&plot=short&r=json";
	}

	request(queryUrl, function(error, response, body) {
		if (!error && response.statusCode === 200) {
			dataResponse = "Title: " + JSON.parse(body).Title + "\n" +
						   "Year: " + JSON.parse(body).Year + "\n" +
						   "Country: " + JSON.parse(body).Country + "\n" +
						   "Language: " + JSON.parse(body).Language + "\n" +
						   "Plot: " + JSON.parse(body).Plot + "\n" +
						   "Actors: " + JSON.parse(body).Actors + "\n" +
						   JSON.parse(body).Ratings[0].Source + " Rating: " + JSON.parse(body).Ratings[0].Value + "\n" +
						   JSON.parse(body).Ratings[1].Source + " Rating: " + JSON.parse(body).Ratings[1].Value + "\n" +
						   "IMDB URL: " + "http://www.imdb.com/title/" + JSON.parse(body).imdbID;
			console.log(dataResponse);
			console.log("");
			fs.appendFileSync("log.txt", "command: " + choice + "\n\n" + dataResponse + "\n");
		inquirer.prompt([
		{
			type: "confirm",
			message: "Go to IMDB?",
			name: "confirm",
			default: false
		}
		]).then(function(response) {
			if (response.confirm) {
				open("http://www.imdb.com/title/" + JSON.parse(body).imdbID);
			}
		});
		}
	});
}

inquirer.prompt([
	{
		type: "list",
		message: "What do you want to do?",
		choices: ["Twitter", "Spotify", "Movies", "Do what it says"],
		name: "choice"
	},
]).then(function(data) {
	choice = data.choice;
	switch(choice) {
		case "Twitter":
			inquirer.prompt([
				{
					type: "input",
					message: "What do you want to search for?",
					name: "query"
				},
			]).then(function(data) {
				showTweets(data.query);
			});
			break;

		case "Spotify":
			inquirer.prompt([
				{
					type: "list",
					message: "What type of search do you want to do?",
					choices: ["track", "artist", "album"],
					name: "type"
				},
				{
					type: "input",
					message: "What do you want to listen to?",
					name: "query"
				},
			]).then(function(data) {
				spotifyThis(data.type, data.query);
			});
			break;

		case "Movies":
			inquirer.prompt([
			  {
			    type: "input",
			    message: "What movie do you want to search?",
			    name: "query"
			  },
			]).then(function(data) {
				movieThis(data.query);
			});
			break;

		case "Do what it says":
			fs.readFile("random.txt", "utf8", function(error, data) {
				if (error) throw error;
				switch(data.split(",")[0]) {
					case "my-tweets":
						showTweets("breaking");
						break;

					case "spotify-this-song":
						spotifyThis("track", data.split(",")[1]);
						break;

					case "movie-this":
						movieThis(data.split(",")[1]);
						break;
				}
			});
			break;
	}
	// fs.appendFileSync("log.txt", "\ncommand: " + choice + "\n\n" + dataResponse + "\n");
});
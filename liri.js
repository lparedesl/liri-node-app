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
			dataResponse += "\n\n@" +
						   tweets.statuses[i].user.screen_name + ":\n" +
						   tweets.statuses[i].text + "\n" +
						   tweets.statuses[i].created_at.split(" +")[0];
		}
		console.log(dataResponse);
		fs.appendFileSync("log.txt", "\n\ncommand: " + choice + "\n\n" + dataResponse);
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
	    dataResponse = type.capitalizeFirstLetter() + ": " + data[type + "s"].items[0].name;
	    switch(type) {
	    	case "track":
		    	var durationMin = Math.floor(data.tracks.items[0].duration_ms / 60000);
		    	var durationSec = Math.floor(data.tracks.items[0].duration_ms / 1000 % 60);
		    	dataResponse += "\nArtist: " + data.tracks.items[0].artists[0].name +
					    	   "\nAlbum: " + data.tracks.items[0].album.name +
					    	   "\nDuration: " + durationMin + ":" + durationSec +
					    	   " min\nPopularity: " + data.tracks.items[0].popularity;
	    		break;

	    	case "artist":
    		    var genres = "\nGenres: ";
    		    for (var j = 0; j < data.artists.items[0].genres.length; j++) {
    		    	genres += data.artists.items[0].genres[j] + ", ";
    		    }
    		    genres = genres.substring(0, genres.length-2);
    		    dataResponse += genres +
    		    				"\nPopularity: " + data.artists.items[0].popularity;
	    		break;

	    	case "album":
	    		dataResponse += "\nArtist: " + data.albums.items[0].artists[0].name;
	    		break;
	    }
	    dataResponse += "\nURI: " + data[type + "s"].items[0].uri;
	    console.log(dataResponse);
	    console.log("");
	    fs.appendFileSync("log.txt", "\n\ncommand: " + choice + "\n\n" + dataResponse);
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
	if (movieName === "") {
		movieName = "mr.nobody";
	}

	var queryUrl = "http://www.omdbapi.com/?t=" + movieName + "&y=&plot=short&r=json";

	request(queryUrl, function(error, response, body) {
		if (!error && response.statusCode === 200) {
			dataResponse = "Title: " + JSON.parse(body).Title +
						   "\nYear: " + JSON.parse(body).Year +
						   "\nCountry: " + JSON.parse(body).Country +
						   "\nLanguage: " + JSON.parse(body).Language +
						   "\nPlot: " + JSON.parse(body).Plot +
						   "\nActors: " + JSON.parse(body).Actors + "\n" +
						   JSON.parse(body).Ratings[0].Source + " Rating: " + JSON.parse(body).Ratings[0].Value + "\n" +
						   JSON.parse(body).Ratings[1].Source + " Rating: " + JSON.parse(body).Ratings[1].Value +
						   "\nIMDB URL: " + "http://www.imdb.com/title/" + JSON.parse(body).imdbID;
			console.log(dataResponse);
			console.log("");
			fs.appendFileSync("log.txt", "\n\ncommand: " + choice + "\n\n" + dataResponse);
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
});
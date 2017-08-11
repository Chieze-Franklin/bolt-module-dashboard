var config = require("bolt-internal-config");
var errors = require("bolt-internal-errors");
var models = require("bolt-internal-models");
var utils = require("bolt-internal-utils");

var fs = require('fs');
var path = require("path");
var mongodb = require('mongodb');
var superagent = require('superagent');

const X_BOLT_APP_TOKEN = 'X-Bolt-App-Token';

/*
**Impersonating Bolt**
bolt-module-dashboard registers various collections
bolt-module-dashboard also lists Bolt (bolt) as a tenant to each of its collection
	meaning bolt has write (and read) access to its collections
when accessing any of those collections, we use bolt's app token (request.appName) instead of the app token for bolt-module-dashboard
we can use bolt's app token because bolt-module-dashboard installs (hopefully) as a system app
we have to use bolt's app token because bolt-module-dashboard can't have an app token of its own since it is a module (see its package.json)
*/

module.exports = {
	deleteCard: function(request, response){
		var appName = request.appName;
		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/cards/remove?app=' + appName)
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard' })
			.end(function(err, res) {
				//TODO: get the card deleted
				utils.Events.fire('dashboard-card-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse({ app: appName }, err));
			});
	},
	deleteTile: function(request, response){
		var appName = request.appName;
		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/tiles/remove?app=' + appName)
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard' })
			.end(function(err, res) {
				//TODO: get the tile deleted
				utils.Events.fire('dashboard-tile-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse({ app: appName }, err));
			});
	},
	deleteView: function(request, response){
		var appName = request.appName;
		utils.Events.fire('dashboard-view-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
		response.send(utils.Misc.createResponse({ app: appName }));
	},
	postCard: function(request, response){
		/*
		*** schema of a card ***
		{
			"type": String, //(optional), values: 'text' (default), 'image'
			"app": String, //the name of the app that owns this card (request.appName)
			"route": String, //
			"query": String, //
			"background": String, //the background colour (for type=='text') or image (for type='image') of the card
			"subject": String, //the bold text of the card (ignored if type=='image')
			"message": String, //(optional) the description of the subject of the card (ignored if type=='image')
			"more": String //(optional) a link to more info
		}
		*/

		var card = {
			app: request.appName,
			background: request.body.background,
			query: request.body.query,
			route: request.body.route,
			subject: request.body.subject,
			type: request.body.type
		};
		if (request.body.type !== 'image') {
			card.message = request.body.message;
		}
		
		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/cards/replace?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard', values: card, upsert: true })
			.end(function(err, res) {
				utils.Events.fire('dashboard-card-posted', { body: card }, request.bolt.token, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse(card, err));
			});
	},
	postTile: function(request, response){
		/*
		*** schema of a tile ***
		{
			"type": String, //(optional), values: 'text' (default), 'image'
			"app": String, //the name of the app that owns this tile (request.appName)
			"route": String, //
			"query": String, //
			"background": String, //the background colour (for type=='text') or image (for type='image') of the tile
			"subject": String, //the bold text of the tile (ignored if type=='image')
			"message": String //(optional) the description of the subject of the tile (ignored if type=='image')
		}
		*/

		var tile = {
			app: request.appName,
			background: request.body.background,
			query: request.body.query,
			route: request.body.route,
			subject: request.body.subject,
			type: request.body.type
		};
		if (request.body.type !== 'image') {
			tile.message = request.body.message;
		}

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/tiles/replace?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard', values: tile, upsert: true })
			.end(function(err, res) {
				utils.Events.fire('dashboard-tile-posted', { body: tile }, request.bolt.token, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse(tile, err));
			});
	},
	postView: function(request, response){
		/*
		*** schema of a view ***
		{
			"app": String, //the name of the app that owns this view (request.appName)
			"subject": String,
			"route": String, //
			"query": String, //
			"height": Number, //the preferred height of the view
			"width": Number, //the preferred width of the view
		}
		*/

		var view = {
			app: request.appName,
			subject: request.body.subject,
			height: request.body.height,
			query: request.body.query,
			route: request.body.route,
			width: request.body.width
		};

		//views are not persisted in the database, so we just fire them
		utils.Events.fire('dashboard-view-posted', { body: view }, request.bolt.token, function(eventError, eventResponse){});
		response.send(utils.Misc.createResponse(view));
	},

	hookForBoltAppUninstalled: function(request, response){
		var event = request.body;
		if (event.token == request.bolt.token) {
			var app = event.body;

			var appName = app.name;

			superagent
				.post(process.env.BOLT_ADDRESS + '/api/db/cards/remove?app=' + appName)
				.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
				.send({ app: 'bolt-module-dashboard' })
				.end(function(err, res) {
					//TODO: get the card deleted
					utils.Events.fire('dashboard-card-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
				});

			superagent
				.post(process.env.BOLT_ADDRESS + '/api/db/tiles/remove?app=' + appName)
				.set(X_BOLT_APP_TOKEN, request.bolt.token) //see **Impersonating Bolt** above to understand this line
				.send({ app: 'bolt-module-dashboard' })
				.end(function(err, res) {
					//TODO: get the tile deleted
					utils.Events.fire('dashboard-tile-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
				});

			utils.Events.fire('dashboard-view-deleted', { body: { app: appName } }, request.bolt.token, function(eventError, eventResponse){});
			
			response.send(utils.Misc.createResponse({ app: appName }));
		}
	}
};

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
		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/cards/remove?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.appToken) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard' })
			.end(function(err, res) {
				//TODO: get the card deleted
				utils.Events.fire('dashboard-card-deleted', { body: { app: request.appName } }, request.appToken, function(eventError, eventResponse){});
			});
	},
	deleteTile: function(request, response){
		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/tiles/remove?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.appToken) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard' })
			.end(function(err, res) {
				//TODO: get the tile deleted
				utils.Events.fire('dashboard-tile-deleted', { body: { app: request.appName } }, request.appToken, function(eventError, eventResponse){});
			});
	},
	deleteView: function(request, response){
		utils.Events.fire('dashboard-view-deleted', { body: { app: request.appName } }, request.appToken, function(eventError, eventResponse){});
	},
	postCard: function(request, response){
		/*
		*** schema of a card ***
		{
			"type": String, //(optional), values: 'text' (default), 'image'
			"app": String, //the name of the app that owns this card (request.appName)
			"background": String, //the background colour (for type=='text') or image (for type='image') of the card
			"caption": String, //the bold text of the card (ignored if type=='image')
			"message": String //(optional) the description of the caption of the card (ignored if type=='image')
		}
		*/

		var card = {
			app: request.appName,
			background: request.body.background,
			type: request.body.type
		};
		if (request.body.type !== 'image') {
			card.caption = request.body.caption;
			card.message = request.body.message;
		}

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/cards/replace?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.appToken) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard', values: card, upsert: true })
			.end(function(err, res) {
				utils.Events.fire('dashboard-card-posted', { body: card }, request.appToken, function(eventError, eventResponse){});
			});
	},
	postTile: function(request, response){
		/*
		*** schema of a tile ***
		{
			"type": String, //(optional), values: 'text' (default), 'image'
			"app": String, //the name of the app that owns this tile (request.appName)
			"background": String, //the background colour (for type=='text') or image (for type='image') of the tile
			"caption": String, //the bold text of the tile (ignored if type=='image')
			"message": String, //(optional) the description of the caption of the tile (ignored if type=='image')
			"more": String //(optional) a link to more info
		}
		*/

		var tile = {
			app: request.appName,
			background: request.body.background,
			more: request.body.more,
			type: request.body.type
		};
		if (request.body.type !== 'image') {
			tile.caption = request.body.caption;
			tile.message = request.body.message;
		}

		superagent
			.post(process.env.BOLT_ADDRESS + '/api/db/tiles/replace?app=' + request.appName)
			.set(X_BOLT_APP_TOKEN, request.appToken) //see **Impersonating Bolt** above to understand this line
			.send({ app: 'bolt-module-dashboard', values: tile, upsert: true })
			.end(function(err, res) {
				utils.Events.fire('dashboard-tile-posted', { body: tile }, request.appToken, function(eventError, eventResponse){});
			});
	},
	postView: function(request, response){
		/*
		*** schema of a view ***
		{
			"app": String, //the name of the app that owns this view (request.appName)
			"height": Number, //the preferred height of the view
			"width": Number, //the preferred width of the view
			"url": String //the URL from which the view's content is fetched
		}
		*/

		var view = {
			app: request.appName,
			height: request.body.height,
			width: request.body.width,
			url: request.body.url
		};

		//views are not persisted in the database, so we just fire them
		utils.Events.fire('dashboard-view-posted', { body: view }, request.appToken, function(eventError, eventResponse){});
	}
};

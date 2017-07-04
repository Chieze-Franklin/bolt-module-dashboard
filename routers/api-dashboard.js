var checksCtrlr = require("bolt-internal-checks");

var express = require('express');

var apiDashboardCtrlr = require('../controllers/api-dashboard');

var router = express.Router();

//delete card
router.delete('/card', checksCtrlr.getAppName, apiDashboardCtrlr.deleteCard);

//delete tile
router.delete('/tile', checksCtrlr.getAppName, apiDashboardCtrlr.deleteTile);

//delete view
router.delete('/view', checksCtrlr.getAppName, apiDashboardCtrlr.deleteView);

//post card
router.post('/card', checksCtrlr.getAppName, apiDashboardCtrlr.postCard);

//post tile
router.post('/tile', checksCtrlr.getAppName, apiDashboardCtrlr.postTile);

//post view
router.post('/view', checksCtrlr.getAppName, apiDashboardCtrlr.postView);

module.exports = router;
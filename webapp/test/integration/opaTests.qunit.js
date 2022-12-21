/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"crm/third_party_lgst/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});
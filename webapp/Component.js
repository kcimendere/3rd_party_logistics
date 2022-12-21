sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"crm/third_party_lgst/model/models",
	"crm/third_party_lgst/Util/MessageHandler"
], function (UIComponent, Device, models, MessageHandler) {
	"use strict";

	return UIComponent.extend("crm.third_party_lgst.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.getModel().setSizeLimit(9999);
			
			//initiate message handler
			this.MessageHandler = new MessageHandler(this);
		}
	});
});
sap.ui.define([
	"crm/third_party_lgst/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, Operator) {
	"use strict";

	return BaseController.extend("crm.third_party_lgst.controller.ObjectDisplay", {
		onInit: function () {
			this.getRouter().getRoute("objectDetail").attachPatternMatched(this._onRouteHit.bind(this));
			this.getView().setModel(new JSONModel(), "detail");
		},
		_onRouteHit: function (oEvent) {
			// get navigation parameters
			const oArgs = oEvent.getParameter("arguments");
			this._guid = oArgs.guid;

			this.getModel().metadataLoaded().then(() => {
				const sObjectPath = this.getModel().createKey("HeaderSet", {
					Guid: this._guid
				});
				this.getView().setBusy(true);
				this.getModel().read('/' + sObjectPath, {
					urlParameters: {
						"$expand": "ToItems,ToDates,ToCustomerh,Tostatus,ToDocFlow,ToPartners,ToTexts,ToChangeHistory,ToAttachments,ToAttachments01,ToAttachments02,ToAttachments03,ToAttachments04,ToPricing,ToCumulate,ToRefObj,ToAditionalFields,ToServiceItems,ToSpItems,ToTotalValues,ToCategory,ToProductInfo"
					},
					success: data => {
						$.proxy(this.dataReceived(data), this);
						this.getView().setBusy(false);
					},
					error: response => {
						this.getView().setBusy(false);
						$.proxy(this.requestFailed(response), this)
					}
				})
			});
		},
		dataReceived: function (data) {
			this._detailModel = this.getModel("detail");
			var aCategories = [];
			if (data.ToCategories && data.ToCategories.results && data.ToCategories.results.length > 0) {
				aCategories = data.ToCategories.results;
			}
			var idArr = [{
				"Id": "soeCB1",
				"Level": 1
			}, {
				"Id": "soeCB2",
				"Level": 2
			}, {
				"Id": "soeCB3",
				"Level": 3
			}, {
				"Id": "soeCB4",
				"Level": 4
			}, {
				"Id": "soeCB5",
				"Level": 5
			}];
			for (let sId of idArr) {
				let iIndex = -1;
				iIndex = data.ToCategory.results.findIndex(category => category.Level === idArr.Level);
				if (iIndex == -1) {
					data.ToCategory.results.push({
						"Level": idArr.Level
					})

				}
			}
			this.getModel("detail").setData(data);
			this.getModel("detail").refresh();
			this._setHeaderPartnerBindings("text", this._detailModel, "detail");
			this._setCategoryBindings("text", this._detailModel, "detail");
			this._generateHistoryContextMenu(data.ToChangeHistory.results);
			// this._setTexts("text", this._detailModel, "detail");
			// this._setCategoryBindings("text", this._detailModel, "detail");
			// this._setHeaderDates("text", this._detailModel, "detail");
		},
		handleCopyDoc(oEvent) {
			var that = this;
			this.sendRequest({
				"Guid": this._guid
			}).then(function (data) {
				if (data.Guid) {
					that.getRouter().navTo("objectEdit", {
						guid: data.Guid,
						"?query": {
							"copy": true
						}
					});
				}
			}, function (response) {

			});
		},
		sendRequest(requestPayload) {
			var that = this;
			var messageHandler = this.getOwnerComponent().MessageHandler;
			return new Promise(function (resolve, reject) {
				that.getView().setBusy(true);
				messageHandler.removeServiceMessages();
				that.getModel().create(
					'/HeaderSet',
					requestPayload, {
						success: data => {
							that.getView().setBusy(false);
							resolve(data);
						},
						error: response => {
							messageHandler.showServiceMessagePromise().then(function () {
								that.getView().setBusy(false);
								reject(response);
							});
						}
					});

			});
		},
		onEdit(oEvent) {
			this.getRouter().navTo("objectEdit", {
				guid: this._guid
			});
		},
		getGroup: function (oContext) {
			return oContext.getProperty('AttachTypeTxt');
		},
		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key
			})
		}
	});
});
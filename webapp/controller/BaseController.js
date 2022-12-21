sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/m/MessageStrip",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, JSONModel, History, MessageStrip, MessageBox, Filter, Operator) {
	"use strict";

	return Controller.extend("crm.third_party_lgst.controller.BaseController", {
		// get router object
		getRouter() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		// handle back navigation
		onNavBack(oEvent) {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				this.getRouter().navTo("search", {}, true /*no history*/ );
			}
		},
		getModel(sName) {
			return this.getView().getModel(sName);
		},
		setModel(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},
		faturaTarihFormatter(value) {
			if (!value) {
				return null;
			} else {
				return new Date(value);
			}
		},
		_setHeaderPartnerBindings(binding, model, modelId) {
			const aPartnerFct = ["Z0006", "00000001"];
			let iIndex = -1;
			let sId = "";
			let bId = "";

			for (let fct of aPartnerFct) {
				switch (fct) {
				case 'Z0006': //son müşteri
					sId = 'customer';
					break;
				case '00000001': //bayi
					sId = 'dealer';
					break;
				default:
					sId = "";
				}

				iIndex = model.getData().ToPartners.results.findIndex(partner => partner.PartnerFct === fct);
				if (iIndex !== -1 && sId === "customer") {
					if (this.getView().byId("customerSum")) {
						this.getView().byId("customerSum").bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/DescriptionName`,
							model: modelId
						});
					}
					
					if (this.getView().byId("idCustSeg")) {
						this.getView().byId("idCustSeg").bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/SegmentTxt`,
							model: modelId
						});
					}

					if (this.getView().byId("customerReview")) {
						this.getView().byId("customerReview").bindProperty("text", {
							path: `/ToPartners/results/${iIndex.toString()}/DescriptionName`,
							model: modelId
						});
					}

					if (this.getView().byId("customerTel")) {
						this.getView().byId("customerTel").bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/Telephone`,
							model: modelId
						});
					}
					if (this.getView().byId("customerTelReview")) {
						this.getView().byId("customerTelReview").bindProperty("text", {
							path: `/ToPartners/results/${iIndex.toString()}/Telephone`,
							model: modelId
						});
					}

					if (this.getView().byId("customerAddress")) {
						this.getView().byId("customerAddress").bindProperty("value", {
							path: `/ToPartners/results/${iIndex.toString()}/AddressShort`,
							model: modelId
						});
					}

					if (this.getView().byId("customerAddressRewiew")) {
						this.getView().byId("customerAddressRewiew").bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/AddressShort`,
							model: modelId
						});
					}

				}
				if (iIndex !== -1 && sId === "dealer") {
					if (this.getView().byId("dealerTel")) {
						this.getView().byId("dealerTel").bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/Telephone`,
							model: modelId
						});
					}
					if (this.getView().byId("dealerAddress")) {
						this.getView().byId("dealerAddress").bindProperty("value", {
							path: `/ToPartners/results/${iIndex.toString()}/AddressShort`,
							model: modelId
						});
					}

				}
				if (iIndex !== -1) {
					if (this.getView().byId(sId)) {
						this.getView().byId(sId).bindProperty(binding, {
							path: `/ToPartners/results/${iIndex.toString()}/DescriptionName`,
							model: modelId
						});
					}
				}
			}
		},
		xfeldToBool(val) {
			return val == "X"
		},
		acIndFormatter(val) {
			return val == "02";
		},
		currencyValue: function (sValue) {
			if (!sValue) {
				return 0.00;
			}

			return parseFloat(parseFloat(sValue).toFixed(2));
		},
		_setTexts(binding, model, modelId) {
			const aTypeArr = ["Z001", "Z007"];
			// const tdid = "Z001";
			let iIndex = -1;
			let sId = "";

			for (let tdid of aTypeArr) {
				switch (tdid) {
				case "Z007":
					sId = "custNote";
					break;
				case "Z700":
					sId = "errorNote";
					break;
				}

				iIndex = model.getData().ToTexts.results.findIndex(text => text.Tdid === tdid);
				if (iIndex !== -1 && this.getView().byId(sId)) {
					this.getView().byId(sId).bindProperty(binding, {
						path: `/ToTexts/results/${iIndex.toString()}/ConcLines`,
						model: modelId
					});
				}

			}
		},
		_setCategoryBindings(binding, model, modelId) {
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
				iIndex = model.getData().ToCategory.results.findIndex(category => category.Level === sId.Level);
				if (iIndex !== -1 && this.getView().byId(sId.Id)) {
					if (binding == "text") {
						this.getView().byId(sId.Id).bindProperty(binding, {
							path: `/ToCategory/results/${iIndex.toString()}/Value`,
							model: modelId
						});
					} else {
						this.getView().byId(sId.Id).bindProperty(binding, {
							path: `/ToCategory/results/${iIndex.toString()}/Key`,
							model: modelId
						});
					}
				}
			}
		},
		setInitialFilters(selectedCategories, editOrCreate) {
			var oView = this.getView();
			var aFilters = [];

			oView.byId("soeCB1").getBinding("items").filter(new Filter("Guid", Operator.EQ, this._guid));

			aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			if (selectedCategories.cat1) {
				aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.cat1));
			}
			oView.byId("soeCB2").getBinding("items").filter(aFilters);

			aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			if (selectedCategories.cat2) {
				aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.cat2));
			}
			oView.byId("soeCB3").getBinding("items").filter(aFilters);

			aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			if (selectedCategories.cat3) {
				aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.cat3));
			}
			oView.byId("soeCB4").getBinding("items").filter(aFilters);

			aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			if (selectedCategories.cat4) {
				aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.cat4));
			}
			oView.byId("soeCB5").getBinding("items").filter(aFilters);

			if (editOrCreate == "create") {
				return;
			}
			// oView.byId("qualCB1").getBinding("items").filter(new Filter("Guid", Operator.EQ, this._guid));

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.qual1) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.qual1));
			// }
			// oView.byId("qualCB2").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.qual2) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.qual2));
			// }
			// oView.byId("qualCB3").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.qual3) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.qual3));
			// }
			// oView.byId("qualCB4").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.qual4) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.qual4));
			// }
			// oView.byId("qualCB5").getBinding("items").filter(aFilters);

			// oView.byId("grntCB1").getBinding("items").filter(new Filter("Guid", Operator.EQ, this._guid));

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.grnt1) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.grnt1));
			// }
			// oView.byId("grntCB2").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.grnt2) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.grnt2));
			// }
			// oView.byId("grntCB3").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.grnt3) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.grnt3));
			// }
			// oView.byId("grntCB4").getBinding("items").filter(aFilters);

			// aFilters = [new Filter("Guid", Operator.EQ, this._guid)];
			// if (selectedCategories.grnt4) {
			// 	aFilters.push(new Filter("Key", Operator.EQ, selectedCategories.grnt4));
			// }
			// oView.byId("grntCB5").getBinding("items").filter(aFilters);
		},
		getScreenAuth(CreateOrUpdate, guid) {
			var messageHandler = this.getOwnerComponent().MessageHandler;
			var that = this;
			messageHandler.removeServiceMessages();
			this.getModel("userModel").read(
				'/GetFieldvisibilitySet', {
					filters: [new Filter("CreateOrUpdate", Operator.EQ, CreateOrUpdate), new Filter("ProcessType", Operator.EQ, "ZC09"), new Filter(
						"Guid",
						Operator.EQ, guid)],
					success: data => {
						var namedArray = [];
						data.results.forEach(element => {
							namedArray[element.FieldName] = element;
						});
						var visibleModel = new JSONModel(namedArray);
						that.getView().setModel(visibleModel, "visibleModel");
						that.setScreenAuth(data);
						// that.getView().setBusy(false);
						// messageHandler.showServiceMessagePromise().then(function () {});
					},
					error: response => {
						messageHandler.showServiceMessagePromise().then(function () {
							// that.getView().setBusy(false);
						});
					}
				});
		},
		setScreenAuth(data) {
			// var viewModel = this.getView().getModel("view");
			// var viewModelData = viewModel.getData();
			for (let item of data.results) {
				if (item.TabName == "itemsTab") {
					if (item.FieldName) {
						viewModelData[item.FieldName + "visible"] = item.Visibility;
						viewModelData[item.FieldName + "enable"] = item.Enable;
						// viewModel.setProperty(item.FieldName+"visible", item.Visibility);
						// viewModel.setProperty(item.FieldName+"enable", item.Enable);
						// viewModel.refresh();
					}

				} else if (item.FieldName) {
					if (this.getView().byId(item.FieldName)) {
						this.getView().byId(item.FieldName).setVisible(item.Visibility);

						var inputName = "";
						// if (item.FieldName == "customerAddrFE") {
						// 	inputName = "siparisVerenAdr";
						// } else
						if (item.FieldName == "customerNameFE") {
							inputName = "customer";
						} else {
							var inputName = item.FieldName.substring(0, item.FieldName.length - 2);
						}
						this.getView().byId(inputName).setEnabled(item.Enable);

					}
				} else if (item.TabName) {
					if (this.getView().byId(item.TabName)) {
						this.getView().byId(item.TabName).setVisible(item.Visibility);
						// this.getView().byId(item.TabName).setEnabled(item.Enable);
					}
				}

			}
			// var labRows = this.getView().byId("idServiceItemTable").getRows();

			// "spQuantityenable": true,
			// "acIndSPenable": true,
			// "idItemTypeenable": true,
			// "quantityLabenable": true,
			// "acIndLabenable": true
			// for (let row of rows) {
			// 	var cells = row.getCells();
			// 	for (let cell of cells) {
			// 		if (cell.getId().includes("spQuantity")) {
			// 			cell.setEnabled(viewModelData["spQuantityenable"]);
			// 		}
			// 		if (cell.getId().includes("acIndSP")) {
			// 			cell.setEnabled(viewModelData["acIndSPenable"]);
			// 		}
			// 		if (cell.getId().includes("idItemType")) {
			// 			cell.setEnabled(viewModelData["idItemTypeenable"]);
			// 		}
			// 	}
			// }
			// for (let row of labRows) {
			// 	var cells = row.getCells();
			// 	for (let cell of cells) {
			// 		if (cell.getId().includes("quantityLab")) {
			// 			cell.setEnabled(viewModelData["quantityLabenable"]);
			// 		}
			// 		if (cell.getId().includes("acIndLab")) {
			// 			cell.setEnabled(viewModelData["acIndLabenable"]);
			// 		}
			// 	}
			// }
			// "spQuantityvisible": true,
			// "acIndSPvisible": true,
			// "idItemTypevisible": true,
			// "quantityLabvisible": true,
			// "acIndLabvisible": true,
			// this.getView().byId("spQuantityCol").setVisible(viewModelData.spQuantityvisible);
			// this.getView().byId("acIndSPCol").setVisible(viewModelData.acIndSPvisible);
			// this.getView().byId("idItemTypeCol").setVisible(viewModelData.idItemTypevisible);
			// this.getView().byId("quantityLabCol").setVisible(viewModelData.quantityLabvisible);
			// this.getView().byId("acIndLabCol").setVisible(viewModelData.acIndLabvisible);
			// viewModel.setData(viewModelData);
			// viewModel.refresh();

		},
		clearSession(guid, source, edit) {
			var that = this;
			var messageHandler = this.getOwnerComponent().MessageHandler;
			var oModel = this.getView().getModel();
			var sPath = oModel.createKey("/LockSet", {
				Guid: guid,
				Edit: edit
			});
			return new Promise(function (resolve, reject) {
				that.getView().setBusy(true);
				messageHandler.removeServiceMessages();
				oModel.remove(sPath, {
					success: function () {
						// messageHandler.showServiceMessagePromise().then(function () {
						resolve();
						// });
					},
					error: function () {
						if (source == "cancel") {
							reject();
						} else {
							messageHandler.showServiceMessagePromise().then(function () {
								reject();
							});
						}
						// reject()
					}
				});

			});

		},
		_generateHistoryContextMenu(array) {
			var contextMenu = this.getView().byId("historyContextMenu");
			var historyTable = this.getView().byId("idHistoryTable");
			let unique = [...new Set(array.map(item => item.Indtext))];

			//historyTable.filter(historyTable.getColumns()[0], "Kullanıcı");

			for (var text of unique) {
				contextMenu.addItem(new sap.ui.unified.MenuItem({
					text: text,
					select: function (oEvent) {
						var selected = oEvent.getSource().getText();
						historyTable.filter(historyTable.getColumns()[0], selected);
					}
				}));
			}
		},
		handleHistoryClearFilter(oEvent) {
			var historyTable = this.getView().byId("idHistoryTable");

			historyTable.filter(historyTable.getColumns()[0], "");
		},
		onHistoryOperationSort: function (oEvent, sortOrder) {
			var historyTable = this.getView().byId("idHistoryTable");
			var aSortOrder;
			(sortOrder === "asc") ? aSortOrder = sap.ui.table.SortOrder.Ascending: aSortOrder = sap.ui.table.SortOrder.Descending;

			historyTable.sort(historyTable.getColumns()[0], aSortOrder);
		}
	});
});
sap.ui.define([
	"crm/third_party_lgst/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"crm/third_party_lgst/Util/flitbit"
], function (BaseController, JSONModel, Filter, Operator, Flitbit) {
	"use strict";

	return BaseController.extend("crm.third_party_lgst.controller.ObjectEdit", {
		onInit: function () {
			this.getRouter().getRoute("objectEdit").attachPatternMatched(this._onRouteHit.bind(this));
			this.getView().setModel(new JSONModel(), "edit");
			var viewModel = new JSONModel({
				"spQuantityvisible": true,
				"acIndSPvisible": true,
				"spQuantityenable": true,
				"acIndSPenable": true,
			});
			viewModel.setDefaultBindingMode("OneWay");
			this.getView().setModel(viewModel, "view");
		},
		_onRouteHit: function (oEvent) {
			var that = this;
			// get navigation parameters
			const oArgs = oEvent.getParameter("arguments");
			const oQuery = oArgs["?query"];
			var fromCopy = false;
			this._guid = oArgs.guid;

			if (oQuery && oQuery.copy) {
				fromCopy = oQuery.copy;
			}

			// save header guid to a local variable
			this._guid = oArgs.guid;
			if (oArgs.guid && !fromCopy) {

				this.clearSession(oArgs.guid, "edit", "X").then(function (data) {
					that._getData();
				}, function (response) {
					that.getRouter().navTo("objectDetail", {
						guid: that._guid
					});
				});
			} else {
				this._getData();
			}

		},
		_getData() {
			this.getModel().metadataLoaded().then(() => {
				const sObjectPath = this.getModel().createKey("HeaderSet", {
					Guid: this._guid
				});
				this.getView().setBusy(true);
				this.getModel().read('/' + sObjectPath, {
					urlParameters: {
						"$expand": "ToItems,ToDates,ToCustomerh,Tostatus,ToDocFlow,ToPartners,ToTexts,ToChangeHistory,ToAttachments,ToAttachments01,ToAttachments02,ToAttachments03,ToAttachments04,ToPricing,ToCumulate,ToRefObj,ToAditionalFields,ToServiceItems,ToSpItems,ToTotalValues,ToCategory,ToProductInfo,ToHeaderStatusReason,ToSearchHelpOrderStatus"
					},
					success: data => {
						$.proxy(this.dataReceived(data), this);
						this.getScreenAuth("U", this._guid);
						this.getView().setBusy(false);
					},
					error: response => {
						this.getView().setBusy(false);
						$.proxy(this.requestFailed(response), this)
					}
				})
			});
		},
		requestFailed: function (response) {},
		onAfterRendering() {
			this.filterSearchHelpBindings();
			this.setAttchUploadURLs();
			this.clearUploadFields();
		},
		filterSearchHelpBindings() {
			this.getView().byId("statusCombo").getBinding("items").filter([new Filter("Guid", Operator.EQ, this._guid)]);
		},
		setAttchUploadURLs() {
			var oModel = this.getView().getModel();
			var sPath = oModel.createKey("/HeaderSet", {
				"Guid": this._guid
			});
			sPath = "/sap/opu/odata/sap/ZCM_SERVICEORDER_SRV" + sPath + "/ToAttachments";
			this.getView().byId("fileUploader").setUploadUrl(sPath);
			// this.getView().byId("fileUploader1").setUploadUrl(sPath);
			// this.getView().byId("fileUploader2").setUploadUrl(sPath);
			// this.getView().byId("fileUploader3").setUploadUrl(sPath);
			// this.getView().byId("UploadSet").addHeaderParameter(new sap.m.UploadCollectionParameter({
			// 	name: "x-csrf-token",
			// 	value: sToken
			// }));
		},
		clearUploadFields() {
			this.getView().byId("fileUploader").setValue();
			// this.getView().byId("fileUploader1").setValue();
			// this.getView().byId("fileUploader2").setValue();
			// this.getView().byId("fileUploader3").setValue();
		},
		handleUploadStart(oEvent) {
			oEvent.getSource().setBusy(true);
		},
		handleImageUploadComplete(oEvent) {
			// error handling
			if (oEvent.getParameters().status !== 201) {
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(oEvent.getParameter("responseRaw"), "text/xml");
				sap.m.MessageToast.show(xmlDoc.getElementsByTagName('error')[0].getElementsByTagName('message')[0].textContent);
				// this.displayMessage({
				// 	type: 'E',
				// 	message: xmlDoc.getElementsByTagName('error')[0].getElementsByTagName('message')[0].textContent
				// });
				return;
			} else {
				this.clearUploadFields();
				this._getData();
				sap.m.MessageToast.show("Yüklendi.");
			}

			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(oEvent.getParameter("responseRaw"), "text/xml");
			var urlToDisplay = xmlDoc.getElementsByTagName('m:properties')[0].getElementsByTagName("d:UrlToDisplay")[0].textContent;
			oEvent.getSource().setBusy(false);

		},
		handleUploadAttachment(fileUploader, attachCode) {
			var oFileUploader = this.getView().byId("fileUploader");
			var code = this.getView().byId("idUploadSelect").getSelectedKey(); 
			if(!code) {
				sap.m.MessageToast.show("Ek türü seçmelisiniz!");
				return;
			}
			var oModel = this.getView().getModel();
			oFileUploader.removeAllHeaderParameters();
			oModel.refreshSecurityToken();
			const oHeaders = oModel.oHeaders;
			const sToken = oHeaders['x-csrf-token'];
			var slug = code + "/" + encodeURIComponent(oFileUploader.getValue());
			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "x-csrf-token",
				value: sToken
			}));
			oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "SLUG",
				value: slug
			}));
			oFileUploader.setSendXHR(true);
			oFileUploader.upload();
		},
		handleUpload01Attachment() {
			this.handleUploadAttachment(this.getView().byId("fileUploader"), "01");
		},
		handleUpload02Attachment() {
			this.handleUploadAttachment(this.getView().byId("fileUploader1"), "02");
		},
		handleUpload03Attachment() {
			this.handleUploadAttachment(this.getView().byId("fileUploader2"), "03");
		},
		handleUpload04Attachment() {
			this.handleUploadAttachment(this.getView().byId("fileUploader3"), "04");

		},
		dataReceived(data) {
			this._editModel = this.getModel("edit");
			var selectedCategories = {
				"cat1": "",
				"cat2": "",
				"cat3": "",
				"cat4": "",
				"cat5": "",

				// "qual1": "",
				// "qual2": "",
				// "qual3": "",
				// "qual4": "",
				// "qual5": "",

				// "grnt1": "",
				// "grnt2": "",
				// "grnt3": "",
				// "grnt4": "",
				// "grnt5": "",

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
				iIndex = data.ToCategory.results.findIndex(category => category.Level === sId.Level);
				if (iIndex == -1) {
					data.ToCategory.results.push({
						"Level": idArr.Level
					})
				} else {
					selectedCategories["cat" + sId.Level] = data.ToCategory.results[iIndex].Key;
				}
			}

			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat1KaliteSrh) {
			// 	selectedCategories.qual1 = data.ToCustomerh.Zz1Kat1KaliteSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat2KaliteSrh) {
			// 	selectedCategories.qual2 = data.ToCustomerh.Zz1Kat2KaliteSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat3KaliteSrh) {
			// 	selectedCategories.qual3 = data.ToCustomerh.Zz1Kat3KaliteSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat4KaliteSrh) {
			// 	selectedCategories.qual4 = data.ToCustomerh.Zz1Kat4KaliteSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat5KaliteSrh) {
			// 	selectedCategories.qual5 = data.ToCustomerh.Zz1Kat5KaliteSrh;
			// }

			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat1GarantiSrh) {
			// 	selectedCategories.grnt1 = data.ToCustomerh.Zz1Kat1GarantiSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat2GarantiSrh) {
			// 	selectedCategories.grnt2 = data.ToCustomerh.Zz1Kat2GarantiSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat3GarantiSrh) {
			// 	selectedCategories.grnt3 = data.ToCustomerh.Zz1Kat3GarantiSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat4GarantiSrh) {
			// 	selectedCategories.grnt4 = data.ToCustomerh.Zz1Kat4GarantiSrh;
			// }
			// if (data.ToCustomerh && data.ToCustomerh.Zz1Kat5GarantiSrh) {
			// 	selectedCategories.grnt5 = data.ToCustomerh.Zz1Kat5GarantiSrh;
			// }
			// selectedCategories.qual1 = data.ToCustomerh.Zz1Kat1KaliteSrh;
			// selectedCategories.qual2 = data.ToCustomerh.Zz1Kat2KaliteSrh;
			// selectedCategories.qual3 = data.ToCustomerh.Zz1Kat3KaliteSrh;
			// selectedCategories.qual4 = data.ToCustomerh.Zz1Kat4KaliteSrh;
			// selectedCategories.qual5 = data.ToCustomerh.Zz1Kat5KaliteSrh;

			// selectedCategories.grnt1 = data.ToCustomerh.Zz1Kat1GarantiSrh; 
			// selectedCategories.grnt2 = data.ToCustomerh.Zz1Kat2GarantiSrh;
			// selectedCategories.grnt3 = data.ToCustomerh.Zz1Kat3GarantiSrh;
			// selectedCategories.grnt4 = data.ToCustomerh.Zz1Kat4GarantiSrh;
			// selectedCategories.grnt5 = data.ToCustomerh.Zz1Kat5GarantiSrh;

			this.getModel("edit").setData(data);
			this.getModel("edit").refresh();
			this._setHeaderPartnerBindings("value", this._editModel, "edit");
			this._setCategoryBindings("selectedKey", this._editModel, "edit");
			this.setInitialFilters(selectedCategories, "edit");
			this._cloneDetailData = jQuery.extend(true, {}, data);
			this._generateHistoryContextMenu(data.ToChangeHistory.results);
			// this._setTexts("text", this._editModel, "edit");
			// this._setCategoryBindings("text", this._editModel, "edit");
			// this._setHeaderDates("text", this._editModel, "edit");

		},
		handleInvoiceChange(oEvent) {
			this.getView().getModel("edit").setProperty("/ToCustomerh/Zz1FaturaTarihSrh", oEvent.getSource().getDateValue());
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		onPostNote(oEvent) {
			const oItem = {
				Tdid: this.getView().byId("idTextId").getSelectedKey(),
				// Tdtext: this.getView().byId("idNoteID").getValue(),
				ConcLines: oEvent.getParameter("value")
			};
			this.getModel("edit").getData().ToTexts.results.push(oItem);
			this.getModel("edit").refresh();
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		onRemoveNote(oEvent) {
			const index = oEvent.getParameter("listItem").getBindingContext("edit").getPath().split("/").pop();
			this._oView.getModel("edit").getData().ToTexts.splice(index, 1);
			this._oView.getModel("edit").refresh();
		},
		handleProductHelp() {
			if (this._oProductDialog) {
				this.getView().removeDependent(this._oProductDialog);
				this._oProductDialog.destroy();
			}

			this._oProductDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.productSearch", this);
			this.getView().addDependent(this._oProductDialog);
			this._oProductDialog.setModel(this.getOwnerComponent().getModel("productModel"), "productModel");

			this._oProductDialog.getContent()[1].setMode("None");
			this._oProductDialog.getBeginButton().setVisible(false);

			// this._oProductDialog.getContent()[1].getBinding("items").filter([new Filter("BuGroup", Operator.EQ, "CKIA")]);

			// this._oProductDialog.getCustomHeader().getContentRight()[0].setVisible(false);

			this._oProductDialog.open();
			this.handleProductSearch();
		},
		handleProductSearch() {
			let sQuery = "",
				aFilters = [];

			sQuery = this.getView().byId("idSearchProdFbControl1").getValue(); //oItems[0].getControl().getValue();
			if (sQuery) aFilters.push(new Filter("ProductId", Operator.Contains, sQuery));

			sQuery = this.getView().byId("idSearchProdFbControl2").getValue(); //oItems[1].getControl().getValue();
			if (sQuery) aFilters.push(new Filter("Description", Operator.Contains, sQuery));

			// sQuery = this.getView().byId("idSearchProdFbControl3").getValue(); //oItems[2].getControl().getValue();
			// if (sQuery) aFilters.push(new Filter("MaterialType", Operator.EQ, sQuery));

			if (this.getView().byId("idSearchProdFbControl3").getSelectedItems().length) {
				for (let item of this.getView().byId("idSearchProdFbControl3").getSelectedItems())
					aFilters.push(new Filter("MaterialType", Operator.EQ, item.getKey()));
			}
			sQuery = this.getView().byId("idSearchProdFbControl4").getValue();
			if (sQuery) aFilters.push(new Filter("Bismt", Operator.EQ, sQuery));

			// sQuery = this.getView().byId("idSearchProdFbControl5").getValue();
			// if (sQuery) aFilters.push(new Filter("ProductType", Operator.EQ, sQuery));

			sQuery = this.getView().byId("prodMaxRows").getValue();
			aFilters.push(new Filter("MaxRows", Operator.EQ, sQuery));

			this._oProductDialog.getContent()[1].getBinding("items").filter(aFilters);
		},
		handleProductSelect: function () {
			var aItem = this._oProductDialog.getContent()[1].getSelectedItems();
			for (var i = 0; i < aItem.length; i++) {
				var thisRow = aItem[i].getBindingContext("customerModel").getObject();
				this.byId("productInp").addToken(new sap.m.Token({
					key: thisRow.ProductId,
					text: thisRow.Zz1MalzemeTanimPrd
				}));
			}
			this._oProductDialog.close();
			this._oProductDialog.destroy();
		},
		handleProductListItemPress: function (oEvent) {
			var that = this;
			var selectedProduct = oEvent.getSource().getBindingContext("productModel").getObject();
			var editModel = this.getView().getModel("edit");
			this.getView().getModel("edit").setProperty("/ToRefObj/TextObject", selectedProduct.ShortText);
			this.getView().getModel("edit").setProperty("/ToRefObj/ProductId", selectedProduct.ProductId);
			this.getView().getModel("edit").refresh();
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});
			this._oProductDialog.close();
			this._oProductDialog.destroy();
		},
		handleProductCancel: function () {
			this._oProductDialog.close();
			this._oProductDialog.destroy();
		},
		generatePayload() {
			var model = this.getView().getModel("edit");
			var requestPayload = {};
			var diffs = DeepDiff.diff(this._cloneDetailData, this.getView().getModel("edit").getData());
			requestPayload = {
				"Guid": this._guid,
				"ToRefObj": {
					"ProductId": model.getProperty("/ToRefObj/ProductId"),
					"TextObject": model.getProperty("/ToRefObj/TextObject")
				},
				"ToCustomerh": model.getProperty("/ToCustomerh"),
				"Tostatus": model.getProperty("/Tostatus"),
				"ToPartners": model.getProperty("/ToPartners/results"),
				"ToItems": model.getProperty("/ToItems/results"),
				"ToServiceItems": model.getProperty("/ToServiceItems/results"),
				"ToSpItems": model.getProperty("/ToSpItems/results"),
				"ToTexts": model.getProperty("/ToTexts/results"),
				"ToDates": model.getProperty("/ToDates/results"),
				"ToCategory": model.getProperty("/ToCategory/results"),
				"ToPricing": model.getProperty("/ToPricing"),
				"ToDocFlow": model.getProperty("/ToDocFlow/results"),
				"ToChangeHistory": model.getProperty("/ToChangeHistory/results"),
				"ToAttachments01": model.getProperty("/ToAttachments01/results"),
				"ToAttachments02": model.getProperty("/ToAttachments02/results"),
				"ToAttachments03": model.getProperty("/ToAttachments03/results"),
				"ToAttachments04": model.getProperty("/ToAttachments04/results"),
				"ToCumulate": model.getProperty("/ToCumulate"),
				"ToTotalValues": model.getProperty("/ToTotalValues"),
				"ToProductInfo": model.getProperty("/ToProductInfo"),
				"ToHeaderStatusReason": model.getProperty("/ToHeaderStatusReason/results"),
				"ToSearchHelpOrderStatus": model.getProperty("/ToSearchHelpOrderStatus/results"),
				"Todiff": []
			};
			if (diffs && diffs.length > 0) {
				const splitAt = (index, xs) => [xs.slice(0, index), xs.slice(index)]
				for (let diff of diffs) {
					if (diff.path[0] == "ToSpItems" || diff.path[0] == "ToServiceItems") {
						var objectPath = diff.path.join("/");
						var lastIndex = objectPath.lastIndexOf("/");
						var pathArr = splitAt(lastIndex, objectPath);
						objectPath = "/" + pathArr[0];
						var rowData = model.getProperty(objectPath);
						var index = model.getData().ToItems.results.findIndex(item => item.Guid === rowData.Guid);
						if (index != -1) {
							model.setProperty("/ToItems/results/" + index + pathArr[1], diff.rhs);
							requestPayload.Todiff.push({
								Kind: diff.kind,
								Path: "/ToItems/" + rowData.Guid + pathArr[1]
							});
						}
						console.log(diff.path[0]);
					} else {
						var newPaths = diff.path.filter(function (el) {
							return el != "results"
						});
						requestPayload.Todiff.push({
							Kind: diff.kind,
							Path: "/" + newPaths.join('/')
						});
					}

				}
			}
			return requestPayload;

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
							if (requestPayload.Save != "X") {
								that.dataReceived(data);
							}
							if (data.Hata == "X") {
								messageHandler.showServiceMessagePromise().then(function () {
									resolve(data);
								});
							} else {
								resolve(data);
							}
							// messageHandler.showServiceMessagePromise().then(function () {});
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
		handleSalePointSH() {
			if (this._salePointDialog) {
				this.getView().removeDependent(this._salePointDialog);
				this._salePointDialog.destroy();
			}
			this._salePointDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.salePointSH", this);
			this.getView().addDependent(this._salePointDialog);
			this._salePointDialog.open();
		},
		handleSalePointCancel() {
			this._salePointDialog.close();
			this._salePointDialog.destroy();
		},
		handleSalePointListItemPress(oEvent) {
			var selectedSalePoint = oEvent.getSource().getBindingContext("valueHelp").getObject();
			var editModel = this.getView().getModel("edit");
			this.getView().getModel("edit").setProperty("/ToCustomerh/Zz1SatisNoktasiSrh", selectedSalePoint.Werks);
			this.getView().getModel("edit").setProperty("/ToCustomerh/Zz1SatisNoktasiSrhTxt", selectedSalePoint.Name1);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
			this.handleSalePointCancel();
		},
		returnToSupplierChange(oEvent) {
			var result = oEvent.getParameter("state") ? "X" : "";
			this.getView().getModel("edit").setProperty("/ToCustomerh/Zz1TicariurunIadeSrh", result);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleYedekParEkle() {
			if (this._sparePartDialog) {
				this.getView().removeDependent(this._sparePartDialog);
				this._sparePartDialog.destroy();
			}
			this._sparePartDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.productSuggestion", this);
			this.getView().addDependent(this._sparePartDialog);
			var sProductId = this.getView().getModel("edit").getProperty("/ToRefObj/ProductId");
			var aFilters = [];
			aFilters.push(new Filter("ProductId", Operator.EQ, sProductId));
			this._sparePartDialog.getContent()[0].getBinding("items").filter(aFilters);
			this._sparePartDialog.open();
		},
		handleSparePartListItemPress(oEvent) {
			oEvent.getSource().setSelected(!oEvent.getSource().getSelected());
		},
		handleSparePartCancel() {
			this._sparePartDialog.close();
		},
		handleSparePartSelect() {
			var that = this;
			var selectedItems = this._sparePartDialog.getContent()[0].getSelectedItems();
			// var requestPayload = {
			// 	"Guid": that._guid,
			// 	"ToItems": [],
			// 	"Todiff": [],
			// };
			var requestPayload = this.generatePayload();
			for (let [index, item] of selectedItems.entries()) {
				var newItem = {
					"OrderedProd": item.getBindingContext("productModel").getObject().ObjectId,
					// "Quantity": item.getBindingContext("productModel").getObject().Quantity.trim()
					"Quantity": "1"
				};
				requestPayload.ToItems.push(newItem);
				// requestPayload.Todiff.push({
				// 	"Kind": "C",
				// 	"Path": `/ToItems/${index.toString()}/OrderedProd`
				// });
				// requestPayload.Todiff.push({
				// 	"Kind": "C",
				// 	"Path": `/ToItems/${index.toString()}/Quantity`
				// });

			}
			this.sendRequest(requestPayload).then(function (data) {
				// that.handleCustomerStepValidation();
				that.dataReceived(data);
			}, function (response) {
				// that.handleCustomerStepValidation();

			});
			this._sparePartDialog.close();
		},
		handleCustomerCancel(oEvents){
			this._oCustomerDialog.close();
			this._oCustomerDialog.destroy();
		},
		handleSOECB1Select(oEvent) {
			var oView = this.getView();
			this.getView().getModel("edit").setProperty("/ToCategory/results/0/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("edit").setProperty("/ToCategory/results/0/Level", parseInt("01"));
			var catArr = this.getView().getModel("edit").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 1
			});
			this.getView().getModel("edit").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB2").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleSOECB2Select(oEvent) {
			var oView = this.getView();
			this.getView().getModel("edit").setProperty("/ToCategory/results/1/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("edit").setProperty("/ToCategory/results/1/Level", parseInt("02"));
			var catArr = this.getView().getModel("edit").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 2
			});
			this.getView().getModel("edit").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB3").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleSOECB3Select(oEvent) {
			var oView = this.getView();
			this.getView().getModel("edit").setProperty("/ToCategory/results/2/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("edit").setProperty("/ToCategory/results/2/Level", parseInt("03"));
			var catArr = this.getView().getModel("edit").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 3
			});
			this.getView().getModel("edit").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB4").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleSOECB4Select(oEvent) {
			var oView = this.getView();
			this.getView().getModel("edit").setProperty("/ToCategory/results/3/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("edit").setProperty("/ToCategory/results/3/Level", parseInt("04"));
			var catArr = this.getView().getModel("edit").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 4
			});
			this.getView().getModel("edit").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB5").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleSOECB5Select(oEvent) {
			var requestPayload = this.generatePayload();
			this.getView().getModel("edit").setProperty("/ToCategory/results/4/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("edit").setProperty("/ToCategory/results/4/Level", parseInt("05"));
			var catArr = this.getView().getModel("edit").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 5
			});
			this.getView().getModel("edit").setProperty("/ToCategory/results", catArr);
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
			// oView.byId("soeCB2").getBinding("items")
		},
		handleQualCB1Select(oEvent) {
			var oView = this.getView();
			oView.byId("qualCB2").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleQualCB2Select(oEvent) {
			var oView = this.getView();
			oView.byId("qualCB3").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleQualCB3Select(oEvent) {
			var oView = this.getView();
			oView.byId("qualCB4").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleQualCB4Select(oEvent) {
			var oView = this.getView();
			oView.byId("qualCB5").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleQualCB5Select(oEvent) {
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
			// var oView = this.getView();
			// oView.byId("soeCB5").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
			// 	"Guid", Operator.EQ, this._guid)]);
		},
		handleGrntCB1Select(oEvent) {
			var oView = this.getView();
			oView.byId("grntCB2").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleGrntCB2Select(oEvent) {
			var oView = this.getView();
			oView.byId("grntCB3").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleGrntCB3Select(oEvent) {
			var oView = this.getView();
			oView.byId("grntCB4").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleGrntCB4Select(oEvent) {
			var oView = this.getView();
			oView.byId("grntCB5").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleGrntCB5Select(oEvent) {
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		onSave(oEvent) {
			var that = this;
			var requestPayload = this.generatePayload();
			requestPayload.Save = "X";
			var messageHandler = this.getOwnerComponent().MessageHandler;
			messageHandler.showPopupToConfirm("Kaydetmek istediğinizden emin misiniz?",
				"Kaydet", "SUCCESS").then(function () {
				that.sendRequest(requestPayload).then(function (data) {
					if (data.ObjectId) {
						that.getRouter().navTo("objectDetail", {
							guid: data.Guid
						});
						return;
					}
				}, function (response) {});
			}, function () {

			});
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		onCancelEdit(oEvent) {
			var that = this;
			var messageHandler = this.getOwnerComponent().MessageHandler;
			var model = this.getView().getModel("edit");
			var data = jQuery.extend(true, {}, this._cloneDetailData);
			messageHandler.showPopupToConfirm("Yaptığınız değişiklikler kaybolacak, emin misiniz ?",
				"İptal", "SUCCESS").then(function () {
				that.clearSession(that._guid, "cancel", " ").then(function (data) {
					model.setData(data);
					model.refresh();
					that.getRouter().navTo("objectDetail", {
						guid: that._guid
					});
				}, function (response) {});
			}, function () {});
		},
		acIndicatorChange(oEvent) {
			var state = oEvent.getParameter("state") ? "02" : "03";
			var oModel = this.getView().getModel("edit");
			oModel.setProperty("/ToPricing/AcIndicator", state);

			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		ItemAcIndicatorChange(oEvent) {
			var that = this;
			var oModel = this.getView().getModel("edit");
			var state = oEvent.getParameter("state") ? "02" : "03";
			var path = oEvent.getSource().getBindingContext("edit").getPath() + "/AcIndicator";
			oModel.setProperty(path, state);
			this.handleItemChange();
		},
		handleItemChange() {
			var that = this;
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});
		},
		handleItemDelete(oEvent) {
			var itemPath = oEvent.getSource().getBindingContext("edit").getPath();
			var oModel = this.getView().getModel("edit");
			oModel.setProperty(itemPath + "/Delete", "X");
			this.handleItemChange();
		},
		handleStatusChange(oEvent) {
			var requestPayload = this.generatePayload();
			var that = this;
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		handleStatusReasonChange(oEvent) {
			// var selectedReasonKey = this.getView().byId("statusReason").getBindingContext("edit").getObject().Key;
			var selectedReasonKey = oEvent.getSource().getSelectedKey();
			var oModel = this.getView().getModel("edit");
			oModel.setProperty("/StatusReason", selectedReasonKey);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {}, function (response) {});
		},
		getGroup: function (oContext) {
			return oContext.getProperty('AttachTypeTxt');
		},
		getGroupHeader: function (oGroup) {
			debugger;
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key
			})
		},
		handleChangeUploadSelect: function(oEvent) {
			var visibleData = this.getView().getModel("visibleModel").getData();
			var selectedItem = oEvent.getParameter("selectedItem").getBindingContext("valueHelp").getObject();
			
			var iIndex = visibleData.findIndex(data => data === "uploadAttach" + selectedItem.Key);
			if(visibleData["uploadAttach" + selectedItem.Key]) {
				if(!visibleData["uploadAttach" + selectedItem.Key].Enable) {
					sap.m.MessageToast.show("Bu ek türünü yükleme yetkiniz yok!");
					oEvent.getSource().setSelectedKey("");
				} 
			}
		},
		onUploadCompleted: function (oEvent) {
			oEvent.getSource().setValue("");

			this._getData();

			//this._refreshAttachments(oEvent.getSource());
		},
		handleAttachmentItemPress(oEvent) {
			var that = this;
			var objectToRemove = oEvent.getParameter("listItem").getBindingContext("edit").getObject();
			var oModel = this.getOwnerComponent().getModel();
			var sPath = oModel.createKey("/AttachmentsSet", {
				"HeaderGuid": objectToRemove.HeaderGuid,
				"PhioClass": objectToRemove.PhioClass,
				"PhioObjid": objectToRemove.PhioObjid
			});
			this.getView().setBusy(true);
			oModel.remove(sPath, {
				success: function () {
					that._getData();
					that.getView().setBusy(false);
				},
				error: function () {}
			});

		}
	});
});
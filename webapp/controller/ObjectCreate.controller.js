sap.ui.define([
	"crm/third_party_lgst/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"crm/third_party_lgst/model/models",
	"crm/third_party_lgst/Util/flitbit"
], function (BaseController, JSONModel, Filter, Operator, models, Flitbit) {
	"use strict";

	return BaseController.extend("crm.third_party_lgst.controller.ObjectCreate", {
		onInit: function () {
			this.getRouter().getRoute("createObject").attachPatternMatched(this._onRouteHit.bind(this));
			this.getView().setModel(new JSONModel(models.createModelData()), "create");
			this._oView = this.getView();
			this._cloneDetailData = {};
			this._wizard = this._oView.byId("wizard");
			this._oNavContainer = this._oView.byId("wizardNavContainer");
			this._oWizardContentPage = this._oView.byId("wizardContentPage");
			this._oWizardReviewPage = sap.ui.xmlfragment(this._oView.getId(), "crm.third_party_lgst.fragments.reviewPage", this);
			this._oView.addDependent(this._oWizardReviewPage);
			this._oNavContainer.addPage(this._oWizardReviewPage);
		},
		refreshWizard() {
			var oCustomerStep = this._oView.byId("customerSelectionStep");
			var oGeneralStep = this._oView.byId("generalInfoStep");
			this._wizard.invalidateStep(oCustomerStep);
			this._wizard.invalidateStep(oGeneralStep);
			this._wizard.discardProgress(oCustomerStep);
		},
		_onRouteHit: function (oEvent) {
			this._guid = "00000000-0000-0000-0000-000000000000";
			this._partnerNo = "";
			this.getModel("create").setData(models.createModelData());
			this._oNavContainer.to(this._oWizardContentPage);
			this.getView().byId("fileUploader").setValue();
			// this.getView().byId("fileUploaderMus").setValue();
			this.getView().byId("custReq").setValue();
			this.refreshWizard();
			this._invoiceImageUploaded = false;
			this._productImageUploaded = false;
			this.setOrderFieldsEnablement(true, false);

		},
		handleCustomerHelp: function (oEvent) {
			if (this._oCustomerDialog) {
				this.getView().removeDependent(this._oCustomerDialog);
				this._oCustomerDialog.destroy();
			}

			this._oCustomerDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.customerSearch", this);
			this.getView().addDependent(this._oCustomerDialog);
			this._oCustomerDialog.setModel(this.getOwnerComponent().getModel("partnerModel"), "customerModel");
			this._oCustomerDialog.getCustomHeader().getContentRight()[0].setVisible(false);
			this._oCustomerDialog.getContent()[1].setMode("None");
			this._oCustomerDialog.getBeginButton().setVisible(false);

			this._oCustomerDialog.open();
			this.handleCustomerSearch();
		},
		handleCustomerSearch() {
			let sQuery = "",
				aFilters = [];

			sQuery = this.getView().byId("idSearchCustFbControl1").getValue(); //oItems[0].getControl().getValue();
			if (sQuery) aFilters.push(new Filter("McName1", Operator.Contains, sQuery));

			sQuery = this.getView().byId("idSearchCustFbControl2").getValue(); //oItems[1].getControl().getValue();
			if (sQuery) aFilters.push(new Filter("McName2", Operator.Contains, sQuery));

			sQuery = this.getView().byId("idSearchCustFbControl3").getValue(); //oItems[2].getControl().getValue();
			if (sQuery) aFilters.push(new Filter("Partner", Operator.EQ, sQuery));

			sQuery = this.getView().byId("idSearchCustFbControl4").getValue();
			if (sQuery) aFilters.push(new Filter("Telephonemob", Operator.EQ, sQuery));

			sQuery = this.getView().byId("custMaxRows").getValue();
			aFilters.push(new Filter("MaxRows", Operator.EQ, sQuery));

			this._oCustomerDialog.getContent()[1].getBinding("items").filter(aFilters);
		},
		/** Handle customer selection dialog actions */
		handleCustomerSelect: function () {
			var aItem = this._oCustomerDialog.getContent()[1].getSelectedItems();
			for (var i = 0; i < aItem.length; i++) {
				var thisRow = aItem[i].getBindingContext("customerModel").getObject();
				this.byId("idInputCustomer").addToken(new sap.m.Token({
					key: thisRow.Partner,
					text: thisRow.McName1
				}));
			}
			this._oCustomerDialog.close();
			this._oCustomerDialog.destroy();
		},
		handleCustomerCancel(oEvents){
			this._oCustomerDialog.close();
			this._oCustomerDialog.destroy();
		},
		handleCustomerListItemPress: function (oEvent) {
			var that = this;
			var selectedCustomer = oEvent.getSource().getBindingContext("customerModel").getObject();
			var createModel = this.getView().getModel("create");

			var partners = this.getView().getModel("create").getProperty("/ToPartners/results");
			var newPartners = partners.filter(function (el) {
				return el.PartnerFct != "Z0006";
			});
			var newPartner = {
				"RefGuid": this._guid,
				"Telephone": selectedCustomer.Telephonemob,
				"PartnerFct": "Z0006",
				"PartnerNo": selectedCustomer.Partner,
				"DescriptionName": selectedCustomer.AccountName,
				"AddressShort": selectedCustomer.Street
			};
			this._partnerNo = selectedCustomer.Partner;
			newPartners.push(newPartner);
			this.getView().getModel("create").setProperty("/ToPartners", {
				"results": newPartners
			});
			this.getView().getModel("create").refresh();
			this._setHeaderPartnerBindings("value", this.getModel("create"), "create");
			this._oCustomerDialog.close();
			this._oCustomerDialog.destroy();
			// this.saveCustomer();
			var oPayload = {
				"Guid": this._guid,
				"ProcessType": "ZC09",
				"ToPartners": createModel.getProperty("/ToPartners/results"),
				"Todiff": []
			};
			this.sendRequest(oPayload).then(function (data) {
				that.dataReceived(data);
				that.handleCustomerStepValidation();
			}, function (response) {});

		},
		generatePayload() {
			var model = this.getView().getModel("create");
			var requestPayload = {};
			var diffs = DeepDiff.diff(this._cloneDetailData,
				model.getData());
			requestPayload = {
				"Guid": this._guid,
				"ToRefObj": {
					"ProductId": model.getProperty("/ToRefObj/ProductId")
				},
				"ToCustomerh": {
					"Zz1FaturaNoSrh": model.getProperty("/ToCustomerh/Zz1FaturaNoSrh"),
					"Zz1FaturaTarihSrh": model.getProperty("/ToCustomerh/Zz1FaturaTarihSrh"),
					"Zz1SatisNoktasiSrh": model.getProperty("/ToCustomerh/Zz1SatisNoktasiSrh"),
					"Zz1HKaynagiSdSrh": model.getProperty("/ToCustomerh/Zz1HKaynagiSdSrh")
				},
				// "ToRefObj": model.getProperty("/ToRefObj")
				// "ToCustomerh": model.getProperty("/ToCustomerh"),
				"ToPartners": model.getProperty("/ToPartners/results"),
				"ToTexts": [{
					"Tdid": "Z007",
					"ConcLines": this.getView().byId("custReq").getValue()
				}],
				"ToCategory": model.getProperty("/ToCategory/results"),
				"ToItems": (model.getProperty("/ToItems/results") && model.getProperty("/ToItems/results").lengh > 0) ? model.getProperty("/ToItems/results") : [],
				"ToServiceItems": (model.getProperty("/ToServiceItems/results") && model.getProperty("/ToServiceItems/results").lengh > 0) ? model.getProperty("/ToServiceItems/results") : [],
				"ToSpItems": (model.getProperty("/ToSpItems/results") && model.getProperty("/ToSpItems/results").lengh > 0) ? model.getProperty("/ToSpItems/results") : [],
				"Todiff": []
			};
			if (diffs && diffs.length > 0) {
				const splitAt = (index, xs) => [xs.slice(0, index), xs.slice(index)]
				for (let diff of diffs) {
					// var jsonModelPath = diff.path.join("/"); 
					// diff Part
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
		dataReceived: function (data) {
			this._guid = data.Guid;
			this._createModel = this.getModel("create");
			this._cloneDetailData = jQuery.extend(true, {}, data);
			this.getModel("create").refresh();
			var selectedCategories = {
				"cat1": "",
				"cat2": "",
				"cat3": "",
				"cat4": "",
				"cat5": ""
			}
			var aCategories = [];
			if (data.ToCategory && data.ToCategory.results && data.ToCategory.results.length > 0) {
				aCategories = data.ToCategory.results;
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
				iIndex = aCategories.findIndex(category => category.Level === sId.Level);
				if (iIndex == -1) {
					aCategories.push({
						"Level": sId.Level
					})

				} else {
					selectedCategories["cat" + sId.Level] = aCategories[iIndex].Key;
				}
			}
			data.ToCategory.results = aCategories;
			this.getModel("create").setData(data);
			this.setInitialFilters(selectedCategories, "create");
			this._setCategoryBindings("selectedKey", this._createModel, "create");
			this._setHeaderPartnerBindings("value", this._createModel, "create");
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
		handleCustomerStepValidation() {
			var svName = this.getView().byId("customer");
			if (svName.getValue()) {
				this._wizard.validateStep(this.byId("customerSelectionStep"));
				svName.setValueState(sap.ui.core.ValueState.None);
				svName.setValueStateText("");
			} else {
				this._wizard.invalidateStep(this.byId("customerSelectionStep"));
				svName.setValueStateText("Zorunlu alan");
				svName.setValueState(sap.ui.core.ValueState.Error);
			}
		},
		handleFindOrderPress() {
			var aFilters = [];

			if (this._orderDialog) {
				this.getView().removeDependent(this._orderDialog);
				this._orderDialog.destroy();
			}
			this._orderDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.orderSearch", this);
			this.getView().addDependent(this._orderDialog);
			this._orderDialog.open();

			aFilters.push(new Filter("Partner", Operator.EQ, this._partnerNo));
			this._orderDialog.getContent()[0].getBinding("items").filter(aFilters);
			// this.handleProductSearch();
		},
		handleOrderCancel() {
			this._orderDialog.close();
			this._orderDialog.destroy();
		},
		handleOrderListItemPress(oEvent) {
			var that = this;
			var selectedOrder = oEvent.getSource().getBindingContext().getObject();
			var createModel = this.getView().getModel("create");
			var faturaExist = selectedOrder.BillNo ? true : false;
			this.getView().getModel("create").setProperty("/ToCustomerh/Zz1FaturaNoSrh", selectedOrder.BillNo);
			this.getView().getModel("create").setProperty("/ToCustomerh/Zz1FaturaTarihSrh", selectedOrder.BillDate);
			this.getView().getModel("create").setProperty("/ToCustomerh/Zz1SatisNoktasiSrhTxt", selectedOrder.SalesPointTxt);
			this.getView().getModel("create").setProperty("/ToCustomerh/Zz1SatisNoktasiSrh", selectedOrder.SalesPoint);
			this.getView().getModel("create").setProperty("/ToRefObj/ProductId", selectedOrder.ProductId);
			this.getView().getModel("create").setProperty("/ToRefObj/TextObject", selectedOrder.ProductName);
			this.getView().getModel("create").refresh();
			this.setOrderFieldsEnablement(false, faturaExist);
			this.handleGeneralStepValidation();
			this._orderDialog.close();
			this._orderDialog.destroy();

			//onurb 14.11.2022
			//sending request for getting Category1 data
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});

		},
		setOrderFieldsEnablement(bEnabled, bFaturaExist) {
			var oView = this.getView();
			oView.byId("productId").setEnabled(bEnabled);
			if(!bFaturaExist){
				oView.byId("billNo").setEnabled(true);
				oView.byId("billDate").setEnabled(true);
				return;
			}
			oView.byId("billNo").setEnabled(bEnabled);
			oView.byId("billDate").setEnabled(bEnabled);
			this._orderSelected = !bEnabled;
		},
		handleGeneralStepValidation(oEvent) {
			var product = this.getView().byId("productId");
			var billNo = this.getView().byId("billNo");
			var billDate = this.getView().byId("billDate");
			var custReq = this.getView().byId("custReq");
			var fileUploader = this.getView().byId("fileUploader");
			// var fileUploaderMus = this.getView().byId("fileUploaderMus");

			if (!product.getValue()) {
				product.setValueState(sap.ui.core.ValueState.Error);
				product.setValueStateText("Zorunlu alan");
				this._wizard.invalidateStep(this.byId("generalInfoStep"));
				return;
			} else {
				product.setValueState(sap.ui.core.ValueState.None);
				product.setValueStateText("");
				this._wizard.validateStep(this.byId("generalInfoStep"));
			}

			if (!billNo.getValue()) {
				billNo.setValueState(sap.ui.core.ValueState.Error);
				billNo.setValueStateText("Zorunlu alan");
				this._wizard.invalidateStep(this.byId("generalInfoStep"));
				return;
			} else {
				billNo.setValueState(sap.ui.core.ValueState.None);
				billNo.setValueStateText("");
				this._wizard.validateStep(this.byId("generalInfoStep"));
			}
			if (!billDate.getValue()) {
				billDate.setValueState(sap.ui.core.ValueState.Error);
				billDate.setValueStateText("Zorunlu alan");
				this._wizard.invalidateStep(this.byId("generalInfoStep"));
				return;
			} else {
				billDate.setValueState(sap.ui.core.ValueState.None);
				billDate.setValueStateText("");
				this._wizard.validateStep(this.byId("generalInfoStep"));
			}
			if (!custReq.getValue()) {
				custReq.setValueState(sap.ui.core.ValueState.Error);
				custReq.setValueStateText("Zorunlu alan");
				this._wizard.invalidateStep(this.byId("generalInfoStep"));
				return;
			} else {
				custReq.setValueState(sap.ui.core.ValueState.None);
				custReq.setValueStateText("");
				this._wizard.validateStep(this.byId("generalInfoStep"));
			}
			// if (!this._productImageUploaded) {
			// 	fileUploaderMus.setValueState(sap.ui.core.ValueState.Error);
			// 	fileUploaderMus.setValueStateText("Zorunlu alan");
			// 	this._wizard.invalidateStep(this.byId("generalInfoStep"));
			// 	return;
			// } else {
			// 	fileUploaderMus.setValueState(sap.ui.core.ValueState.None);
			// 	fileUploaderMus.setValueStateText("");
			// 	this._wizard.validateStep(this.byId("generalInfoStep"));
			// }
			if (!this._orderSelected) {
				if (!this._invoiceImageUploaded) {
					fileUploader.setValueState(sap.ui.core.ValueState.Error);
					fileUploader.setValueStateText("Zorunlu alan");
					this._wizard.invalidateStep(this.byId("generalInfoStep"));
					return;
				} else {
					fileUploader.setValueState(sap.ui.core.ValueState.None);
					fileUploader.setValueStateText("");
					this._wizard.validateStep(this.byId("generalInfoStep"));
				}
			} else {
				custReq.setValueState(sap.ui.core.ValueState.None);
				custReq.setValueStateText("");
				this._wizard.validateStep(this.byId("generalInfoStep"));
			}
		},
		handleErrorStepValidation(oEvent) {
			var oView = this.getView();
			var sOE = oView.byId("sourceOfError");
			var sOE1 = oView.byId("soeCB1");
			var sOE2 = oView.byId("soeCB2");
			var sOE3 = oView.byId("soeCB3");
			var sOE4 = oView.byId("soeCB4");
			var sOE5 = oView.byId("soeCB5");
			var length = sOE.getItems().length;
			// if (length > 0) {
			if (!sOE.getSelectedKey()) {
				this._wizard.invalidateStep(this.byId("errorStep"));
				sOE.setValueStateText("Zorunlu alan");
				sOE.setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this._wizard.validateStep(this.byId("errorStep"));
				sOE.setValueStateText("Zorunlu alan");
				sOE.setValueState(sap.ui.core.ValueState.None);
			}
			// }
			length = sOE1.getItems().length;
			if (length > 0) {
				if (!sOE1.getSelectedKey()) {
					this._wizard.invalidateStep(this.byId("errorStep"));
					sOE1.setValueStateText("Zorunlu alan");
					sOE1.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this._wizard.validateStep(this.byId("errorStep"));
					sOE1.setValueStateText("Zorunlu alan");
					sOE1.setValueState(sap.ui.core.ValueState.None);
				}
			}
			length = sOE2.getItems().length;
			if (length > 0) {
				if (!sOE2.getSelectedKey()) {
					this._wizard.invalidateStep(this.byId("errorStep"));
					sOE2.setValueStateText("Zorunlu alan");
					sOE2.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this._wizard.validateStep(this.byId("errorStep"));
					sOE2.setValueStateText("Zorunlu alan");
					sOE2.setValueState(sap.ui.core.ValueState.None);
				}
			}
			length = sOE3.getItems().length;
			if (length > 0) {
				if (!sOE3.getSelectedKey()) {
					this._wizard.invalidateStep(this.byId("errorStep"));
					sOE3.setValueStateText("Zorunlu alan");
					sOE3.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this._wizard.validateStep(this.byId("errorStep"));
					sOE3.setValueStateText("Zorunlu alan");
					sOE3.setValueState(sap.ui.core.ValueState.None);
				}
			}
			length = sOE4.getItems().length;
			if (length > 0) {
				if (!sOE4.getSelectedKey()) {
					this._wizard.invalidateStep(this.byId("errorStep"));
					sOE4.setValueStateText("Zorunlu alan");
					sOE4.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this._wizard.validateStep(this.byId("errorStep"));
					sOE4.setValueStateText("Zorunlu alan");
					sOE4.setValueState(sap.ui.core.ValueState.None);
				}
			}
			length = sOE5.getItems().length;
			if (length > 0) {
				if (!sOE5.getSelectedKey()) {
					this._wizard.invalidateStep(this.byId("errorStep"));
					sOE5.setValueStateText("Zorunlu alan");
					sOE5.setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this._wizard.validateStep(this.byId("errorStep"));
					sOE5.setValueStateText("Zorunlu alan");
					sOE5.setValueState(sap.ui.core.ValueState.None);
				}
			}
		},
		handleSourceOfErrorSelect(oEvent){
			var that = this;
			var oView = this.getView();
			this.getView().getModel("create").setProperty("/ToCustomerh/Zz1HKaynagiSdSrh", oEvent.getSource().getSelectedKey());
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
			
		},
		handleSOECB1Select(oEvent) {
			var that = this;
			var oView = this.getView();
			this.getView().getModel("create").setProperty("/ToCategory/results/0/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("create").setProperty("/ToCategory/results/0/Level", parseInt("01"));			
			var catArr = this.getView().getModel("create").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 1
			});
			this.getView().getModel("create").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB2").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
		},
		handleSOECB2Select(oEvent) {
			var that = this;
			var oView = this.getView();
			this.getView().getModel("create").setProperty("/ToCategory/results/1/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("create").setProperty("/ToCategory/results/1/Level", parseInt("02"));
			var catArr = this.getView().getModel("create").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 2
			});
			this.getView().getModel("create").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB3").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
		},
		handleSOECB3Select(oEvent) {
			var that = this;
			var oView = this.getView();
			this.getView().getModel("create").setProperty("/ToCategory/results/2/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("create").setProperty("/ToCategory/results/2/Level", parseInt("03"));
			var catArr = this.getView().getModel("create").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 3
			});
			this.getView().getModel("create").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB4").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
		},
		handleSOECB4Select(oEvent) {
			var that = this;
			var oView = this.getView();
			this.getView().getModel("create").setProperty("/ToCategory/results/3/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("create").setProperty("/ToCategory/results/3/Level", parseInt("04"));
			var catArr = this.getView().getModel("create").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 4
			});
			this.getView().getModel("create").setProperty("/ToCategory/results", catArr);
			oView.byId("soeCB5").getBinding("items").filter([new Filter("Key", Operator.EQ, oEvent.getSource().getSelectedKey()), new Filter(
				"Guid", Operator.EQ, this._guid)]);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
		},
		handleSOECB5Select(oEvent) {
			var that = this;
			this.getView().getModel("create").setProperty("/ToCategory/results/4/Key", oEvent.getSource().getSelectedKey());
			this.getView().getModel("create").setProperty("/ToCategory/results/4/Level", parseInt("05"));
			var catArr = this.getView().getModel("create").getProperty("/ToCategory/results").filter(function (el) {
				return el.Level <= 5
			});
			this.getView().getModel("create").setProperty("/ToCategory/results", catArr);
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.handleErrorStepValidation();
			}, function (response) {});
			// oView.byId("soeCB2").getBinding("items")
		},
		onReview() {
			// refresh model before navigating to review
			this.getView().getModel("create").refresh();
			// navigate to review page
			this._oNavContainer.to(this._oWizardReviewPage);
		},
		handleErrorStepComplete() {
			var that = this;
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				$.proxy(that.onReview(), that);
				that.dataReceived(data);
			}, function (response) {});
		},
		handleCustomerStepComplete() {
			var that = this;
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});
		},
		handleGeneralStepComplete() {
			var that = this;
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});
		},
		_navBackToCustomer() {
			$.proxy(this._navBackToStep(this._oView.byId("customerSelectionStep")), this);
			this._wizard.validateStep(this._oView.byId("customerSelectionStep"));
			this._wizard.invalidateStep(this._oView.byId("generalInfoStep"));

		},
		_navBackToGeneral() {
			$.proxy(this._navBackToStep(this._oView.byId("generalInfoStep")), this);
			this._wizard.validateStep(this._oView.byId("generalInfoStep"));
		},
		_navBackToError() {
			$.proxy(this._navBackToStep(this._oView.byId("errorStep")), this);
		},
		_navBackToStep(step) {
			const fnAfterNavigate = function () {
				this._wizard.goToStep(step);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			// this._oNavContainer.to(this._oWizardContentPage);
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},
		onSaveObject() {
			var that = this;
			var requestPayload = {
				"Guid": this._guid,
				"Save": "X",
				"Todiff": []
			};
			this.sendRequest(requestPayload).then(function (data) {
				if (data.ObjectId) {
					that.getRouter().navTo("objectDetail", {
						guid: data.Guid
					});
					return;
				}
			}, function (response) {});

		},
		handleUploadAttachmentMus() {
			var oFileUploader = this.getView().byId("fileUploaderMus");
			var oModel = this.getView().getModel();
			oFileUploader.removeAllHeaderParameters();
			oModel.refreshSecurityToken();
			const oHeaders = oModel.oHeaders;
			const sToken = oHeaders['x-csrf-token'];
			var sPath = oModel.createKey("/HeaderSet", {
				"Guid": this._guid
			});
			sPath = "/sap/opu/odata/sap/ZCM_SERVICEORDER_SRV" + sPath + "/ToAttachments";
			oFileUploader.setUploadUrl(sPath);
			// var slug = "02" + "/" + oFileUploader.getValue();
			var slug = "01" + "/" + encodeURIComponent(oFileUploader.getValue());
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
		handleUploadAttachment(oEvent) {
			var oFileUploader = this.getView().byId("fileUploader");
			var oModel = this.getView().getModel();
			oFileUploader.removeAllHeaderParameters();
			oModel.refreshSecurityToken();
			const oHeaders = oModel.oHeaders;
			const sToken = oHeaders['x-csrf-token'];
			var sPath = oModel.createKey("/HeaderSet", {
				"Guid": this._guid
			});
			sPath = "/sap/opu/odata/sap/ZCM_SERVICEORDER_SRV" + sPath + "/ToAttachments";
			oFileUploader.setUploadUrl(sPath);
			var slug = "02" + "/" + encodeURIComponent(oFileUploader.getValue());
			// var slug = "01" + "/" + oFileUploader.getValue();
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
				this._invoiceImageUploaded = true;
				this.handleGeneralStepValidation();
				sap.m.MessageToast.show("Yüklendi.");
			}
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(oEvent.getParameter("responseRaw"), "text/xml");
			var urlToDisplay = xmlDoc.getElementsByTagName('m:properties')[0].getElementsByTagName("d:UrlToDisplay")[0].textContent;
			oEvent.getSource().setBusy(false);
		},
		handleImageUploadCompleteMus(oEvent) {
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
				this._productImageUploaded = true;
				this.handleGeneralStepValidation();
				sap.m.MessageToast.show("Yüklendi.")
			}
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(oEvent.getParameter("responseRaw"), "text/xml");
			var urlToDisplay = xmlDoc.getElementsByTagName('m:properties')[0].getElementsByTagName("d:UrlToDisplay")[0].textContent;
			oEvent.getSource().setBusy(false);
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
			var selectedProduct = oEvent.getSource().getBindingContext("productModel").getObject();
			var createModel = this.getView().getModel("create");
			this.getView().getModel("create").setProperty("/ToRefObj/TextObject", selectedProduct.ShortText);
			this.getView().getModel("create").setProperty("/ToRefObj/ProductId", selectedProduct.ProductId);
			this.getView().getModel("create").refresh();
			this._oProductDialog.close();
			this._oProductDialog.destroy();
		},
		handleProductCancel: function () {
			this._oProductDialog.close();
			this._oProductDialog.destroy();
		},
		handleInvoiceDateChanged(oEvent) {
			var oModel = this.getView().getModel("create");
			oModel.setProperty("/ToCustomerh/Zz1FaturaTarihSrh", new Date(oEvent.getSource().getDateValue().setHours(12)));
			this.handleGeneralStepValidation();
		},
		handleYedekParEkle() {
			if (this._sparePartDialog) {
				this.getView().removeDependent(this._sparePartDialog);
				this._sparePartDialog.destroy();
			}
			this._sparePartDialog = sap.ui.xmlfragment(this.getView().getId(), "crm.third_party_lgst.fragments.productSuggestion", this);
			this.getView().addDependent(this._sparePartDialog);
			var sProductId = this.getView().getModel("create").getProperty("/ToRefObj/ProductId");
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
		handleItemDelete(oEvent) {
			var itemPath = oEvent.getSource().getBindingContext("create").getPath();
			var oModel = this.getView().getModel("create");
			oModel.setProperty(itemPath + "/Delete", "X");
			this.handleItemChange();
		},
		handleItemChange() {
			var that = this;
			var requestPayload = this.generatePayload();
			this.sendRequest(requestPayload).then(function (data) {
				that.dataReceived(data);
			}, function (response) {});
		}
	});
});
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/library",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet",
    "sap/m/Dialog",
    "sap/m/library",
    "sap/m/Button",
    "sap/m/Text",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/m/SearchField",
    "sap/ui/table/Column",
    "sap/m/Column",
    "sap/m/Label",
    "sap/ui/model/type/String",
    "sap/ui/comp/library",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/ui/core/message/Message",
    "sap/m/MessageBox"
], (Controller, coreLibrary, exportLibrary, Spreadsheet, Dialog, mobileLibrary, Button, Text, Sorter, Filter,
    SearchField, UIColumn, MColumn, Label, TypeString, compLibrary, FilterOperator, Fragment, Message, MessageBox) => {
    "use strict";
    var oOrderModel, oHierarchyEntryModel,oExecuteBusyModel;
    var HierarchyEntries = [], Plantlog = [], GroupedData = [];
    var ValueState = coreLibrary.ValueState;
    var oallproductsModel = new sap.ui.model.json.JSONModel();
    var DateValue1, DateValue2, DateoModel;
    var sUrl = "https://labelcloudapi.onnicelabel.com/Trigger/v1/CloudTrigger/Api-CloudIntegrationDemo-Print";
    return Controller.extend("prodorders.controller.prodorders_view", {
        onInit() {
            var that = this;
            DateoModel = new sap.ui.model.json.JSONModel({
                start: '',
                end: '' // default end date + 7 days
            });
            that.getView().setModel(DateoModel, "DateModel");
        },
        onPlantVH: function (oEvent) {
            this._oBasicSearchFieldWithSuggestionsPlant = new SearchField();
            this.pDialogWithSuggestions = this.loadFragment({
                name: "prodorders.view.PlantVH"
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar(), oPlantID, oPlantName, oColumnEmpName,
                    oColumnEmployeeId, oColumnBusinessPartner, oUserIdVH, oCompanyCodeVH, oCostcenterVH;
                this._oVHPlantWithSuggestions = oDialogSuggestions;
                this.getView().addDependent(oDialogSuggestions);
                // Set key fields for filtering in the Define Conditions Tab
                oDialogSuggestions.setRangeKeyFields([{
                    label: "Plant",
                    key: "Plant",
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 10
                    })
                }]);
                // Set Basic Search for FilterBar
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this._oBasicSearchFieldWithSuggestionsPlant);

                // Trigger filter bar search when the basic search is fired
                this._oBasicSearchFieldWithSuggestionsPlant.attachSearch(function () {
                    oFilterBar.search();
                });
                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    // For Desktop and tabled the default table is sap.ui.table.Table
                    if (oTable.bindRows) {
                        // Bind rows to the ODataModel and add columns
                        oTable.bindAggregation("rows", {
                            path: "/PlantsVH",
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oPlantID = new UIColumn({ label: new Label({ text: "Plant" }), template: new Text({ wrapping: false, text: "{Plant}" }) });
                        oPlantID.data({
                            fieldName: "Plant"
                        });
                        oTable.addColumn(oPlantID);

                        oPlantName = new UIColumn({ label: new Label({ text: "PlantName" }), template: new Text({ wrapping: false, text: "{PlantName}" }) });
                        oPlantName.data({
                            fieldName: "PlantName"
                        });
                        oTable.addColumn(oPlantName);
                    }
                }.bind(this));
                oDialogSuggestions.open();
            }.bind(this));
        },
        onValueHelpPlantVHOkPress: async function (oEvent) {
            var that = this,
                aTokens = oEvent.getParameter("tokens"),
                oModel = this.getView().getModel();
            if (aTokens.length > 0) {
                var oFilter = [],
                    oPlantfilter;
                var oText = aTokens[0].getKey();
                var oselectedSet = aTokens[0].getAggregation("customData");
                var oselectedData = oselectedSet[0].getProperty("value");
                var oPlant = this.byId("id_plant");
                oPlant.setValue(oText);
                /*   oPlantfilter = new sap.ui.model.Filter("Plant", "EQ", oText);
                   oFilter.push(oPlantfilter)
                   let oMaterials = await that._getPlantmaterials(oModel, oFilter);
                   if (oMaterials) {
                       oallmaterialsModel.setData(oMaterials);
                       that.getView().setModel(oallmaterialsModel, "AllMaterials");
                       oBusyDialog.close();
                   } else {
                       oallmaterialsModel.setData(oMaterials);
                       oallmaterialsModel.refresh();
                       that.getView().setModel(oallmaterialsModel, "AllMaterials");
                       oBusyDialog.close();
                   } */
            }
            this._oVHPlantWithSuggestions.close();
        },
        onValueHelpPlantVHCancelPress: function (oEvent) {
            this._oVHPlantWithSuggestions.close();
        },
        onValueHelpPlantVHAfterClose: function (oEvent) {
            this._oVHPlantWithSuggestions.destroy();
        },
        onFilterBarWithSuggestionsPlantVHSearch: function (oEvent) {
            var sSearchQuery = this._oBasicSearchFieldWithSuggestionsPlant.getValue(),
                aSelectionSet = oEvent.getParameter("selectionSet"),
                aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                    if (oControl.getValue()) {
                        aResult.push(new Filter({
                            path: oControl.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        }));
                    }

                    return aResult;
                }, []);

            aFilters.push(new Filter({
                filters: [
                    new Filter({ path: "PlantName", operator: FilterOperator.Contains, value1: sSearchQuery }),
                ],
                and: false
            }));

            this._filterTableWithSuggestionsPlant(new Filter({
                filters: aFilters,
                and: true
            }));
        },
        _filterTableWithSuggestionsPlant: function (oFilter) {
            var oVHDPlant = this._oVHPlantWithSuggestions;
            oVHDPlant.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(oFilter);
                }
                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(oFilter);
                }
                oVHDPlant.update();
            });
        },
        /**Plant Value Help */
        onPlantChange: async function (oEvent) {
            var that = this,
                oFilter = [],
                oPlantfilter,
                oValidatedPlant = oEvent.getSource(),
                sSelectedKey = oEvent.getParameter("newValue"),
                oModel = this.getView().getModel();
            oModel.setSizeLimit(999999);
            Plantlog = [];
            let oPlant = await that._plantValidation(oModel, sSelectedKey);
            if (sSelectedKey !== oPlant[0].Plant) {
                oValidatedPlant.setValueState(ValueState.Error);
                oValidatedPlant.setValueStateText("Please enter a valid Plant!");
            } else {
                oValidatedPlant.setValueState(ValueState.None);
            }
        },
        _plantValidation: function (oModel, sInputValue) {
            return new Promise((resolve, reject) => {
                oModel.read("/PlantsVH", {
                    filters: [new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sInputValue)],
                    success: function (oData) {
                        var aPlants = oData.results;
                        if (aPlants.length > 0) {
                            Plantlog.push({ Status: 'S', Message: 'Success', Plant: aPlants[0].Plant })
                            resolve(Plantlog);
                        } else {
                            Plantlog.push({ Status: 'S', Message: 'Success', Plant: '' })
                            resolve(Plantlog);
                        }
                    },
                    error: function (oError) {
                        Plantlog.push({ Status: 'E', Message: 'No Plant Found', Plant: '' })
                        reject(Plantlog);
                    }
                });
            });
        },
        /*Production Order VH*/
        onOrderVH: async function (oEvent) {
            var sInputValue = oEvent.getSource().getValue(),
                oButton = oEvent.getSource(),
                oPlant = this.getView().byId("id_plant").getValue(),
                oView = this.getView(),
                oFilter = [],
                oPlantfilter,
                oModel = this.getView().getModel(),
                that = this;
            if (oPlant) {
                oPlantfilter = new sap.ui.model.Filter("ProductionPlant", "EQ", oPlant);
                oFilter.push(oPlantfilter);
            }
            let oProductVH = await that._getProductionVH(oModel, oFilter);
            if (oProductVH) {
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            } else {
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            }
            if (!this._pValueHelpDialog) {
                this._pValueHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "prodorders.view.ProductionVH",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pValueHelpDialog.then(function (oDialog) {
                // Create a filter for the binding
                if (sInputValue) {
                    oDialog.open(sInputValue);
                } else {
                    oDialog.open();
                }
                that._configDialog(oButton, oDialog);
            });
        },
        _configDialog: function (oButton, oDialog) {
            oDialog.setMultiSelect(true);
            var sCustomConfirmButtonText = oButton.data("confirmButtonText");
            oDialog.setConfirmButtonText(sCustomConfirmButtonText);
            // Remember selections if required
            oDialog.setRememberSelections(true);
            //add Clear button if needed
            oDialog.setShowClearButton(true);
        },
        _getProductionVH: function (oModel, oFilter) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductionOrderVH", {
                    filters: oFilter,
                    urlParameters: { "$top": 2000 },
                    success: function (oData) {
                        var aProductionData = oData.results;
                        if (aProductionData.length > 0) {
                            resolve(aProductionData);
                        } else {
                            resolve("404");
                        }
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        onValueHelpprodSearch: async function (oEvent) {
            var oFilter = [], oProdfilter, oPlantfilter,
                oPlant = this.getView().byId("id_plant").getValue(),
                oModel = this.getView().getModel(),
                sValue = oEvent.getParameter("value"),
                that = this;
            if (sValue) {
                oProdfilter = new sap.ui.model.Filter("ProductionOrder", sap.ui.model.FilterOperator.Contains, sValue);
                oFilter.push(oProdfilter);
            }
            if (oPlant) {
                oPlantfilter = new sap.ui.model.Filter("ProductionPlant", "EQ", oPlant);
                oFilter.push(oPlantfilter);
            }
            let oProductVH = await that._getProductionVH(oModel, oFilter);
            if (oProductVH) {
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            } else {
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            }
        },
        onValueHelpprodClose: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("selectedItems"),
                oMultiInput = this.byId("id_order_val");

            if (aSelectedItems && aSelectedItems.length > 0) {
                aSelectedItems.forEach(function (oItem) {
                    oMultiInput.addToken(new sap.m.Token({
                        text: oItem.getTitle()
                    }));
                });
            } else {
                oMultiInput.removeAllTokens();
            }
        },
        handleDateChange: function (oEvent) {
            var searchBtn = this.getView().byId("id_search");
            var oRangeDate = [],
                sFrom = oEvent.getParameter("from"),
                sTo = oEvent.getParameter("to"),
                svalue = oEvent.getParameter("value"),
                bValid = oEvent.getParameter("valid"),
                oEventSource = oEvent.getSource();
            if (bValid) {
                oEventSource.setValueState(ValueState.None);
                oRangeDate = svalue.split("–");
                if (oRangeDate.length > 1) {
                    DateValue1 = oRangeDate[0].trim();
                    DateValue2 = oRangeDate[1].trim();
                    var diff = this._datediff(sFrom, sTo);
                    if (diff > 120) {
                        oEventSource.setValueState(ValueState.Error);
                        oEventSource.setValueStateText("Date Range shouldn't exceed more than 60 days");
                        searchBtn.setEnabled(false);
                    } else {
                        oEventSource.setValueState(ValueState.None);
                        oEventSource.setValueStateText("");
                        searchBtn.setEnabled(true);
                    }
                    console.log(diff);
                } else {
                    DateValue1 = oRangeDate[0].trim();
                    DateValue2 = oRangeDate[0].trim();
                    searchBtn.setEnabled(true);
                }
            } else {
                oEventSource.setValueState(ValueState.Error);
                oEventSource.setValueStateText("Invalid Date");
                searchBtn.setEnabled(false);
            }
        },
        _datediff: function (oDate1, oDate2) {
            const _MS_PER_DAY = 1000 * 60 * 60 * 24;
            // Discard the time and time-zone information.
            const utc1 = Date.UTC(oDate1.getFullYear(), oDate1.getMonth(), oDate1.getDate());
            const utc2 = Date.UTC(oDate2.getFullYear(), oDate2.getMonth(), oDate2.getDate());

            return Math.floor((utc2 - utc1) / _MS_PER_DAY);
        },
        onFilter: async function () {
            var oPlant = this.getView().byId("id_plant").getValue(),
                oOrders = this.getView().byId("id_order_val").getTokens(),
                oModel = this.getView().getModel(),
                oFilter = [], ofilterPlant, ofilterOrders, ofilterDate, that = this;
            if (oPlant == '' || (oOrders.length === 0 && (DateValue1 === undefined || DateValue1 == ''))) {
                MessageBox.warning("Plant and Production Orders/Created Date is Mandatory. Please fill the details");
            } else {
                if (oPlant) {
                    ofilterPlant = new sap.ui.model.Filter("Plant", "EQ", oPlant);
                    oFilter.push(ofilterPlant);
                }
                if (oOrders.length > 0) {
                    var oFilterMultiOrder = [];
                    oOrders.map(function (oToken) {
                        oFilterMultiOrder.push(new sap.ui.model.Filter("ProductionOrder", "EQ", oToken.getText()));
                    });
                    ofilterOrders = new sap.ui.model.Filter({
                        filters: oFilterMultiOrder,
                        and: false
                    });
                    oFilter.push(ofilterOrders);
                }
                if (DateValue1 && DateValue2) {
                    var oDateRange = DateValue1 + 'T00:00:00Z';
                    var oDateRangeto = DateValue2 + 'T23:59:59Z';
                    ofilterDate = new sap.ui.model.Filter("CreationDate", "BT", oDateRange, oDateRangeto);
                    oFilter.push(ofilterDate);
                } else if (DateValue1) {
                    var oDateRangefrom = DateValue1 + 'T00:00:00Z';
                    var oDateRangeto = DateValue1 + 'T23:59:59Z';
                    ofilterDate = new sap.ui.model.Filter("CreationDate", "BT", oDateRangefrom, oDateRangeto);
                    oFilter.push(ofilterDate);
                }
                let sProductionOrders = await that._getProductionOrderDetails(oModel, oFilter);
                if (sProductionOrders) {
                    oHierarchyEntryModel = new sap.ui.model.json.JSONModel();
                    var groupedData = sProductionOrders.reduce((acc, currentItem) => {
                        // Create a composite key using Order_no, Order_date, and Released_on
                        const key = `${currentItem.ProductionOrder}|${currentItem.CreationDate}|${currentItem.ReleaseDate}`;

                        // If the key doesn't exist in the accumulator, create a new group
                        if (!acc[key]) {
                            acc[key] = {
                                Order_no: currentItem.ProductionOrder,
                                Order_date: currentItem.CreationDate,
                                Released_on: currentItem.ReleaseDate,
                                Orders: [] // Array to hold all items for this group
                            };
                        }

                        // Push the current item into the appropriate group
                        acc[key].Orders.push({
                            Order_no: currentItem.ProductionOrder,
                            Order_date: currentItem.CreationDate,
                            Released_on: currentItem.ReleaseDate,
                            Material_no: currentItem.Material,
                            Material_desc: currentItem.MaterialDescription,
                            Serial_no: currentItem.SerialNumber
                        });

                        return acc;
                    }, {});
                    var oGroupedData = Object.values(groupedData);
                    oHierarchyEntryModel.setData(oGroupedData);
                    this.getView().setModel(oHierarchyEntryModel, "Entries");
                }
            }
        },
        _getProductionOrderDetails: async function (oModel, oFilter) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductionOrders", {
                    filters: oFilter,
                    urlParameters: { "$top": 5000 },
                    success: function (oData) {
                        var aProductionOrderDetails = oData.results;
                        if (aProductionOrderDetails.length > 0) {
                            resolve(aProductionOrderDetails);
                        } else {
                            resolve("404");
                        }
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        _getProductionOrderData: async function (oModel, oFilter) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductionOrderDetails", {
                    filters: oFilter,
                    urlParameters: { "$top": 5000 },
                    success: function (oData) {
                        var aProductionOrderDetails = oData.results;
                        if (aProductionOrderDetails.length > 0) {
                            resolve(aProductionOrderDetails);
                        } else {
                            resolve("404");
                        }
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        },
        selectRow: function (oEvent) {
          /*  var oTable = oEvent.getSource();
            var oIndex = oTable.getSelectedIndex();
            var oSelectedItem = oTable.getBinding("rows");
            var aItems = oSelectedItem.oModel.oData[oIndex];
            var count = 0;
            var index = 0
            index = oIndex + 1;
            count = index;
            console.log(index);
            try {
                if(aItems.Orders){
                    for (var i = 0; i < aItems.Orders.length; i++) {
                       count = count + 1;
                    }
                    if(index == count){
                        oTable.setSelectedIndex(index);
                    }else{
                        oTable.addSelectionInterval(index,count);
                    }      
                }
            } catch (error) {
                
            }
            if(aItems){
                for (var i = 0; i < aItems.length; i++) {
                   count = count + 1;
                }
                if(oIndex && count){
                    if(index == count){
                        oTable.setSelectedIndex(index);
                    }else{
                        oTable.addSelectionInterval(index,count);
                    }
                    
                }
                
            }*/ 
        },
        onPrint: async function(oEvent){
            var that = this,
                oTable = this.getView().byId("tableId1"),
                oModel = this.getView().getModel(),
                oIndices = oTable.getSelectedIndices(),
                oRows = oTable.getRows(),
                oSelectedItem = oTable.getBinding("rows"),
                oNodes = oSelectedItem.getNodes(),
                oFilterMultiOrderData = [],
                oFilter = [],
                ofilterOrdersData;
                oExecuteBusyModel = new sap.m.BusyDialog({
                    title: "Loading Data",
                    text: "Please wait....."
                });
                oExecuteBusyModel.open();
                oIndices.forEach( function (Index) {
                    var filterData = oRows[Index].getCells()[0].getText() + '|' + oRows[Index].getCells()[3].getText() + '|' + oRows[Index].getCells()[5].getText();
                    oFilterMultiOrderData.push(new sap.ui.model.Filter("filterString", "EQ", filterData));
                });
                ofilterOrdersData = new sap.ui.model.Filter({
                        filters: oFilterMultiOrderData,
                        and: false
                });
                oFilter.push(ofilterOrdersData);
                let oProductResults = await that._getProductionOrderData(oModel,oFilter);
                try{
                    if(oProductResults.length > 0){
                        for (var Product of oProductResults) {
                            try {
                                if(Product){
                                    var oLoftware = {}, Variables = {};
                                    var urllabel = "/Labels/Templates/Serial No Label.nlbl";
                                    oLoftware.Variables = [];
                                    oLoftware.FilePath = urllabel;
                                    oLoftware.FileVersion = "";
                                    oLoftware.Quantity = "1";
                                    oLoftware.Printer = "ZEBRA 105SL 300DPI";//"RVLLBLPRT20";
                                    oLoftware.PrinterSettings = "";
                                    if (Product.Material) {
                                        Variables.CATALOG_NUMBER = Product.Material;
                                    }
                                    if (Product.insepectionMemo) {
                                        Variables.MODEL_NUMBER = Product.insepectionMemo;
                                    }
                                    if (Product.quantity_GRGI) {
                                        Variables.GR_SLIPS_QTY = Product.quantity_GRGI;
                                    }
                                    if (Product.labelFrom) {
                                        Variables.LABEL_FORM = Product.labelFrom;
                                    }
                                    if (Product.labelType) {
                                        Variables.LABEL_TYPE = Product.labelType;
                                    }
                                    if (Product.materialOld) {
    
                                    }
                                    if (Product.articleNo_EAN_UPC) {
                                        Variables.UPC_NUMBER = Product.articleNo_EAN_UPC;
                                    }
                                    if (Product.materialGroup) {
                                        Variables.BRAND_NAME = Product.materialGroup;
                                    }
                                    if (Product.materialDescription) {
                                        Variables.DESCRIPTION = Product.materialDescription;
                                    }
                                    if (Product.serialNo) {
                                        Variables.SERIAL_NUMBER = Product.serialNo;
                                    }
                                    if (Product.objectListNo) {
    
                                    }
                                    if (Product.orderNo) {
                                        Variables.PROD_ORDER = Product.orderNo;
                                    }
                                    if (Product.objectlistCounter) {
                                        Variables.SEQ_NUM = Product.objectlistCounter;
                                    }
                                    if (Product.objectlisCounterMax) {
                                        Variables.SEQ_QTY = Product.objectlisCounterMax;
                                    }
                                    if (Product.materialSubstitute) {
                                        Variables.CUST_PART_NUMBER = Product.materialSubstitute;
                                    }
                                    if (Product.userText) {
                                        Variables.CUSTOM_TXT = Product.userText;
                                    }
                                    if (Product.location) {
                                        if (oPlant == "1710") {
                                            Variables.LOCATION = "Russellville, AL";
                                        } else if (oPlant == "2910") {
                                            Variables.LOCATION = "Toronto, ON";
                                        }
                                    }
                                    oLoftware.Variables.push(Variables);
                                    var oLoftwareJson = JSON.stringify(oLoftware);
                                        try {
                                            var oResult = await that._sendprodlabels(sUrl, oLoftwareJson);
                                        } catch (error) {
                                            console.log('error logged');
                                            continue;
                                        }

                                }else{
                                    continue;
                                }
                            } catch (error) {
                                oExecuteBusyModel.close();
                            }
                        };
                        oExecuteBusyModel.close();
                    }
                }catch{
                    MessageBox.warning("No Data Found for Orders to Print label!! Please try again");
                    oExecuteBusyModel.close();
                }

        },
        _sendprodlabels: async function (sUrl,oLoftwareJson) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "POST",
                    url: sUrl,
                    dataType: "json",
                    contentType: "application/json",
                    data: oLoftwareJson,
                    crossDomain: true,
                    headers: {
                        "Ocp-Apim-Subscription-Key": "d79514cfdffe4c229ac15b52fbf9adc8"
                    },
                    success: function (response) {
                        console.log("Success:", response);
                        resolve({ status: 'S', Message: 'Successfully' });
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        console.log("Error:", xhr);
                        reject({ status: 'E', Message: xhr.responseText });
                    }
                });
            })
        }
    });
});
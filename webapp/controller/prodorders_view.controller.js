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
    var oOrderModel, oHierarchyEntryModel, oExecuteBusyModel, oFieldModel;
    var HierarchyEntries = [], Plantlog = [], GroupedData = [], productLogs = [], productnoFound = [];
    var ValueState = coreLibrary.ValueState;
    var oallproductsModel = new sap.ui.model.json.JSONModel();
    var DateValue1, DateValue2, DateoModel;
    var sUrl, sToken;
    return Controller.extend("prodorders.controller.prodorders_view", {
        formatDate: function (oValue) {
            if (oValue) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "MM/dd/yyyy",
                    strictParsing: true,
                    UTC: true
                });
                var dateValue = new Date(oValue);
                var datevalueFormatted = oDateFormat.format(dateValue);
                return datevalueFormatted;
            } else {
                return ''
            }
        },
        onInit() {
            var that = this;
            DateoModel = new sap.ui.model.json.JSONModel({
                start: '',
                end: '' // default end date + 7 days
            });
            that.getView().setModel(DateoModel, "DateModel");

            oFieldModel = new sap.ui.model.json.JSONModel({
                bHideColumn: false
            });
            that.getView().setModel(oFieldModel, "FieldProperty");
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
            var oPlant = this.getView().byId("id_plant").getValue(),
                oFilter = [],
                oPlantfilter,
                oModel = this.getView().getModel(),
                oDialogprodVH = this.byId("prodVHDialog"),
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
            if (!oDialogprodVH) {
                oDialogprodVH = new sap.ui.xmlfragment(this.getView().getId(), "prodorders.view.ProductionVH", this);
                this.getView().addDependent(oDialogprodVH);
                oDialogprodVH.open();
            } else {
                oDialogprodVH.open();
            }
        },
        OnVHprodSelected: function (oEvent) {
            var oMultiInputSelected = this.getView().byId('id_prod_value_help');
            var oSelected = oEvent.getParameter('selected');
            var oRemoved = oEvent.getParameter('removed');
            var oValue = oEvent.getParameter('listItem').getCells()[0].getText();
            if (oSelected === true) {
                oMultiInputSelected.addToken(new sap.m.Token({
                    key: oValue, text: oValue
                }));
            } else {
                var removedTokens = oMultiInputSelected.getTokens();
                var index = -1;
                for (var i = 0; i < removedTokens.length; i++) {
                    if (removedTokens[i].getKey() === oValue || removedTokens[i].getText() === oValue) {
                        index = i;
                        break;
                    }
                }
                oMultiInputSelected.removeToken(index);
            }
        },
        onprodSearch: async function (oEvent) {
            var oModel = this.getView().getModel(),
                oPlant = this.getView().byId("id_plant").getValue(),
                oTable = this.getView().byId('prodvaluehelp'),
                sQuery = oEvent.getSource().getValue(),
                that = this,
                oFilter = [],
                oProdfilter,
                oPlantfilter;
            if (sQuery) {
                oProdfilter = new sap.ui.model.Filter("ProductionOrder", sap.ui.model.FilterOperator.Contains, sQuery);
                oFilter.push(oProdfilter);
            }
            if (oPlant) {
                oPlantfilter = new sap.ui.model.Filter("ProductionPlant", "EQ", oPlant);
                oFilter.push(oPlantfilter);
            }
            oTable.removeSelections(true);
            let oProductVH = await that._getProductionVH(oModel, oFilter);
            if (oProductVH !== '404') {
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            } else {
                oProductVH = [];
                oallproductsModel.setData(oProductVH);
                oallproductsModel.refresh();
                that.getView().setModel(oallproductsModel, "AllProducts");
            }
        },
        okprodVHDialog: function(oEvent){
            var oTable = this.getView().byId('prodvaluehelp');
            var oSelectedTokens = this.getView().byId('id_prod_value_help');
            var oMultiInput = this.getView().byId('id_order_val');
            var aTokens = oSelectedTokens.getTokens();
            aTokens.forEach(function (oToken) {
                if (oToken) {
                    oMultiInput.addToken(oToken);
                }
            });
            this.getView().byId("prodVHDialog").close();
            oTable.removeSelections(true);
        },
        closeprodVHDialog: function(oEvent){
            var oSelectedTokens = this.getView().byId('id_prod_value_help');
            var oTable = this.getView().byId('prodvaluehelp');
            oTable.removeSelections(true);
            oSelectedTokens.removeAllTokens();
            this.getView().byId("prodVHDialog").close();
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
        onOrderChange: async function (oEvent) {
            var oValue = oEvent.getParameter("newValue");
            var oMultiInput = this.getView().byId("id_order_val"),
            oModel = this.getView().getModel(),
            that = this;
            var oFilter= [],ofilterProd,ProdVH = [];
            ofilterProd = new sap.ui.model.Filter("ProductionOrder", "EQ", oValue);
            oFilter.push(ofilterProd);
            if (oValue) {
                try {
                    var oProdVH = await that._getProductionVH(oModel, oFilter);
                    if (oProdVH == '404') {
                        oMultiInput.setValueState(ValueState.Warning);
                        oMultiInput.setValueStateText('Invalid Product- ' + oValue);
                    } else {
                        oMultiInput.setValueState(ValueState.None);
                        oMultiInput.setValueStateText('');
                        var oProductionTokens = oMultiInput.getTokens();
                        oProductionTokens.map(function (oToken) {
                            ProdVH.push({ ProductionOrder: oToken.getKey() });
                        });
                        let filteredTokenProduction = ProdVH.filter(item => item.ProductionOrder == oValue);
                        if (filteredTokenProduction.length > 0) {
                            oMultiInput.setValue('');
                        } else {
                            oMultiInput.addToken(new sap.m.Token({
                                key: oValue, text: oValue
                            }));
                            oMultiInput.setValue('');
                        }
                    }
                }catch (error){
                    oMultiInput.setValueState(ValueState.Warning);
                    oMultiInput.setValueStateText('Invalid Product- ' + oValue);
                }
            }else{
                oMultiInput.setValueState(ValueState.None);
                oMultiInput.setValueStateText('');
            }
        },
        onFilter: async function () {
            var oPlant = this.getView().byId("id_plant").getValue(),
                oOrders = this.getView().byId("id_order_val").getTokens(),
                oModel = this.getView().getModel(),
                oHierarchyEntryModel = new sap.ui.model.json.JSONModel(),
                oFilter = [], ofilterPlant, ofilterOrders, ofilterDate, that = this;
            oFieldModel = this.getView().getModel("FieldProperty");
            oFieldModel.setProperty("/bHideColumn", false);
            oFieldModel.refresh();
            if (oPlant == '' || (oOrders.length === 0 && (DateValue1 === undefined || DateValue1 == ''))) {
                if (oPlant == '') {
                    MessageBox.warning("Plant is Mandatory. Please fill the details");
                } else if (oOrders.length === 0 && (DateValue1 === undefined || DateValue1 == '')) {
                    MessageBox.warning("Production Order or Created Date is Mandatory. Please fill the details");
                    HierarchyEntries = [];
                    oHierarchyEntryModel.setData(HierarchyEntries);
                    this.getView().setModel(oHierarchyEntryModel, "Entries");
                    oExecuteBusyModel.close();
                }

            } else {
                oExecuteBusyModel = new sap.m.BusyDialog({
                    title: "Loading Data",
                    text: "Please wait....."
                });
                oExecuteBusyModel.open();
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
                HierarchyEntries = [];
                let sProductionOrders = await that._getProductionOrderDetails(oModel, oFilter);
                try {
                    if (sProductionOrders == '404') {
                        HierarchyEntries = [];
                        oHierarchyEntryModel.setData(HierarchyEntries);
                        this.getView().setModel(oHierarchyEntryModel, "Entries");
                        oExecuteBusyModel.close();
                        MessageBox.information("No Orders found please try with other criteria!!");
                    } else {
                        if (sProductionOrders.length > 0) {
                            for (var i = 0; i < sProductionOrders.length; i++) {
                                var oProductionOrder = {};
                                oProductionOrder.ProductionOrder = sProductionOrders[i].ProductionOrder;
                                oProductionOrder.CreationDate = sProductionOrders[i].CreationDate;
                                oProductionOrder.ReleaseDate = sProductionOrders[i].ReleaseDate;
                                oProductionOrder.Material = sProductionOrders[i].Material;
                                oProductionOrder.MaterialDescription = sProductionOrders[i].MaterialDescription;
                                oProductionOrder.SerialNumber = sProductionOrders[i].SerialNumber;
                                oProductionOrder.Status = '';
                                oProductionOrder.Message = '';
                                HierarchyEntries.push(oProductionOrder);
                            };
                            oHierarchyEntryModel.setData(HierarchyEntries);
                            this.getView().setModel(oHierarchyEntryModel, "Entries");
                            oExecuteBusyModel.close();
                        }
                    }

                } catch (error) {
                    HierarchyEntries = [];
                    oHierarchyEntryModel.setData(HierarchyEntries);
                    this.getView().setModel(oHierarchyEntryModel, "Entries");
                    oExecuteBusyModel.close();
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
        onPrint: async function (oEvent) {
            var that = this,
                oTable = this.getView().byId("tableId1"),
                oModel = this.getView().getModel(),
                oSelectedItem = oTable.getSelectedItems(),
                oFilterMultiOrderData = [],
                oFilter = [],
                oSelectedItemArray = [],
                ofilterOrdersData;
            var oConfigDataModel = this.getOwnerComponent().getModel('configurationModel');
            var oConfigData = oConfigDataModel.getData().items;
            var oFieldDataModel = this.getOwnerComponent().getModel('fieldMappingModel');
            var oFieldData = oFieldDataModel.getData().items;
            productLogs = [], productnoFound = [];
            try {
                if (oConfigData.length > 0) {
                    let urldetails = oConfigData.filter(function (item) {
                        return item.fieldname === 'URL';
                    });
                    if (urldetails.length > 0) {
                        sUrl = urldetails[0].value;
                    }
                    let tokendetails = oConfigData.filter(function (item) {
                        return item.fieldname === 'TOKEN';
                    });
                    if (tokendetails.length > 0) {
                        sToken = tokendetails[0].value;
                    }
                }
            } catch (error) {
                sToken = '';
                sUrl = '';
            }
            if (sUrl && sToken) {
                if (oSelectedItem.length > 0) {
                    oExecuteBusyModel = new sap.m.BusyDialog({
                        title: "Loading Data",
                        text: "Please wait....."
                    });
                    oExecuteBusyModel.open();
                    oSelectedItem.forEach(function (selectedItem, Index) {
                        var oContext = oSelectedItem[Index].getCells();
                        var filterData = oContext[1].getText() + '|' + oContext[4].getText() + '|' + oContext[6].getText();
                        oFilterMultiOrderData.push(new sap.ui.model.Filter("filterString", "EQ", filterData));
                        oSelectedItemArray.push({ ProductionOrder: oContext[1].getText(), Material: oContext[4].getText(), SerialNumber: oContext[6].getText() })
                    });
                    ofilterOrdersData = new sap.ui.model.Filter({
                        filters: oFilterMultiOrderData,
                        and: false
                    });
                    oFilter.push(ofilterOrdersData);
                    let oProductResults = await that._getProductionOrderData(oModel, oFilter);
                    try {
                        if (oProductResults.length > 0) {
                            var oLoftware = {}, Variables;
                            oLoftware.Variables = [];
                            oLoftware.FileVersion = "";
                            oLoftware.PrinterSettings = "";
                            for (var Product of oProductResults) {
                                var oFiltersdata = [], ofilterPlant, ofilterLabeltype;
                                Variables = {};
                                try {
                                    if (Product) {
                                        var urllabel = Product.labelName//"/Labels/Serial No Label.nlbl";
                                        if (urllabel) {
                                            Variables.FilePath = urllabel;
                                        }
                                        if (Product.Plant) {
                                            try {
                                                var oPrinter = Product.Printer;
                                                if (oPrinter) {
                                                    Variables.Printer = oPrinter;
                                                } else {
                                                    productnoFound.push({ ProductionOrder: Product.orderNo, Material: Product.Material, SerialNumber: Product.serialNo, Message: 'Printer not configured.' });
                                                    continue;
                                                }
                                            } catch (error) {
                                                productnoFound.push({ ProductionOrder: Product.orderNo, Material: Product.Material, SerialNumber: Product.serialNo, Message: 'Printer not configured.' });
                                                continue;
                                            }
                                        } else {
                                            productnoFound.push({ ProductionOrder: Product.orderNo, Material: Product.Material, SerialNumber: Product.serialNo, Message: 'Plant not found' });
                                            continue;
                                        }
                                        if (Product.Material) {
                                            var loftwarematerialfield;
                                            try {
                                                let materialfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'Material';
                                                });
                                                loftwarematerialfield = materialfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarematerialfield = '';
                                            }
                                            if (loftwarematerialfield) { Variables[loftwarematerialfield] = Product.Material; }
                                        }
                                        if (Product.insepectionMemo) {
                                            var loftwareMemofield;
                                            try {
                                                let Memofield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'insepectionMemo';
                                                });
                                                loftwareMemofield = Memofield[0].loftwarefield;
                                            } catch (error) {
                                                loftwareMemofield = '';
                                            }
                                            if (loftwareMemofield) { Variables[loftwareMemofield] = Product.insepectionMemo; }
                                        }
                                        if (Product.quantity_GRGI) {
                                            var loftwareGRquant;
                                            try {
                                                let GRQuantfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'quantity_GRGI';
                                                });
                                                loftwareGRquant = GRQuantfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwareGRquant = '';
                                            }
                                            if (loftwareGRquant) { Variables[loftwareGRquant] = '1'; }
                                        }
                                        Variables.Quantity = '1';
                                        if (Product.labelFrom) {
                                            var loftwarelabelFrom;
                                            try {
                                                let LabelFromfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'labelFrom';
                                                });
                                                loftwarelabelFrom = LabelFromfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarelabelFrom = '';
                                            }
                                            if (loftwarelabelFrom) { Variables[loftwarelabelFrom] = Product.labelFrom; }
                                        }
                                        if (Product.labelType) {
                                            var loftwarelabelType;
                                            try {
                                                let LabelTypefield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'labelType';
                                                });
                                                loftwarelabelType = LabelTypefield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarelabelType = '';
                                            }
                                            if (loftwarelabelType) { Variables[loftwarelabelType] = Product.labelType; }
                                        }
                                        if (Product.materialOld) {
                                            var loftwarematerialOld;
                                            try {
                                                let materialOldfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'materialOld';
                                                });
                                                loftwarematerialOld = materialOldfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarematerialOld = '';
                                            }
                                            if (loftwarematerialOld) { Variables[loftwarematerialOld] = Product.materialOld; }
                                        }
                                        if (Product.articleNo_EAN_UPC) {
                                            var loftwarearticleNo;
                                            try {
                                                let articleNofield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'articleNo_EAN_UPC';
                                                });
                                                loftwarearticleNo = articleNofield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarearticleNo = '';
                                            }
                                            if (loftwarearticleNo) { Variables[loftwarearticleNo] = Product.articleNo_EAN_UPC; }
                                        }
                                        if (Product.materialGroup) {
                                            var loftwarematerialGroup;
                                            try {
                                                let materialGroupfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'materialGroup';
                                                });
                                                loftwarematerialGroup = materialGroupfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarematerialGroup = '';
                                            }
                                            if (loftwarematerialGroup) { Variables[loftwarematerialGroup] = Product.materialGroup; }
                                        }
                                        if (Product.materialDescription) {
                                            var loftwarematerialDescription;
                                            try {
                                                let materialDescfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'materialDescription';
                                                });
                                                loftwarematerialDescription = materialDescfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarematerialDescription = '';
                                            }
                                            if (loftwarematerialDescription) { Variables[loftwarematerialDescription] = Product.materialDescription; }
                                        }
                                        if (Product.serialNo) {
                                            var loftwareserialNo;
                                            try {
                                                let serialNofield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'serialNo';
                                                });
                                                loftwareserialNo = serialNofield[0].loftwarefield;
                                            } catch (error) {
                                                loftwareserialNo = '';
                                            }
                                            if (loftwareserialNo) { Variables[loftwareserialNo] = Product.serialNo; }
                                        }
                                        if (Product.objectListNo) {

                                        }
                                        if (Product.orderNo) {
                                            var loftwareorderNo;
                                            try {
                                                let orderNofield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'orderNo';
                                                });
                                                loftwareorderNo = orderNofield[0].loftwarefield;
                                            } catch (error) {
                                                loftwareorderNo = '';
                                            }
                                            if (loftwareorderNo) { Variables[loftwareorderNo] = Product.orderNo; }
                                        }
                                        if (Product.objectlistCounter) {
                                            var loftwarelistCounter;
                                            try {
                                                let listCounterfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'objectlistCounter';
                                                });
                                                loftwarelistCounter = listCounterfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarelistCounter = '';
                                            }
                                            if (loftwarelistCounter) { Variables[loftwarelistCounter] = Product.objectlistCounter; }
                                        }
                                        if (Product.objectlisCounterMax) {
                                            var loftwareCounterMax;
                                            try {
                                                let CounterMaxfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'objectlisCounterMax';
                                                });
                                                loftwareCounterMax = CounterMaxfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwareCounterMax = '';
                                            }
                                            if (loftwareCounterMax) { Variables[loftwareCounterMax] = Product.objectlisCounterMax; }
                                        }
                                        if (Product.materialSubstitute) {
                                            var loftwarematerialSubstitute;
                                            try {
                                                let loftwarematerialSubfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'materialSubstitute';
                                                });
                                                loftwarematerialSubstitute = loftwarematerialSubfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarematerialSubstitute = '';
                                            }
                                            if (loftwarematerialSubstitute) { Variables[loftwarematerialSubstitute] = Product.materialSubstitute; }
                                        }
                                        if (Product.userText) {
                                            var loftwaretext;
                                            try {
                                                let loftwaretextfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'userText';
                                                });
                                                loftwaretext = loftwaretextfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwaretext = '';
                                            }
                                            if (loftwaretext) { Variables[loftwaretext] = Product.userText; }
                                        }
                                        if (Product.location) {
                                            var loftwarelocation;
                                            try {
                                                let loftwarelocationfield = oFieldData.filter(function (item) {
                                                    return item.sapfield === 'location';
                                                });
                                                loftwarelocation = loftwarelocationfield[0].loftwarefield;
                                            } catch (error) {
                                                loftwarelocation = '';
                                            }
                                            if (loftwarelocation) { Variables[loftwarelocation] = Product.location; }
                                        }
                                        oLoftware.Variables.push(Variables);
                                    } else {
                                        continue;
                                    }
                                } catch (error) {
                                    oExecuteBusyModel.close();
                                }
                            };
                            if (oLoftware.Variables.length > 0) {
                                var oLoftwareJson = JSON.stringify(oLoftware);
                                try {
                                    var oResult = await that._sendprodlabels(sUrl, oLoftwareJson);
                                } catch (error) {
                                }
                                if (productLogs) {
                                    var oModel = this.getView().getModel("Entries");
                                    var oData = oModel.getData();
                                    console.log(oData);
                                    for (var i = 0; i < oData.length; i++) {
                                        let oProductNotFound = productnoFound.filter(function (product) {
                                            return product.ProductionOrder === oData[i].ProductionOrder && product.Material === oData[i].Material && product.SerialNumber === oData[i].SerialNumber;
                                        });
                                        if (oProductNotFound.length > 0) {
                                            oData[i].Status = oProductNotFound[0].Status;
                                            oData[i].Message = oProductNotFound[0].Message;
                                        } else {
                                            let existingProductData = oProductResults.filter(function (item) {
                                                return item.orderNo === oData[i].ProductionOrder && item.Material === oData[i].Material && item.serialNo === oData[i].SerialNumber;
                                            });
                                            if (existingProductData.length > 0) {
                                                oData[i].Status = productLogs[0].Status;
                                                oData[i].Message = productLogs[0].Message;
                                            } else {
                                                let sSelecteddata = oSelectedItemArray.filter(function (selected) {
                                                    return selected.ProductionOrder === oData[i].ProductionOrder && selected.Material === oData[i].Material && selected.SerialNumber === oData[i].SerialNumber;
                                                });
                                                if (sSelecteddata.length > 0) {
                                                    oData[i].Status = 'E';
                                                    oData[i].Message = 'Production Order serial numbers Data Not Found';
                                                } else {
                                                    oData[i].Status = '';
                                                    oData[i].Message = '';
                                                }
                                            }
                                        }
                                    }
                                    oModel.refresh();
                                    oFieldModel = this.getView().getModel("FieldProperty");
                                    oFieldModel.setProperty("/bHideColumn", true);
                                    oFieldModel.refresh();
                                    oExecuteBusyModel.close();
                                }
                            } else {
                                var oModel = this.getView().getModel("Entries");
                                var oData = oModel.getData();
                                for (var i = 0; i < oData.length; i++) {
                                    let oProductNotFound = productnoFound.filter(function (product) {
                                        return product.ProductionOrder === oData[i].ProductionOrder && product.Material === oData[i].Material && product.SerialNumber === oData[i].SerialNumber;
                                    });
                                    if (oProductNotFound.length > 0) {
                                        oData[i].Status = oProductNotFound[0].Status;
                                        oData[i].Message = oProductNotFound[0].Message;
                                    }
                                }
                                oModel.refresh();
                                oFieldModel = this.getView().getModel("FieldProperty");
                                oFieldModel.setProperty("/bHideColumn", true);
                                oFieldModel.refresh();
                                oExecuteBusyModel.close();
                            }

                        }
                    } catch {
                        MessageBox.warning("No Data Found for Orders to Print label!! Please try again");
                        oExecuteBusyModel.close();
                    }
                } else {
                    MessageBox.warning("No Orders selected to print labels");
                }
            } else {
                MessageBox.warning("No Loftware Configurations maintaned!! Please Configure");
            }

        },
        _getPlantprinters: async function (oModel, oFilters) {
            return new Promise((resolve, reject) => {
                oModel.read("/Printers", {
                    filters: oFilters,
                    urlParameters: { "$top": 5000 },
                    success: function (oData) {
                        var aPrinterDetails = oData.results;
                        if (aPrinterDetails.length > 0) {
                            resolve(aPrinterDetails[0].Printer);
                        } else {
                            resolve('');
                        }
                    },
                    error: function (oError) {
                        reject('');
                    }
                });
            });
        },
        _sendprodlabels: async function (sUrl, oLoftwareJson) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    type: "POST",
                    url: sUrl,
                    dataType: "json",
                    contentType: "application/json",
                    data: oLoftwareJson,
                    crossDomain: true,
                    headers: {
                        "Ocp-Apim-Subscription-Key": sToken
                    },
                    success: function (response) {
                        console.log("Success:", response);
                        resolve({ status: 'S', Message: 'Successfully' });
                        if (response) {
                            var sResponse = response.Response;
                        }
                        productLogs.push({ Status: 'S', Message: sResponse })
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        console.log("Error:", xhr);
                        reject({ status: 'E', Message: xhr.responseText });
                        try {
                            var message = JSON.parse(xhr.responseText);
                            var sMessage = message.Message;
                        } catch (error) {
                            var message = xhr.responseText;
                            var sMessage = message
                        }
                        if (sMessage) {
                            var aMessage = sMessage;
                        }
                        productLogs.push({ Status: 'E', Message: aMessage })
                    }
                });
            })
        },
        onExit: function(){
            var oProdVH = this.getView().byId('prodVHDialog');
            if(oProdVH){
                var oprodContent = oProdVH.getContent();
                oProdVH.destroyContent(oprodContent[0]);
                oProdVH.destroy();
                this.getView().byId('id_prodkey_text').destroy();
                this.getView().byId('id_proddesc_text').destroy();
            }
        }
    });
});
sap.ui.define([
    "sap/ui/core/UIComponent",
    "prodorders/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("prodorders.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: async function() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            var oModel = this.getModel();
            let oConfigData = await this._getConfiguration(oModel);
            if (oConfigData == '404') {
                MessageBox.warning("Loftware Configuration not maintained");
            } else {
                if (oConfigData.length > 0) {
                    var oConfigModel = this.getRootControl().getModel("configurationModel");
                    var configItems = [];
                    oConfigData.forEach(function (field) {
                        configItems.push({ fieldname: field.Name, value: field.Value });
                    });
                    oConfigModel.setData({ items: configItems });
                } else {
                    MessageBox.warning("Loftware Configuration not maintained");
                }
            }
            let oFieldData = await this._getLoftwareFields(oModel);
            if (oFieldData == '404'){
                MessageBox.warning("Loftware Fields not maintained");
            }else{
                if (oFieldData.length > 0) {
                    var ofieldModel = this.getRootControl().getModel("fieldMappingModel");
                    var fields = [];
                    oFieldData.forEach(function (field) {
                        fields.push({ sapfield: field.SapField, loftwarefield: field.LoftField });
                    });
                    ofieldModel.setData({ items: fields });
                } else {
                    MessageBox.warning("Loftware Fields not maintained");
                }
            }
        },
        _getConfiguration: async function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/Configuration", {
                    urlParameters: { "$top": 2000 },
                    success: function (oData) {
                        var aConfigData = oData.results;
                        if (aConfigData.length > 0) {
                            resolve(aConfigData);
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
        _getLoftwareFields: async function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/FieldMapping", {
                    urlParameters: { "$top": 2000 },
                    success: function (oData) {
                        var aFieldsData = oData.results;
                        if (aFieldsData.length > 0) {
                            resolve(aFieldsData);
                        } else {
                            resolve("404");
                        }
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        }
    });
});
/*global QUnit*/

sap.ui.define([
	"prodorders/controller/prodorders_view.controller"
], function (Controller) {
	"use strict";

	QUnit.module("prodorders_view Controller");

	QUnit.test("I should test the prodorders_view controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});

/*
 * enumerationWizard
 * 
 * Allows the user to select a column containing symbols or codes 
 * which they can expand by entering their expanded values within the 
 * wizard panel.
 * 
 */
var LinkedGov_enumerationWizard = {

		/*
		 * elmts: an object that contains the bound HTML elements for the
		 * nullValue wizard panel.
		 */
		vars : {
			elmts : {},
			symbolList : []
		},

		/*
		 * Builds the column objects and saves their RDF. 
		 */
		initialise : function(elmts) {

			var self = this;
			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}			self.vars.elmts = elmts;

			if (self.vars.elmts.enumerationSymbols.children("li").length > 0) {

				/*
				 * Display the "working..." sign
				 */
				LG.showWizardProgress(true);

				/*
				 * Attempt to nullify all missing values
				 */
				self.enumerateValues(self.buildSymbolList());

			} else {
				LG.alert("You need to select a column.");
			}

		},

		buildSymbolList: function(){

			var self = this;

			self.vars.elmts.enumerationSymbols.children("li").each(function(){
				if(!$(this).hasClass("skip") && $(this).find("input.textbox").val().length > 0){
					self.vars.symbolList.push({
						symbol:$(this).data("symbol"),
						enumVal:$(this).find("input.textbox").val()
					});
				}
			});

			return self.vars.symbolList;

		},

		/*
		 * nullifyValues
		 * 
		 * Perform a string-replace text-transform on all cells
		 */
		enumerateValues : function(symbolList) {

			var self = this;

			var valuesToEnumerate = '';
			var length = symbolList.length;
			var count = 0;

			for(var i=0;i<symbolList.length;i++){

				if(!$(this).hasClass("skip")){

					var symbol = symbolList[i].symbol;
					var enumeratedValue = symbolList[i].enumVal;

					LG.silentProcessCall({
						type : "POST",
						url : "/command/" + "core" + "/" + "mass-edit",
						data : {
							columnName : self.vars.elmts.enumerationSymbols.data("colName"),
							edits : '[{"from":['+symbol+'],"to":"'+enumeratedValue+'"}]',
							expression : 'value',
							engine : {"facets":[],"mode":"row-based"}
						},
						success : function() {
							if(count < length-1){
								count++;
							} else {
								self.onComplete();
							}
						},
						error : function() {
							self.onFail("A problem was encountered when replacing the values in the column: \""+ self.vars.elmts.enumerationSymbols.data("colName") + "\".");
						}
					});

				}
			}

		},

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {
			var self = this;
			LG.alert("Enumeration wizard failed.\n\n" + message);
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.enumerationBody);
			LG.showWizardProgress(false);
		},

		/*
		 * Returns the wizard to it's original state at the end of it's operations.
		 */
		onComplete : function() {
			var self = this;
			LG.panels.wizardsPanel.resetWizard(self.vars.elmts.enumerationBody);
			LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.enumerationBody);
			Refine.update({modelsChanged:true});
			LG.showWizardProgress(false);
		}

};

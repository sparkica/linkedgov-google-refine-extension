/*
 * columnsToRowsWizard
 * 
 * Rotates columns to rows (i.e. 24 columns labelled by the hour, rotated into
 * one column named "Time" with 24 values per every original row).
 * 
 * The user is asked to select the range of columns to rotate, from that the
 * following parameters are passed to the wizard:
 * 
 * a) startColName - The column name at the start of the range of columns b)
 * colCount - The number of columns in the range c) newColName - The name for
 * the new column (input by user)
 * 
 * 
 * Operation steps:
 * 
 * 1. initialise() Store global variables, set facet limit and check for blank
 * cells before beginning the operation.
 * 
 * 2. reorderColumns() If there are any gaps in the range of columns, we move
 * the columns to skip to the beginning of the range before transposing.
 * 
 * 3. transposeColumns() Transposes the range of column headers into one column,
 * with each cell using the global LinkedGov 'separator' variable and each
 * column's value.
 * 
 * 4. splitColumns() Splits the newly created column into two columns using the
 * global LinkedGov 'separator' variable.
 * 
 * 5. fillDownColumns() Fills in all the blank cells as a result of the rotate.
 * 
 */
var LinkedGov_columnsToRowsWizard = {

		vars : {
			startColName : "",
			newColName : "",
			colCount : 0,
			gapInRange : false,
			colsToSkip : [],
			elmts : {}
		},

		/*
		 * initialise
		 * 
		 * Fills any blank cells with null values before beginning the rotate
		 * operation.
		 */
		initialise : function(elmts) {

			var self = this;

			try{
				self.vars.historyRestoreID = ui.historyPanel._data.past[ui.historyPanel._data.past.length-1].id;
			}catch(e){
				self.vars.historyRestoreID = 0;
			}

			self.vars.elmts = elmts;
			var abort = false;

			if ($(elmts.columnsToRowsColumns).children("li").length > 0) {
				self.askUserForFirstColumnName();
			} else {
				LG.alert("You need to select a column to start from and a column to end at.\n\n"
						+ "If you need to unselect any column inbetween those columns, you can remove "
						+ "them from the list by clicking the red cross to the right of the column name.")
			}
		},
		
		
		askUserForFirstColumnName:function(){
			
			var self = this;
			
			// Ask the user to enter the name of the first new column
			LG.prompt({
				text:"Enter a name for the new column that summarises these columns",
				value:"",
				ok:function(value){
					if(typeof value == 'undefined' || value.length < 3){
						LG.alert("The name must be at least 3 characters long.");
						LG.showWizardProgress(false);
					} else {
						DialogSystem.dismissAll();
						self.vars.newColName = value;
						self.askUserForSecondColumnName();
					}
				},
				cancel: function(){
					DialogSystem.dismissAll();
					LG.showWizardProgress(false);
				}
			});
			
		},
		
		askUserForSecondColumnName:function(){
			
			var self = this;
			
			// Ask the user to enter the name of the second new column
			LG.prompt({
				text:"Now enter a name for the new column that will contain it's values",
				value:"",
				ok:function(value){
					if(typeof value == 'undefined' || value.length < 3){
						LG.alert("The name must be at least 3 characters long.");
						LG.showWizardProgress(false);
					} else {
						DialogSystem.dismissAll();
						self.vars.valColName = value;
						self.beginWizard();
					}
				},
				cancel: function(){
					DialogSystem.dismissAll();
					LG.showWizardProgress(false);
				}
			});
			
		},
		
		beginWizard:function(){
			
			var self = this;
			
			LG.showWizardProgress(true);
			
			// Recalculate which columns are going to be transposed, taking into
			// account any columns the user wants to skip.
			self.checkSkippedColumns();
			
			// Remove all RDF relating to the columns involved in the rotation 
			// operation as this will break their mappings.
			
			// TODO: This might need to be chained
			self.vars.elmts.columnsToRowsColumns.children("li").each(function(){
				//log("Removing RDF for: "+$(this).html());
				LG.rdfOps.removeColumnInRDF($(this).data("colName"));
			});

			/*
			 * Set any blank cells to null to protect them from being filled
			 * down into after the transpose operation (which produces blank
			 * cells).
			 * 
			 * Passing self.transpose() as a parameter calls it immediately for
			 * some reason.
			 */
			LG.ops.setBlanksToNulls(true,theProject.columnModel.columns,0,function() {
				/*
				 * If a gap has been detected, reorder the
				 * columns first.
				 */
				if (self.vars.gapInRange) {
					self.reorderColumns(Refine.columnNameToColumnIndex(self.vars.startColName),function() {
						self.transposeColumns();
					});
				} else {
					self.transposeColumns();
				}
			});
			
		},

		/*
		 * Recalculates the parameters for the transpose process such as how many
		 * columns to transpose, the start index and any columns to skip.
		 */
		checkSkippedColumns : function() {

			var self = this;
			var elmts = self.vars.elmts;

			/*
			 * Loop through the user's selected columns and trim any columns that
			 * have been marked as "skip" from the beginning and end.
			 */
			for ( var i = 0; i < $(elmts.columnsToRowsColumns).children("li").length; i++) {
				/*
				 * If a selected column has been removed, but was at the beginning,
				 * remove it from the array of columns.
				 */
				if ($($(elmts.columnsToRowsColumns).children("li")[i]).hasClass("skip") && i == 0) {
					$($(elmts.columnsToRowsColumns).children("li")[i]).remove();
					i--;
					/*
					 * If a selected column has been removed, but was at the end,
					 * remove it from the array of columns.
					 */
				} else if ($($(elmts.columnsToRowsColumns).children("li")[i]).hasClass("skip") 
						&& i == $(elmts.columnsToRowsColumns).children("li").length - 1) {
					$($(elmts.columnsToRowsColumns).children("li")[i]).remove();
					i--;
					i--;
				}
			}

			/*
			 * Once trimmed, the array should only contain columns to skip after and
			 * before the start and end columns, so reassess which columns need to
			 * be skipped and populate the "colsToSkip" array.
			 */
			for ( var j = 0, len = $(elmts.columnsToRowsColumns).children("li").length; j < len; j++) {
				if ($($(elmts.columnsToRowsColumns).children("li")[j]).hasClass("skip")) {
					self.vars.colsToSkip.push($($(elmts.columnsToRowsColumns).children("li")[j]).data("colName"));
					self.vars.gapInRange = true;
				}
			}

			/*
			 * Recalculate how many columns to transpose.
			 */
			self.vars.startColName = $(elmts.columnsToRowsColumns).children("li").eq(0).data("colName");
			self.vars.colCount = $(elmts.columnsToRowsColumns).children("li").length  - self.vars.colsToSkip.length;
		},

		/*
		 * reorderColumns
		 * 
		 * Recursive function.
		 * 
		 * In case there is a gap in the range of columns selected, the columns will
		 * have to be reordered before the transpose can begin.
		 * 
		 * Takes the index to start moving the columns to and a callback to call
		 * once complete.
		 * 
		 * Once complete, this should result in all "skipped" columns appearing to
		 * the left of the columns to transpose.
		 */
		reorderColumns : function(colIndex, callback) {

			var self = this;

			// log("reorderColumns");

			if (self.vars.colsToSkip.length > 0) {

				LG.silentProcessCall({
					type : "POST",
					url : "/command/" + "core" + "/" + "move-column",
					data : {
						columnName : self.vars.colsToSkip[0],
						index : colIndex,
					},
					success : function() {
						/*
						 * Increment the index to move the next column to.
						 * Remove the column that's just been moved from the
						 * "colsToSkip" array. Recurse.
						 */
						colIndex = colIndex + 1;
						self.vars.colsToSkip.splice(0, 1);

						self.reorderColumns(colIndex, callback);

					},
					error : function() {
						self.onFail("A problem was encountered when reordering the columns.");
					}
				});

			} else {
				/*
				 * Perform a model UI update (when columns change) and proceed to
				 * the next operation.
				 */
				Refine.update({
					modelsChanged : true
				}, callback);
			}
		},

		/*
		 * transposeColumns
		 * 
		 * Create a transpose config object using the wizard's global column name
		 * variables and posts it to Refine.
		 * 
		 */
		transposeColumns : function() {

			//log("transposeColumns");

			var self = this;

			/*
			 * Instead of using Refine.postCoreProcess(), we post the transpose
			 * process as a more silent "AJAX" call without the default UI update
			 * callbacks.
			 */

			LG.silentProcessCall({
				type : "POST",
				url : "/command/" + "core" + "/" + "transpose-columns-into-rows",
				data : {
					columnCount : self.vars.colCount,
					fillDown : true,
					ignoreBlankCells : true,
					keyColumnName: self.vars.newColName,
					startColumnName : self.vars.startColName,
					valueColumnName : self.vars.valColName,
				},
				success : function() {
					Refine.update({modelsChanged:true}, function(){
						self.onComplete();
					});
				},
				error : function() {
					self.onFail("A problem was encountered when transposing the columns.");
				}
			});

		},

		/*
		 * onFail
		 * 
		 * Alerts the user of the reason why the wizard failed and resets the wizard.
		 */
		onFail : function(message) {

			var self = this;
			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LG.ops.setBlanksToNulls(false, theProject.columnModel.columns, 0,function() {
				Refine.update({everythingChanged : true});
				LG.panels.wizardsPanel.resetWizard(self.vars.elmts.columnsToRowsBody);
				LG.showWizardProgress(false);
			});
		},

		/*
		 * onComplete
		 * 
		 * Sets any null values back to blank and performs a full update.
		 */
		onComplete : function() {

			var self = this;

			/*
			 * Reset any null cells to blanks again, using the "false" flag
			 */
			LG.ops.setBlanksToNulls(false, theProject.columnModel.columns, 0, function() {

				//log("Columns to rows wizard complete");
				Refine.update({everythingChanged:true},function(){
					// Refresh the content of the select inputs
					LG.panels.wizardsPanel.rangeSelector($(self.vars.elmts.columnsToRowsBody).find("div.range").find("select").eq(0));
					LG.panels.wizardsPanel.populateRangeSelector($(self.vars.elmts.columnsToRowsBody).find("div.range"), function(){
						$(self.vars.elmts.columnsToRowsBody).find("div.range").slideDown();					
						LG.panels.wizardsPanel.resetWizard(self.vars.elmts.columnsToRowsBody);
						LG.panels.wizardsPanel.showUndoButton(self.vars.elmts.columnsToRowsBody);
						LG.showWizardProgress(false);
					});
				});

			});

			return false;
		}

};

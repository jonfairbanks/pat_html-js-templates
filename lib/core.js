/**
 * @author : Everett Quebral <equebral@paypal.com>
 * @requires : ppbridge.js <https://github.paypal.com/equebral/MerchantHybridPrototype/blob/master/public/js/ppbridge.js>
 *
 * The Contract for Merchant to interact with the PayPal Client App
 *
 * NOTE: This version is specific to Jamba Juice
 * 
 * How To Use
 * 
 *  1.  Include this javascript into your page, after including the ppbridge.js
 *		<script src="ppbridge.js"></script>
 *		<script src="core.js"></script>
 *	2.  On the DOMReady Event, execute PayPalApp.call("MerchantTitleBar")
 *		this will set the Title Bar and the Left Button (Back) in the PayPal Client App
 * 	
 */
var PayPalApp = $.NativeBridge,
merchantConfig = {
	actions : {
		/**
		 * action for displaying the AlertView in the PayPal Client App
		 */
		"TableNotFound" : {
			func : "ShowAlert", 
			args : { 
				title : "Table Not Found", 
				message : "Please ask your server to link you with your bill.", 
				buttons : [{text : "OK", style :{}, type : "CANCEL" }]
			}
		},
		/**
		 * action for setting the TitleBar, Left Button (Back), the Right Button is disregarded because the PayPal Client App controls it
		 * when the back button is clicked, the PayPal Client App will call handler tag 3
		 */
		"MerchantTitleBar" : {
			func : "SetTitleBar",
			args : {
				LeftButton : {
					text : "Back",
					type : "BACK",
					tag  : 3
				}//,
				// Currently disregarded
				// RightButton : {
				//   text : "Local",
				//   type : "ORDINARY",
				//   tag : 1
				// }
			}
		},
		/**
		 * action for setting the TitleBar, Left Button (Back), Right Button is disregarded because the PayPal Client App controls it.
		 * when the back button is clicked, tha PayPal Client App will call handler tag 1
		 */
		"MerchantTitleBarBackToPP" : {
			func : "SetTitleBar",
			args : {
				LeftButton : {
					text : "Back",
					type : "BACK",
					tag  : 1
				}//,
				// Currently disregarded
				// RightButton : {
				//   text : "Local",
				//   type : "ORDINARY",
				//   tag : 1
				// }
			}
		},
		/**
		 * action for setting the TitleBar, Left Button (Back)
		 * additional setting is applied to the back button as it is disabled, it is being shown in PayPal Client App but not clickable
		 */
		 "MerchantTitleBarNoBack" : {
			func : "SetTitleBar",
			args : {
				LeftButton : {
					text : "Back",
					type : "BACK",
					style : {disabled:true},
					tag  : 1
				}
			}
		},
		"MerchantTitleBarDisabledBack" : {
			func : "SetTitleBar",
			args : {
				LeftButton : {
					text : "Back",
					type : "BACK",
					style : {disabled:true},
					tag  : 1
				}
			}
		},
		/**
		 * action for setting the TitleBar, Left Button (Back), Right Button is disregarded because the PayPal Client App controls it.
		 * when the back button is clicked, tha PayPal Client App will call handler tag 3
		 */
		"MerchantTabTitleBar" : {
		  func : "SetTitleBar",
			args : {
				WindowTitle : window.document.title,
				LeftButton : {
					text : "Boo",
					type : "BACK",
					tag  : 3
				}
			}
		},
		/**
		 * action to display the ActionSheet on the PayPal Client App
		 * when a button is clicked, the PayPal Client App will execute the callback handler function "PlaceOrderCB" in the callbacks object.
		 */
		"PlaceOrder" : {
			func : "ShowActionSheet",
			args : {
				title : "Please Confirm",
				buttons : [
					{text : "Place order", type : "DESTRUCTIVE"},
					{text : "CANCEL", type : "CANCEL"}
				]
			},
			cb : "PlaceOrderCB"
		},
		"SetPickupTime" : {
			func : "ShowTimePicker",
			args : {
				title : "Pickup Time"
			},
			cb : "PickupTime"
		},
		/**
		 * action to direct the PayPal Client App to go to the native page
		 */
		"GotoCheckinPage" : {
			func : "GotoPage",
			args : { page : "CheckIn" }
		}
	},
	handlers : {
		1 : function(e){
			return false;
			PayPalApp.call({func:"DismissWebView"});
		},
		2 : function(e){
			PayPalApp.call({
				func:"GotoPage",
				args : { page : "MerchantDetailsPage"}
			});
		},
		3 : function(e){
		  if ($('#home').is(":visible")) {
				PayPalApp.call({func:"DismissWebView"});
		  }else{
				$.mobile.back();
		  }
		}
	},
	callbacks : {
		"PlaceOrderCB" : function(index){
			if (index.data == 0){
				PayPalApp.call("GotoCheckinPage");
			}
		},
		"PickupTime" : function(data){
			var pickupTime = $("time")[0];
			pickupTime.innerHTML = data.time;
		}
	}
};

// Initialize the actions, handlers and callbacks



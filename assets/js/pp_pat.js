//************************************************************//
//******** PayPal - Pay at Table Templates | V1 **************//
//************************************************************//
//************************************************************//
//*************** Developed By: Ryan May *********************//
//************************************************************//
//******************** Jan/20/2014 ***************************//
//************************************************************//
//************** Revised By: Jon Fairbanks *******************//
//************************************************************//
//******************** Oct/30/2014 ***************************//
//************************************************************//


//******** Lets first declares some Global Variables we can use across the pay-at-table templates. ****///
var partner_name = 'Nommio';
var LOAD, //Use this variable to track the specifics of this template load.
PARTNER, //use this global var to hold the partner details.
MERCHANT, //use this global var to hold merchant details
POLL, //object that holds what we are polling
POLL_INTERVAL, // object that will save the interval
INVOICE, //use this global var to hold invoice
CHART, //Object that holds the split bill pie chart
SPLIT = false,  //Used if the user chooses to split a bill.
SPLIT_TYPE = 'amount',
SPLIT_AMOUNT = 0,
SPLIT_ITEM = 0,
list_loaded = false,
click_event = 'vclick', //the type of click event for buttons ect.
monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
//********* End Global Variable Declaration **********//

var SPLIT_ARRAY = new Array();

//******* Initialize the Templates *******//
initializeTemplates();
//******* End Initialization *******//

//Javascript that gets called when the Welcome Page first gets initiatilized
$(document).on('pageinit', '#home',  function(){

	//initialize the PayPal bridge
	PayPalApp.init(merchantConfig); 

	//set no back bar
	PayPalApp.call("MerchantTitleBarNoBack");

	$("#table-number-form").on('submit', function(e){
		
		e.preventDefault() //stop the form from submitting in a traditional way.

		//Get the submitted table number
		var table_num = $("#table-number-input").val();

		paypal_track_event('home', 'Table Number Form Submitted', table_num);

		$.mobile.loading('show');

		if(PARTNER.partner.demoMode){ //if demo, simulate
			//lets see if the invoice exists, 
			$.getJSON( "objects/table_"+table_num+".json", function(data) {

				if(typeof data.table !== 'undefined'){
					INVOICE = data.table;
					setTimeout("show_bill(INVOICE);", 1500);
				}else{
					alert('No Table Object found in this json')
				}
	
			}).fail(function() {
				alert("Sorry that table number does not have an invoice. In this Demo use 12 or 22");
				$.mobile.loading('hide');
			}).always(function() {
				//always
				$("#table-number-input").val('');
			});
		}else{ //otherwise we actually need to post off to the server to check
			var bind_url = LOAD['req_tableBind'].replace('{table_id}', table_num);
			$.ajax(bind_url, {dataType: PARTNER.partner.req_dataType}).success(function(data){
				
				var this_response = JSON.stringify(data);

				if(typeof data.table !== 'undefined'){
					INVOICE = data.table;
					show_bill(INVOICE);

					//From now on Poll with the table_id
					POLL['request'] = bind_url;
					POLL['last_response'] = this_response;

				}else{
					$.mobile.loading('hide');
					if(!PayPalApp.call("TableNotFound")){
						alert('Sorry that table was not found.  Please ask your server to link you with your bill.');
					}
					
				}

		    }).fail(function(error, data, type){
		        	alert("Failed to get merchant information from "+ PARTNER.partner.name + " - " + data + ": " + type + ".");
		    });


		}

		return false;
	});

}); 



$(document).on('pagebeforehide', '#home',  function(){
	//each time we leave the home page, allow the back button.
	PayPalApp.call("MerchantTitleBar");
});



$(document).on('pageinit', '#bill',  function(){
	
	$('.confirm-button').on(click_event, function(){

		$.mobile.changePage("#tip", {
		        transition: "slide",
		        reverse: false
			});
	});

	$('#split_amount-button').on(click_event, function(){

		if(!PARTNER.partner.billSplitBySeat){ //only split by item if we dont split by seat.
			load_item_split(INVOICE);
		}else{

		}

		$.mobile.changePage("#split", {
		        transition: "slide",
		        reverse: false
			});
	});

	$('#split_seat-button').on(click_event, function(){



		$.mobile.changePage("#split_seat", {
		        transition: "slide",
		        reverse: false
			});

		load_split_by_seat(INVOICE);

	});
	$('#split_evenly-button').on(click_event, function(){


		$.mobile.changePage("#split_evenly", {
		        transition: "slide",
		        reverse: false
			});
	});

});


$(document).on('pageinit', '#split',  function(){

	$('#split-slider').change(function(){

		var my_amount = parseFloat($(this).val());
		SPLIT_AMOUNT = SPLIT = my_amount;
		$('.grand_total').text(format_cash(SPLIT));

	});

	$("#split-slider").on("slidestop", function (event) {

		var my_amount = parseFloat($(this).val());
		var already_paid = INVOICE.PaymentByOtherMeans;
		var grand_total = INVOICE.total;
		var remains = grand_total - my_amount - already_paid;
		
		CHART.series[0].data[0].update( y = my_amount, name = "new name");
		CHART.series[0].data[1].update(y = remains);

		SPLIT_AMOUNT = SPLIT = my_amount;

		paypal_track_event('split:amount', 'slidestop', SPLIT_AMOUNT);

	});


	$('#split .split-type-btn').on(click_event, function(e){

		e.preventDefault;

		var want_to_see = $(this).attr('id').split('_')[1];

		if(!$('#split-by-'+want_to_see).is(":visible")){ //only swap out if its not visible already
			$('#split .split-method').slideUp('slow', function(){$('#split-by-'+want_to_see).slideDown('slow');});
			SPLIT_TYPE = want_to_see;
			if(want_to_see == 'amount'){
				$('.grand_total').text(format_cash(SPLIT_AMOUNT));
			}else{
				$('.grand_total').text(format_cash(SPLIT_ITEM));
			}
		}

		paypal_track_event('tip:'+want_to_see);

	});


	$('.split-item-group').change(function(){

		//figure out which item changed
		var item_id = $(this).attr('id').split("_")[1];
		var split_val = $(this).find($(":checked")).val();
		//set the icons back to balck except the new one.
		$('#label-item_'+item_id+'-0 img').attr('src', 'assets/img/icons/black-icon-pie-0.png');
		$('#label-item_'+item_id+'-25 img').attr('src', 'assets/img/icons/black-icon-pie-25.png');
		$('#label-item_'+item_id+'-50 img').attr('src', 'assets/img/icons/black-icon-pie-50.png');
		$('#label-item_'+item_id+'-100 img').attr('src', 'assets/img/icons/black-icon-pie-100.png');
		$('#label-item_'+item_id+'-'+split_val+' img').attr('src', 'assets/img/icons/white-icon-pie-'+split_val+'.png');

		//Get the price of this row
		var row_price = parseFloat($('#split-item-row_'+item_id).attr('data-price'));
		var my_price = row_price * (parseFloat(split_val)/100);
		if(split_val > 0){
			$('#item_'+item_id+'-my-price').addClass('green');
		}else{
			$('#item_'+item_id+'-my-price').removeClass('green');
		}
		$('#item_'+item_id+'-my-price').text(format_cash(my_price));

		calculate_split_total();

	});

	list_loaded = false;

});

$(document).on('pageshow', '#split',  function(){

	if(!SPLIT){
		SPLIT_AMOUNT = SPLIT = (INVOICE.total - INVOICE.PaymentByOtherMeans)  / 2;
		$('#split-slider').val(SPLIT);
		$('.grand_total').text(format_cash(SPLIT));
	}

	$('#split-by-'+SPLIT_TYPE).addClass('ui-btn-active');

	var start_up_data = new Array();
	start_up_data[0] = {name: 'You',   y: SPLIT, color: '#0079c1'};
    start_up_data[1] = {name: 'Remains',  y: INVOICE.total - SPLIT - INVOICE.PaymentByOtherMeans, color: '#d0d0d0'};
    
    if(INVOICE.PaymentByOtherMeans){  //only add payments to the wheel if there is some.
    	start_up_data[2] = {name: 'Paid', y: INVOICE.PaymentByOtherMeans, color: '#6db33f'};
	}

	$('#container').highcharts({
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: 0,
            plotShadow: false
        },
        credits: {
			enabled: false
		  },
        title: {
            text: 'Bill Total<br/>'+format_cash(INVOICE.total),
            align: 'center',
            style: {
	            fontFamily: 'Helvetica, Arial, Sans-Serif',
	            fontWeight: '100',
	            fontSize: '20px',
       		},
            verticalAlign: 'middle',
            y: -5
        },
        tooltip: {enabled: false},
        plotOptions: {
            pie: {
                dataLabels: {
                    enabled: true,
                    useHTML: true,
                    formatter: function(){
                    	var color = '#333333';
                    	if(this.point.name == 'You'){
                    		var name = '<img src="https://pics.paypal.com/00/s/MjAwWDIwMA==/z/57oAAOxytBZSQOxX/$T2eC16FHJIQFHHjSU75cBSQO)(D3(w~~60_2.JPG" width="50" style="border:1px solid #d0d0d0; border-radius:25px;" />';
                    	}else{
                    		name = this.point.name+':';
                    	}
                    	return '<span style="text-shadow:none;text-align:center;color:'+color+';">'+name+'</span><br><span style="text-shadow:none;text-align:center;color:'+color+';">'+format_cash(this.y)+'</span>';
                    },
                    connectorColor: '#000000',
                    style: {
                        fontWeight: '200',
                        fontSize: '14px',
                        color: 'white',
                        verticalAlign: 'middle',
                        fontFamily: 'Helvetica, Arial, Sans-Serif'
                    }
                },
                startAngle: -155,
                endAngle: 155,
                center: ['50%', '50%']
            }
        },
        series: [{
            type: 'pie',
            name: 'Split Bill',
            innerSize: '45%',
            data: start_up_data
        }]
    });

	CHART =  $('#container').highcharts();

}); 


$(document).on('pageinit', '#tip',  function(){
	
	$('.tip-button').on(click_event, function(){

		//Figure out what percentage this button is.
		var tip_percent = parseFloat($(this).attr('data-tip-percent'));

		if(!SPLIT){		
			if(MERCHANT.merchant.calculate_tip_including_tax){
				var tip_base = INVOICE.total-INVOICE.PaymentByOtherMeans;
			}else{
				var tip_base = INVOICE.sub_total-INVOICE.PaymentByOtherMeans;
			}

			var tip_total = parseFloat((tip_base * (tip_percent/100)).toFixed(2));

			var new_grand_total = parseFloat(tip_total + INVOICE.total - INVOICE.PaymentByOtherMeans);
		
		}else{
			var tip_base = SPLIT;
			var tip_total = parseFloat((tip_base * (tip_percent/100)).toFixed(2));
			var new_grand_total = parseFloat(tip_total + SPLIT);
		}
		INVOICE.tip = tip_total;

		$('.final_total').text(format_cash(new_grand_total));
		$('.tip_total').text(format_cash(tip_total));
		$('.tip-button').removeClass('active');
		$(this).addClass('active');

		paypal_track_event('tip', 'tipbutton', tip_percent+'%');

	});

	$('#other-tip-amount').blur(function(){

		$('.tip-button').removeClass('active');

		if($(this).val() == ''){
			tip_total = 0;
		}else{
			var tip_total = parseFloat($(this).val());
		}
		if(SPLIT){
			var new_grand_total = parseFloat(tip_total + SPLIT);
		}else{
			var new_grand_total = parseFloat(tip_total + INVOICE.total - INVOICE.PaymentByOtherMeans);
		}

		INVOICE.tip = tip_total;
		$('.final_total').text(format_cash(new_grand_total));
		$('.tip_total').text(format_cash(tip_total));

		paypal_track_event('tip', 'tipcustom', tip_total);

	});


	$('#pay-button').on('click', function(){


		$.mobile.loading( 'show', {
			text: 'Processing Payment',
			textVisible: true,
			theme: 'd',
			textonly: false, 
			html: '<div style="padding:30px;"><p style="text-align:center;"><img src="assets/img/icons/paypal-loader.gif"</p><h1>Processing Payment</h1></div>'
		});


		if(!SPLIT){ // use the full table payload

			var payment_payload = {
				'payment[party_id]' : INVOICE.id,
				'payment[sub_total]' : parseFloat(INVOICE.sub_total).toFixed(2),
				'payment[tax]' : parseFloat(INVOICE.tax_total).toFixed(2),
				'payment[total]' : parseFloat(INVOICE.total).toFixed(2),
				'payment[tip]' : INVOICE.tip,
				'payment[type]' : 'TablePayment',
				'pp_customer_id' : LOAD['pp_customer_id'], 
				'pp_tab_id' : LOAD['pp_tab_id'] 
			}

		}else if (SPLIT_TYPE == 'SeatPayment'){

			var payment_payload = {
				'payment[party_id]' : INVOICE.id,
				'payment[sub_total]' : parseFloat(SPLIT_ARRAY['sub_total']).toFixed(2),
				'payment[tax]' : parseFloat(SPLIT_ARRAY['tax_total']).toFixed(2),
				'payment[total]' : parseFloat(SPLIT_ARRAY['grand_total']).toFixed(2),
				'payment[tip]' : INVOICE.tip,
				'payment[type]' : 'SeatPayment',
				'pp_customer_id' : LOAD['pp_customer_id'], 
				'pp_tab_id' : LOAD['pp_tab_id'] 
			}
			$.each(SPLIT_ARRAY['seats'], function(key, value) {
				payment_payload["payment[seats_attributes]["+key+"][id]"] = value
			});

		}else if (SPLIT_TYPE == 'evenly'){

			var payment_payload = {
				'payment[party_id]' : INVOICE.id,
				'payment[sub_total]' : parseFloat(SPLIT_ARRAY['sub_total']).toFixed(2),
				'payment[tax]' : parseFloat(SPLIT_ARRAY['tax_total']).toFixed(2),
				'payment[total]' : parseFloat(SPLIT_ARRAY['grand_total']).toFixed(2),
				'payment[tip]' : INVOICE.tip,
				'payment[type]' : 'TablePayment',
				'pp_customer_id' : LOAD['pp_customer_id'], 
				'pp_tab_id' : LOAD['pp_tab_id'] 
			}

		}

		if(PARTNER.partner.demoMode){ //just simulate processing time and show success page.

			setTimeout("show_success(); $.mobile.loading('hide');", 3500);

		}else{ //send the payment information off to Partner

			$.ajax(LOAD['req_tablePay'], {
				type: "POST",
				timeout:15000,
				crossDomain: true,
				data: payment_payload,
				dataType: PARTNER.partner.req_dataType
				}).success(function(data){
						show_success();
						$.mobile.loading('hide');
				}).error(function(jqXHR, textStatus, errorThrown){
					if(jqXHR.responseText !== undefined){
						alert(errorThrown+" | Response: "+jqXHR.responseText);
					}else{
						alert(errorThrown+" | Sorry we were unable to process your payment. Please try again later.");
					}
					$.mobile.loading('hide');
				});
		}

	});

});

$(document).on('pageinit', '#split_evenly', function(){

	$('.split-even-button').on(click_event, function(){

		$('.split-even-button').removeClass('active');
		//Figure out what percentage this button is.
		var split_by_num = parseFloat($(this).attr('data-split-by'));
		$(this).addClass('active');

		SPLIT_TYPE  =  'evenly';

		SPLIT_ARRAY['sub_total'] =  (INVOICE.sub_total / split_by_num).toFixed(2);
		SPLIT_ARRAY['tax_total'] =  (INVOICE.tax / split_by_num).toFixed(2);
		SPLIT = SPLIT_ARRAY['grand_total'] =  parseFloat(SPLIT_ARRAY['sub_total'])+parseFloat(SPLIT_ARRAY['tax_total']);

		$('.grand_total').text(format_cash(SPLIT));
		$('.shared_tax').text(format_cash(SPLIT_ARRAY['tax_total']));
		$('.shared_sub').text(format_cash(SPLIT_ARRAY['sub_total']));

	});

	$('#split-evenly-custom').blur(function(){

		$('.split-even-button').removeClass('active');

		if($(this).val()){
			SPLIT = $(this).val();
			$('.grand_total').text(format_cash(SPLIT));
		}else{
			SPLIT_ITEM = 0;
			$('.grand_total').text(format_cash(INVOICE.total));
		}


	});


});


$(document).on('pageshow', '#tip',  function(){
	if(SPLIT){
		$('#final-total-text').text('Your total');
	}else{
		$('#final-total-text').text('Bill total');
	}
});






function show_bill(invoice){

	//remove potentiallly existing item rows
	$('tr.item-row').remove();

	//Set the table numbers
	$('.big-num').text(invoice.table_name);

	//load up the items
	var row_position = 1;
	var sub_total = 0;
	var tax_total = 0;
	var paid_total = 0;

	if(typeof invoice.seats !== 'undefined'){ //this partner is providing seat level data.

		if(typeof invoice.shared_items !== 'undefined'){
			if (invoice.shared_items.length > 0){ //If there is items on the seat show a divider.
				var seat_row = '<tr class="item-row seat-row"><td colspan="3">Shared Items: </td></tr>';
				$('#bill-table tr.first-sub-row').before(seat_row);
			}
		}

		$.each( invoice.shared_items , function(key, item ) {

			//calculate line total
			var line_total =parseFloat(item.unit_price*item.qty);

			//add row to table in html
			var table_row = '<tr class="item-row"><td class="qty-col">'+item.qty+'</td><td class="desc-col">'+item.name+'</td><td class="price-col">'+format_cash(line_total)+'</td></tr>';
			$('#bill-table tr.first-sub-row').before(table_row);
			
			//TODO: Temp patch for TB Demo.
	    	if(typeof item.taxRate == 'undefined'){
	    		item.taxRate = 13;
	    	}
	    	if(MERCHANT.merchant.prices_include_tax){
	    		tax_total += parseFloat((line_total -(line_total / (1+(item.taxRate/100)))).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}else{
	    		tax_total += parseFloat((line_total*(item.taxRate/100)).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}

	    	//add up sub total
	    	sub_total += parseFloat((item.unit_price*item.qty).toFixed(2));

		});

		//now loop through the seats
		var seat_count = 1;
		$.each( invoice.seats , function(key, seat) {

			
			if(typeof seat.items !== 'undefined'){
				if(typeof seat.pp_customer_id !== 'undefined'){ //somone is on this seat.
					var seat_label = '<img src="'+seat.customer_photo_url+'" height="30px" style="" /> &nbsp;'+ seat.customer_name;
				}else{
					var seat_label = 'Seat #'+seat_count+':';
				}
				var seat_row = '<tr class="item-row seat-row"><td class="seat-'+seat_count+'"colspan="3">'+seat_label+'</td></tr>';
				$('#bill-table tr.first-sub-row').before(seat_row);
			}


			seat_count +=1;

			$.each( seat.items , function(key, item ) {
				//calculate line total
				var line_total =parseFloat(item.unit_price*item.qty);

				//add row to table in html
				var table_row = '<tr class="item-row"><td class="qty-col">'+item.qty+'</td><td class="desc-col">'+item.name+'</td><td class="price-col">'+format_cash(line_total)+'</td></tr>';
				$('#bill-table tr.first-sub-row').before(table_row);
				
				//TODO: Temp Patch for TB Demo
		    	if(typeof item.taxRate == 'undefined'){
		    		item.taxRate = 13;
		    	}

				//calculate tax total in one of 2 ways
				if(typeof item.taxRate == 'undefined'){
	    			tax_total += 0;
	    		}else if(MERCHANT.merchant.prices_include_tax){
		    		tax_total += parseFloat((line_total -(line_total / (1+(item.taxRate/100)))).toFixed(2)); //Had to add this hard round because PayPal Does.
		    	}else{
		    		tax_total += parseFloat((line_total*(item.taxRate/100)).toFixed(2)); //Had to add this hard round because PayPal Does.
		    	}

		    	//add up sub total
		    	sub_total += parseFloat((item.unit_price*item.qty).toFixed(2));
		    });

		});


		//Lets check if there is split limitations at this time.
		if(typeof invoice.shared_items !== 'undefined'){

		}


	}else{ //likely just item level data


		$.each( invoice.items , function(key, item ) {

			//calculate line total
			var line_total =parseFloat(item.unitPrice*item.quantity);

			//add row to table in html
			var table_row = '<tr class="item-row"><td class="qty-col">'+item.quantity+'</td><td class="desc-col">'+item.name+'</td><td class="price-col">'+format_cash(line_total)+'</td></tr>';
			$('#bill-table tr.first-sub-row').before(table_row);
			
			//calculate tax total in one of 3 ways
	    	if(MERCHANT.merchant.prices_include_tax){
	    		tax_total += parseFloat((line_total -(line_total / (1+(item.taxRate/100)))).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}else{
	    		tax_total += parseFloat((line_total*(item.taxRate/100)).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}

	    	//add up sub total
	    	sub_total += parseFloat((item.unitPrice*item.quantity).toFixed(2));

		});
	}

	if(typeof INVOICE.PaymentByOtherMeans != "undefined"){
		paid_total = INVOICE.PaymentByOtherMeans;
		$('.paid-row').show();
		$('.paid_total').text(format_cash(paid_total));
	}else{
		paid_total = INVOICE.PaymentByOtherMeans = 0;
		$('.paid-row').hide();
	}




	//Patch for if pre-calculated tax was supplied in the response
	if(typeof INVOICE.tax !== undefined){
		tax_total = parseFloat(INVOICE.tax);
	}

	if(PARTNER.partner.billSplit){  //lets show the correct bill splitting options based on partner settings

		if(typeof INVOICE.seats !== 'undefined'  && PARTNER.partner.billSplitBySeat){
			$('#split_seat-button').show();
			$('#split_amount-button').hide();
		}else{
			$('#split_seat-button').hide();
			$('#split_amount-button').show();
		}

	}else{ //everything is on.
		$('.split-feature').hide();
		$('#pay_full_button').show();
		$('#pay_sorry').hide();

	}

	
	INVOICE.total = sub_total + tax_total;

	//add the totals to the view
	$('.sub_total').text(format_cash(sub_total));
	$('.tax_total').text(format_cash(tax_total));
	$('.grand_total').text(format_cash(INVOICE.total - paid_total));

	INVOICE.sub_total = sub_total;
	INVOICE.tax_total = tax_total;

	//Set the Bill Split Slider Range
	SPLIT = false; //clear potentially alreay existing splits.
	$('#split-slider').attr('max' , (invoice.total - paid_total));
	$('#split-slider').attr('value', (invoice.total - paid_total) / 2);
	SPLIT_AMOUNT = ((invoice.total - paid_total) / 2);

	$.mobile.changePage("#bill", {
        transition: "slide",
        reverse: false
	});
}

function load_item_split(invoice){

	//remove potentiallly existing item rows
	$('.split-item-li').remove();


	//load up the items
	var row_position = 1;
	var sub_total = 0;
	var tax_total = 0;
	var paid_total = 0;

	$.each( invoice.items , function(key, item ) {

		//calculate line total
		var line_total =parseFloat(item.unitPrice*item.quantity);


		var item_row = '<li id="split-item-row_'+row_position+'" class="split-item-li" data-price="'+line_total+'" data-taxRate="'+item.taxRate+'">';
		item_row += '<div class="ui-grid-a">';
		item_row += '<div class="ui-block-a"><h2>'+item.name+'</h2><p>'+format_cash(line_total)+'</p></div>';			
		item_row += '<div class="ui-block-b">';
							
		item_row += '<fieldset id="split-item_'+row_position+'" class="split-item-group" data-role="controlgroup" data-type="horizontal" data-mini="true" style="float:right;margin-left:10px;" >';
		item_row += '<input data-theme="c" type="radio" name="item_'+row_position+'" id="item_'+row_position+'-100" value="100" />';
		item_row += '<label id="label-item_'+row_position+'-100" for="item_'+row_position+'-100">';
		item_row += '<img alt="1/1" height="16" src="assets/img/icons/black-icon-pie-100.png" />';
		item_row += '</label>';

		item_row += '<input data-theme="c" type="radio" name="item_'+row_position+'" id="item_'+row_position+'-50" value="50"  />';
		item_row += '<label id="label-item_'+row_position+'-50" for="item_'+row_position+'-50">';
		item_row += '<img alt="1/2" height="16" src="assets/img/icons/black-icon-pie-50.png" />';
		item_row += '</label>';

		item_row += '<input data-theme="c" type="radio" name="item_'+row_position+'" id="item_'+row_position+'-25" value="25"  />';
		item_row += '<label id="label-item_'+row_position+'-25" for="item_'+row_position+'-25">';
		item_row += '<img alt="1/4" height="16" src="assets/img/icons/black-icon-pie-25.png" />';
		item_row += '</label>';

		item_row += '<input data-theme="c" type="radio" name="item_'+row_position+'" id="item_'+row_position+'-0" value="0" checked="checked"  />';
		item_row += '<label id="label-item_'+row_position+'-0" for="item_'+row_position+'-0">';
		item_row += '<img alt="0" height="16" src="assets/img/icons/white-icon-pie-0.png" />';
		item_row += '</label>';
		item_row += '</fieldset>';

		item_row += '<div class="price-container" style="float:right;clear:both;margin:19px 0 0;"><p>Your Share: <span id="item_'+row_position+'-my-price">$0.00</span></p></div>';

		item_row += '</div>';
		item_row += '</div><!-- /grid-a -->';
		item_row += '</li>';



		$('#split-taxes-row').before(item_row);
		
		row_position ++;
    	//add up sub total
    	sub_total += parseFloat((item.unitPrice*item.quantity).toFixed(2));

	});
	
	if(list_loaded){
		$('#split-by-item').listview('refresh');
		$('.split-item-group').trigger('create');
	}


}

function calculate_split_total(){

	var your_total = 0;
	var your_tax = 0;

	$('.split-item-li').each(function(){

		var row_price = parseFloat($(this).attr('data-price'));
		var row_tax_rate = parseFloat($(this).attr('data-taxRate'));
		var pay_percent = parseFloat($(this).find($(":checked")).val());

		your_total += row_price * (pay_percent / 100);
		// TODO Add included tax amount calculation.
		your_tax += (row_price * (pay_percent / 100)) * (row_tax_rate / 100)

	});

	SPLIT_ITEM = SPLIT = (your_total + your_tax);

	$('.grand_total').text(format_cash(SPLIT_ITEM));
	$('#shared-tax').text(format_cash(your_tax));

}


function show_success(){
	
	$.mobile.loading('hide');

	$.mobile.changePage("#success", {
        transition: "slide",
        reverse: false
	});


	//put the current date time on the page.
	var n = new Date();
	var day=n.getDate();
	var month=n.getMonth();
	var year=n.getFullYear();
	var hour=n.getHours();
	var min=n.getMinutes();
	var sec=n.getSeconds();
	var date= monthNames[month]+" "+day+", "+year+"  @ "+hour+":"+min+":"+sec;
	$('.current_date').text(date);

	//set no back bar
	PayPalApp.call("MerchantTitleBarNoBack");

}



function format_cash(amount){

	var float_num = parseFloat(amount);

	c = 2, //how many decimal places
    d = MERCHANT.locale.decimal == undefined ? "." : MERCHANT.locale.decimal,  //decimal character
    t = MERCHANT.locale.thousands == undefined ? "," : MERCHANT.locale.thousands,  //thousands character
    s = float_num < 0 ? "-" : "", //negative or positive
    i = parseInt(float_num = Math.abs(+float_num || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
    
    //Format this all up
    formatted_num = s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(float_num - i).toFixed(c).slice(2) : "");

    if(MERCHANT.locale.currency_symbol_after_number){  
    	formatted_num += ' '+MERCHANT.locale.currency_symbol.trim(); //The currency symbol goes after and trim the whitespace out
    }else{
    	formatted_num = MERCHANT.locale.currency_symbol + formatted_num; // The Currency Symbol goes before
    }

    return formatted_num;
}

function paypal_track_event(page_name, action, action_value){

	//This is the top level group for the flow:
	fpti.pgrp = "mobile:eci:pay@table:v1:"+page_name;

	//If there is an action lets add this to the page_name as a sub-page
	if(typeof action !== 'undefined'){
    	page_name += ':'+action
	};

	//If there is an action lets add this to the page_name as a sub-page
	if(typeof action_value !== 'undefined'){
    	page_name += '|'+action_value;
    	fpti.actnval = action_value;
	};

	//We will always have a page_name do lets add this now.
	fpti.page = fpti.pgrp+'::'+partner_name+':'+page_name;


	//Other Failry Fixed variables I will assign Dynamically in the future, here or in other callbacks.
	//fpti.ccpg = "usa";
	fpti.msid = LOAD['pp_location_id'];
	fpti.cust = LOAD['pp_customer_id'];
	//fpti.mrch = "PP Mrchant ID";
	fpti.ptab = LOAD['pp_tab_id'];
	fptiserver = "//t.paypal.com/ts";

	PAYPAL.pta = PAYPAL.analytics.setup();
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


function initializeTemplates(){


	//check if the parnter set tha partner parama in the ECI url, if so grab that json file
	if(getParameterByName('partner')){
		var partner_config_json = "objects/partner_config_"+getParameterByName('partner')+".json?v2";
	}else{
		var partner_config_json = "objects/partner_config.json?v2";
	}


	$.getJSON(partner_config_json).done(function( json ) { //if it worked
		
		//Load the partner information into the Partner Variable.
		PARTNER = json;

		//*** We now need to figure out the merchant details.
		// Get the parnters merchant identifier, MUST BE passed in through the enchanced check-in URL
		LOAD = new Array();
		LOAD['partner_merchant_id'] = getParameterByName('merchant_id');
		LOAD['pp_customer_id'] = getParameterByName('customer_id');
		LOAD['pp_location_id'] = getParameterByName('location_id');
		LOAD['pp_tab_id'] = getParameterByName('tab_id');


		LOAD['table_numbers_on'] = getParameterByName('table_num');

		//Build the request url
		LOAD['req_tableStatus'] = PARTNER.partner.req_tableStatus.replace('{merchant_id}', LOAD['partner_merchant_id']).replace('{pp_customer_id}', LOAD['pp_customer_id']);
		LOAD['req_tableBind'] = PARTNER.partner.req_tableBind.replace('{merchant_id}', LOAD['partner_merchant_id']).replace('{pp_customer_id}', LOAD['pp_customer_id']);
		LOAD['req_tablePay'] = PARTNER.partner.req_tablePay.replace('{merchant_id}', LOAD['partner_merchant_id']).replace('{pp_customer_id}', LOAD['pp_customer_id']);

		POLL = new Array();

		//lets go through some of the configuration oprions

		if(!PARTNER.partner.billSplit){ //This Partner Does not Support Bill Splitting.
			$('.split-feature').hide();
		}

		if(!PARTNER.partner.tableNumberBinding){ //This Partner Does not Support Table
			$('.tableNum-feature').hide();
		}

		if(LOAD['table_numbers_on'] === 0){
			$('.tableNum-feature').hide();
		}
		
		//function that will fire on every page show to track now that we know the partner info.
		$(document).on("pageshow",function(event){
			var page_id = $.mobile.activePage.attr('id'); //get the ID
			paypal_track_event(page_id); //Track it with PayPal
		});


		if(PARTNER.partner.demoMode){ //Grab the sample object
			$.getJSON( "objects/merchant_config.json" ).done(function( data ) {
				MERCHANT = data;
				$('.merchant_title').text(MERCHANT.merchant.title); //set merchant name text everywhere

				$('.welcome-header').text("Welcome!"); //update the loading text.
				$('.hide-on-load').hide();
				$('.show-on-load').show();

				//track this load
				paypal_track_event('home');

			});
		}else{ //we have to query the merchant server
			$.ajax(LOAD['req_tableStatus'], {timeout: 10000, dataType: PARTNER.partner.req_dataType}).done(function(data){

				if(typeof data.merchant !== 'undefined'){
					MERCHANT = data;
					
					$('.merchant_title').text(MERCHANT.merchant.title); //set merchant name text everywhere

					$('.welcome-header').text("Welcome!"); //update the loading text.
					$('.hide-on-load').hide();
					$('.show-on-load').show();

					//track this load
					paypal_track_event('home');

					//setup polling information.
					POLL['now'] = true;
					POLL['request'] = LOAD['req_tableStatus'];
					POLL['interval'] = PARTNER.partner.poll_statusRate;
					POLL['last_response'] = JSON.stringify(data);
					POLL_INTERVAL = window.setTimeout(check_for_updates, POLL['interval']);

					if(typeof data.customers !== 'undefined'){ //This is using customer Codes
						$(".customerCode-Hide").hide();
						$(".customerCode-Feature").show();
						//put the first customers code in the container for display:
						$('#customer_code_container').text(data.customers[0].customer_code);
					}


					if(typeof data.table !== 'undefined'){ //This user has already been binded to a table
						INVOICE = data.table;
						show_bill(INVOICE);
					}

				}else{
					$('.welcome-header').text("Sorry."); //update the loading text.
		    		$('.welcome-sub').html("Unable to connect to the merchant. <br/>  Please try again later.");
		    		paypal_track_event('home', 'Error', 'Unable to connect to merchant');
				}

		    }).error(function(error, data, type){
		    		$('.welcome-header').text("Sorry."); //update the loading text.
		    		$('.welcome-sub').html("Unable to connect to the merchant. <br/>  Please try again later.");
		    		paypal_track_event('home', 'Error', 'Unable to connect to merchant');
		        	console.log("Failed to get merchant information from "+ PARTNER.partner.name + " - " + data + ": " + type + ".");
		    });
		}


	}).error(function( jqxhr, textStatus, error ) {
		alert("Unable to load partner configuration file.")
		console.log( "Request Failed: " + err );
	});

}

function load_split_by_seat(invoice){

	//clear out existing buttons
	$('#split_seat_set').html('');
	$('#split_seat .final_total').text(format_cash(0));

	var shared_total = 0;
	var seat_shared_split = 0;
	var shared_string = '';
	if (typeof invoice.shared_items !== 'undefined'  && invoice.shared_items.length > 0){
		shared_total = get_seat_total(invoice.shared_items);
		seat_shared_split = (shared_total / invoice.seats.length).toFixed(2);
		shared_string = ' +'+((1/invoice.seats.length)*100).toFixed(0)+'% of Shared';
	}

	$('#split_seat_list').attr( 'data-shared-total', shared_total);

	//loop through the 
	var seat_count = 1;
	$.each( invoice.seats , function(key, seat) {

		
		if(typeof seat.items !== 'undefined'){
			var seat_total = parseFloat(get_seat_total(seat.items)) + parseFloat(seat_shared_split);
			var seat_input = '<input type="checkbox" name="split-by-seats[]" id="seat-checkbox-'+seat_count+'" value="'+seat_total+'" data-seatId="'+seat.id+'" data-totalTax="'+seat.tax+'" data-theme="c" />';
			seat_input += '<label for="seat-checkbox-'+seat_count+'" data-theme="c" data-seat-total="'+seat_total+'" onClick="get_seat_split_total();">';
			if(typeof seat.pp_customer_id !== 'undefined'){ //somone is on this seat.
				seat_input += '<img src="'+seat.customer_photo_url+'" height="30px" style="" /> <span class="seat_label">'+ seat.customer_name+'</span>';
			}else{
				seat_input += '<span class="seat_label">Seat #'+seat_count+'</span>';
			}
				
			seat_input += '<span class="seat_price">'+format_cash(seat_total)+'<br/><span style="font-size:7px">'+seat.items.length+' Items'+shared_string+'</span></span>';
			seat_input += '</label>'

			$('#split_seat_set').append(seat_input);
		}


		seat_count +=1;

		
	});

	$('#split_seat_set').trigger('create');
	$('#split_seat_set input').change(function(){
		get_seat_split_total();
	});
	//$('#split_seat_list').listview("refresh");


}

function get_seat_total(seat_items){

	var seat_total = 0;
	var tax_total = 0;


	$.each( seat_items , function(key, item ) {
			//calculate line total
			var line_total = parseFloat(item.unit_price*item.qty);
			var tax_total = 0;
			//TODO: Temp Patch for TB Demo
	    	if(typeof item.taxRate == 'undefined'){
	    		item.taxRate = 13;
	    	}

			//calculate tax total in one of 2 ways
			if(typeof item.taxRate == 'undefined'){
    			tax_total += 0;
    		}else if(MERCHANT.merchant.prices_include_tax){
	    		tax_total += parseFloat((line_total -(line_total / (1+(item.taxRate/100)))).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}else{
	    		tax_total += parseFloat((line_total*(item.taxRate/100)).toFixed(2)); //Had to add this hard round because PayPal Does.
	    	}

	    	seat_total += line_total;

	    });

	return (seat_total + tax_total).toFixed(2);


}


function check_for_updates(){
	$.ajax(POLL['request'], {dataType: PARTNER.partner.req_dataType}).success(function(data){
		
		var this_response = JSON.stringify(data);

		if(typeof data.merchant !== 'undefined'){


			if(typeof data.table !== 'undefined'){ //This user has already been binded to a table
				
				if(POLL['last_response'] != JSON.stringify(data)){ //the invoice has changed or appeared
					INVOICE = data.table;
					show_bill(INVOICE);
					$('#change-banner').slideDown('slow').delay(4500).slideUp('slow');
				}
			}

			if(POLL['now']){ //do it again in the set interval
				POLL['last_response'] = this_response;
				POLL_INTERVAL = window.setTimeout(check_for_updates, POLL['interval']);
			}

		}else{
			alert("Sorry. We were unable to locate this merchant."); 
		}

    }).fail(function(error, data, type){
        	alert("Failed to get merchant information from "+ PARTNER.partner.name + " - " + data + ": " + type + ".");
    });

}

function get_seat_split_total(){

	var sub_total = 0;
	var tax_total = 0;
	var grand_total = 0;
	var paid_seats = new Array();
	SPLIT_ARRAY = new Array();
	var j = 0;
	
	$("#split_seat_set input:checked").each(function() {
  		
  		sub_total = sub_total + parseFloat($(this).val());
  		tax_total = tax_total + parseFloat($(this).attr('data-totalTax'));
  		paid_seats[j] = $(this).attr('data-seatId');
		j++;

	});
	
	grand_total = sub_total + tax_total;

	SPLIT_ARRAY['tax_total'] = tax_total.toFixed(2);
	SPLIT_ARRAY['sub_total'] = sub_total.toFixed(2);
	SPLIT_ARRAY['grand_total'] = SPLIT = grand_total.toFixed(2)
	SPLIT_ARRAY['type'] = SPLIT_TYPE = 'SeatPayment';
	SPLIT_ARRAY['seats'] = paid_seats;

	$('.grand_total').text(format_cash(grand_total));
	$('#shared-tax').text(format_cash(tax_total));


}




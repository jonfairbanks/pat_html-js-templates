<?php
//****** This is a sample script for a table status controller ///

include_once('../../../../config.php'); //Include your own database configuration file.  This is mine, it conncects to my DB.

header('Content-type: application/json'); //it will always respond with json of some type

//Use this array to hold the details
$response_array = array();
$response_array['meta']['status'] = 200;

//Handle Payment functionality here.  
$pp_customer_id = $_POST['pp_customer_id']; //get the paypal customer making the request 
$pp_tab_id = $_POST['pp_tab_id']; //get the paypal ta ID to send off for the payment.

//with this pp customer id we should be able to look up the table they are seated at and the bill total.
//You might get somehitng like this back from your database if not through an error.
$found_table['table']['status'] = 'open';
$found_table['table']['cashier_id'] = 'open';
$found_table['table']['table_code'] = 'T1-8';
$found_table['table']['table_name'] = '8';
$found_table['table']['total'] = 206.65;
$found_table['table']['tax'] = 26.86;

//You will also likely need to lookup the merchant details in the merchant table to create an invoide
$found_table['merchant']['title'] = 'The Ryan Cafe';
$found_table['merchant']['street'] = '96 Saint Patrick St.';
$found_table['merchant']['province'] = 'Ontario';
$found_table['merchant']['country'] = 'CA';



$payment_sub_total = floatval($_POST['payment']['sub_total']);
$payment_tax = floatval($_POST['payment']['sub_total']);
$payment_tip = floatval($_POST['payment']['sub_total']);
$payment_total = floatval($_POST['payment']['sub_total']);
$payment_type = $_POST['payment']['type'];

if($payment_total < $found_table['table']['total']){ //this payment is less than the total due.
	
	//see if the payment goes through. 

	
	

}else if($payment_total > $found_table['table']['total']){
	//The payment is for more than the entire table owes.
	http_response_code(403);
	$response_array['meta']['status'] = 403;
	$response_array['meta']['message'] = "Total Payment was for more than table owes.";

}else if ($payment_total == $found_table['table']['total']){




}else{
	http_response_code(403);
	$response_array['meta']['status'] = 403;
	$response_array['meta']['message'] = "Unable to detemine table and payment amounts.";
}




echo json_encode($response_array);

//get the merchant information
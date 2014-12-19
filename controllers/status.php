<?php

//****** This is a sample script for a table status controller ///

include_once('../../../../config.php'); //Include your own database configuration file.  This is mine, it conncects to my DB.


//should we generate and send back a customer code?
$use_customer_code = true;

//Function to Generate Customer Code
function generate_code($length = 4){
    $options = "0123456789";
    $code = "";
    for($i = 0; $i < $length; $i++){
        $key = rand(0, strlen($options) - 1);
        $code .= $options[$key];
    }
    return $code;
}


header('Content-type: application/json'); //it will always respond with json of some type

//Use this array to hold the details
$response_array = array();
$response_array['meta']['status'] = 200;


// First wee need to lookup the merchant location to see if we can locate it's details.
// Based on the URL format setup in ../objects/partner_config_nommio.json I have placed 'merchant_id' in a GET Param
if(isset($_GET['merchant_id']) && !empty($_GET['merchant_id'])){

	$merchant_key = strip_tags($_GET['merchant_id']);
	$merchant_location_result = mysql_query("SELECT * FROM `merchants` WHERE `key` LIKE '$merchant_key' LIMIT 0 , 1");
	
	if(mysql_num_rows($merchant_location_result) > 0){ //if we found somehitng add the object to the response

		$merchant = mysql_fetch_assoc($merchant_location_result);

		//Add the merchant object details
		$response_array['merchant']['title'] = $merchant['title'];
		$response_array['merchant']['prices_include_tax'] = $merchant['tax_inclusive'];
		$response_array['merchant']['use_table_id'] = true;
		$response_array['merchant']['calculate_tip_including_tax'] = false; 
		$response_array['merchant']['allow_customer_reviews'] = false; //future use (Just hardcode for now)
		$response_array['merchant']['wallpaper'] = false; //future use (Just hardcode for now)
		$response_array['merchant']['bg_color'] = '#0079c1'; //future use (Just hardcode for now)

		//Add the locale object details
		$response_array['locale']['locale_x'] = 'en'; //not used yet but, will be used for translations.
		$response_array['locale']['currency'] = $merchant['currency']; //future use (Just hardcode for now)
		$response_array['locale']['currency_symbol'] = '$'; // used in currency formatting functions (Just hardcode for now)
		$response_array['locale']['currency_symbol_after_number'] = false; // used in currency formatting functions (Just hardcode for now)
		$response_array['locale']['decimal'] = '.'; // used in currency formatting functions (Just hardcode for now)
		$response_array['locale']['thousands'] = ','; // used in currency formatting functions (Just hardcode for now)


		//Next: We need to check to see if this paypal customer_id is already bound to a table
		if(isset($_GET['pp_customer_id']) && !empty($_GET['pp_customer_id'])){

			$pp_customer_id = strip_tags($_GET['pp_customer_id']);
			$customer_check_result = mysql_query("SELECT * FROM `bound_customers` WHERE `merchant_id` = ".$merchant['id']." AND `paypal_customer_id` LIKE '$pp_customer_id' LIMIT 0 , 1");

			if(mysql_num_rows($customer_check_result) > 0){ //the customer is already bound to a table

				// At this point we would look up the table and the menu items.  To create the object dynamically.
				// In this example I am just going to hardcode it.
				$response_array['table']['status'] = 'open';
				$response_array['table']['cashier_id'] = 'open';
				$response_array['table']['table_code'] = 'T1-8';
				$response_array['table']['table_name'] = '8';
				$response_array['table']['total'] = 206.65;
				$response_array['table']['tax'] = 26.86;

				//this is where you would loop through the line items
				$response_array['table']['items'][0]['name'] = "Molson Canadian";
				$response_array['table']['items'][0]['quantity'] = 4;
				$response_array['table']['items'][0]['unitPrice'] = 3.10;

				$response_array['table']['items'][1]['name'] = "Cocktail - El Presidente";
				$response_array['table']['items'][1]['quantity'] = 2;
				$response_array['table']['items'][1]['unitPrice'] = 6.88;

				$response_array['table']['items'][2]['name'] = "Cocktail - Four Horsemen";
				$response_array['table']['items'][2]['quantity'] = 2;
				$response_array['table']['items'][2]['unitPrice'] = 7.10;

			} //end if found customer already bound

			//Since this is customer code binding we need to send back an array of customers
			if($use_customer_code){

				//The first index in the array should be the customer making the request, get this data from your database
	 			//TODO: Obviously you will need to check that the random code is unique actross this location, and store it with the customer information in a table.
	 			if ($pp_customer_id == 'abc123'){ //simulates already found customer ID in Database
					$response_array['customers'][0]['pp_customer_id'] = "EPJ9DG8PEFZ4L";
					$response_array['customers'][0]['customer_name'] = "Ryan M.";
		 			$response_array['customers'][0]['customer_photo_url'] = 'https://pics.paypal.com/00/s/MjAwWDIwMA==/z/57oAAOxytBZSQOxX/$T2eC16FHJIQFHHjSU75cBSQO)(D3(w~~60_2.JPG';
		 			$response_array['customers'][0]['customer_code'] = '0149';
	 			}else{
	 				//find details generate code, and save them in the database for future lookups.
	 				$response_array['customers'][0]['pp_customer_id'] = "EPJ9DG8PEFZ4L";
					$response_array['customers'][0]['customer_name'] = "Ryan M.";
		 			$response_array['customers'][0]['customer_photo_url'] = 'https://pics.paypal.com/00/s/MjAwWDIwMA==/z/57oAAOxytBZSQOxX/$T2eC16FHJIQFHHjSU75cBSQO)(D3(w~~60_2.JPG';
	 				$response_array['customers'][0]['customer_code'] = generate_code();	
	 			}
	 			

	 			//If friends have been bound to the same table add them to the response.  This would be a quesry to the DB
				//$response_array['customers'][1]['pp_customer_id'] = "ANSNKSJKJUWW34";
				//$response_array['customers'][1]['customer_name'] = "Joe S.";
	 			//$response_array['customers'][1]['customer_photo_url'] = 'https://pics.paypal.com/00/s/MjAwWDIwMA==/z/PNMAAOxyu4dRwcNf/$(KGrHqNHJ!0FGn,qjZsJBRwcNfcRNw~~60_2.JPG';
	 			//$response_array['customers'][1]['customer_code'] = generate_code();
			
			} //end if creating customers array for customer code usage


		}//end if customer id is set

	}else{

		$response_array['meta']['status'] = 404;
		$response_array['meta']['message'] = "No merchant found. Could not find merchant location with ID: " . $merchant_key;

	}



}else{ //No Merchant ID was sent to lookup this location in our database

	$response_array['meta']['status'] = 500;
	$response_array['meta']['message'] = "No merchant id received. Unable to lookup location details.";

}

echo json_encode($response_array);
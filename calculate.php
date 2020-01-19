<?php
	error_reporting(E_ERROR | E_PARSE);
	set_time_limit(30);

	header('Content-type: applicaton/json');

	$monthly = $_POST['monthly'];
	$months = $_POST['months'];
	$balance = $_POST['balance'];
	if (strstr($balance, '.') === false) {
		$balance .= ".0"; // if we add .0 to signify real value, wolfram will use approximation, so will not timeout
	}

	$equation = "FindRoot[({$monthly}*sum x^i,i=1 to {$months})-{$balance},{x,0}]";

	$params = [
		"appid" => require('wolfram-appid.php'),
		"input" => $equation,
		"format" => "plaintext",
		"output" => "json",
		"includepodid" => "Result",
	];

	$apiurl = "https://api.wolframalpha.com/v2/query?".http_build_query($params);

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $apiurl);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
	curl_setopt($ch, CURLOPT_TIMEOUT, 20);
	$data = curl_exec($ch);
	if (curl_errno($ch)) {
		$error_msg = curl_error($ch);
		curl_close($ch);
		die(json_encode(["success"=>false, "reason"=>$error_msg]));		
	}
	curl_close($ch);

	if (!$data) {
		die(json_encode(["success"=>false, "reason"=>"Wolfram-Alpha API call failed"]));
	}

	file_put_contents("/tmp/wolfram-response.json", $data);

	$res = json_decode($data, true);

	if ($res['queryresult']['timedout']) {
		die(json_encode(["success"=>false, "reason"=>"Timeout: ".$res['queryresult']['timedout']]));
	}

	$subpods = $res['queryresult']['pods'][0]['subpods'];
	if (!$subpods) {
		die(json_encode(["success"=>false, "reason"=>"Wolfram-Alpha API response invalid"]));
	}

	$x = false;

	foreach ($subpods as $subpod) {
		// plaintext is x = num or x~num
		if (preg_match("/-?[0123456789]+\.?[0123456789]*/", $subpod['plaintext'], $m)) {
			$val = $m[0] * 1.0;
			if ($val > 0) {
				// for multiple real solutions, use only a positive one (hopefully there is only one)
				// if there are more than one, we should try the one closest to 1?
				if ($x === false || abs($val-1) < abs($x-1)) {
					$x = $val;
				}
			}
		}
	}

	if ($x === false) {
		die(json_encode(["success"=>false, reason=>"No positive real solution"]));
	}

	function fmt_percent($p) {
		$v = round(($p-1)*100, 4);
		return "{$v}%";
	}

	$res_monthly = fmt_percent($x);
	$res_yearly = fmt_percent(pow($x, 12));
	$wolframlink = "https://www.wolframalpha.com/input/?i=".urlencode($equation);

	$res = ["success" => true, "monthly" => $res_monthly, "yearly" => $res_yearly, "wolframlink" => $wolframlink];
	echo json_encode($res);
?>

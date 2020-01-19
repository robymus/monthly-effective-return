window.lastChanged = null;

// helper: checks if form value in #name is a valid number (and integer for "months")
function isValid_(name) {
  if (name == null) return false;
  var val = $('#'+name).val();
  if (val == "") return false;
  var num = Number(val);
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  if (name == "months" && !Number.isInteger(num)) return false;
  return true;
}

// checks if valid and sets css as well
function isValid(name) {
  var valid = isValid_(name);
  if (valid) {
    $('#'+name).removeClass('is-invalid');
    $('#'+name).addClass('is-valid');
  }
  else {
    $('#'+name).removeClass('is-valid');
    $('#'+name).addClass('is-invalid');
  }
  return valid;
}

function changeField(changed) {
  if (!isValid(changed)) return;
  if (changed == 'balance') return; // nothing to do with balance
  var bases = [changed];
  if (window.lastChanged != changed && window.lastChanged != null) {
    bases.push(window.lastChanged);
  }
  else {
    if (changed != "monthly" && isValid_("monthly")) bases.push("monthly");
    else if (changed != "months" && isValid_("months")) bases.push("months");
    else if (changed != "total" && isValid_("total")) bases.push("total");
  }
  window.lastChanged = changed;
  if (bases.length != 2) return; // can't calculate
  // target is the missing one
  if (!bases.includes("total")) {
    $('#total').val($('#monthly').val()*$('#months').val());       
    isValid("total");
  }
  else if (!bases.includes("months")) {
    $('#months').val(Math.floor($('#total').val()/$('#monthly').val()));
    $('#total').val($('#monthly').val()*$('#months').val()); 
    isValid("months");
  }
  else if (!bases.includes("monthly")) {
    $('#monthly').val(Math.floor($('#total').val()/$('#months').val()));
    $('#total').val($('#monthly').val()*$('#months').val());         
    isValid("monthly");
  }
}

// evaluate sum i=1..n p^i
function evalReturn(p, n) {
  var r = 0;
  for (var i = 1; i <= n; i++) {
    r = p * (1+r);
  }
  return r;
}

function findRoot(months, dest) {
  var epsilon = 1e-12;
  var low = 0.0;
  var high = 1.0;

  var e;
  // get a low/high bound first
  while ((e = evalReturn(high, months)) < dest) {
    low = high;
    high *= 2;
  }

  if (Math.abs(e-dest)<=epsilon) return high; // just for safety, in case it is exactly high

  for (var i = 1; i <= 100; i++) { // maximum iterations
    var mid = (low+high)/2;
    e = evalReturn(mid, months);
    if (Math.abs(e-dest)<=epsilon) {
      console.log("iterations: "+i);
      return mid;
    }
    if (e < dest) {
      low = mid;
    }
    else {
      high = mid;
    }
  }
  // if we run out of iterations
  console.log("max iterations");
  return (low+high)/2;
}

function fmt_percent(p) {
  return Math.round((p-1)*100 * 1000)/1000 + "%";
}

function formSubmit() {
  var valid = true;
  var fields = ["monthly", "months", "total", "balance"];
  var formData = {}
  fields.forEach(function(x) {
    formData[x] = $('#'+x).val();
    if (!isValid(x)) valid = false;        
  });
  if (!valid) return;

  $('#equation').text('\\('+formData['monthly']+'\\times\\sum\\limits_{i=1}^{'+formData['months']+'} x^i='+formData['balance']+'\\)');
  MathJax.texReset();
  MathJax.typesetClear();
  MathJax.typesetPromise();


  var r_monthly = findRoot(formData['months'], formData['balance']/formData['monthly']);
  var r_yearly = Math.pow(r_monthly, 12);

  $('#res-monthly').text(fmt_percent(r_monthly));
  $('#res-yearly').text(fmt_percent(r_yearly));
  $('#results-panel').show();
}

$('#results-panel').hide();

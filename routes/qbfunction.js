var config = require('../configQB.json')
var request = require('request')
var TokenProvider = require('refresh-token');
var rp = require('request-promise');
var helpers = require('handlebars-helpers');
var math = helpers.math();

var token ;
var url;
var arrcustomer = [];
var requestObj;
var arr = [];

let getTokenTest = async function(req) {

  var tokenProvider = new TokenProvider('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    refresh_token: req.session.credentials[0].refresh_token,
    client_id:     req.session.credentials[0].client_id,
    client_secret: req.session.credentials[0].client_secret
  });
  // console.log('tokenProvider', tokenProvider)

  return new Promise(function(resolve, reject) {
    tokenProvider.getToken(function (err, newToken) {
      console.log('err in token##', err, typeof(err))
      token = newToken;
      console.log("Get New Token", token)
      if (err) {
        console.log("Inside err");
        // var arr1 = [];
        // var arr2 = [];
        //
        // for (var prop in err) {
        //   console.log("&&&&&&&&&&&&&&&&&&&",prop);
        //    arr1.push(prop);
        //    arr2.push(err[prop]);
        // }
        // console.log("arr1",arr1);
        // console.log("arr2",arr2);
        resolve({err:'Check your connection and credentials'})
      }
      else {
        // console.log('token1', token)
        resolve(token)
      }
    });
  })
}

let getRequestObj = function(url) {
  var getReqObj = {
    url: url,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json'
    }
  }
  // console.log("getReqObj",getReqObj)
  return getReqObj;
}

let postRequestObj = function(url,body) {
  var postReqObj = {
    url: url,
    method: 'POST',
    body: body,
    headers: {
      'Authorization': 'Bearer ' + token ,
      'Accept': 'application/json',
      'Content-Type' : 'application/json'
    }
  }
  return postReqObj;
}

let make_api_call = async function (requestObj) {
  return new Promise(function (resolve, reject) {
    console.log("INSIDE API CALL")
    // console.log("Requestobj",requestObj)
    request(requestObj, function (err, response) {
        // console.log("Response",response.body)
        resolve(response);
      }, function (err) {
        console.log("Error",err);
        resolve({isError:true, err:err});
      })
    })
  // })
}

let resultdata = function(result,name,app) {
  var status;
  var jsondata = JSON.parse(result.body);
  var len = JSON.stringify(jsondata.QueryResponse.totalCount, null, 2);
  console.log("Length",len);
  arr = [];
  for (i=0; i<len; i++) {
    var data1 = JSON.stringify(jsondata.QueryResponse.Invoice[i], null, 2);
    var total = (JSON.parse(data1)).TotalAmt;
    var due = (JSON.parse(data1)).Balance;
    if (due == 0) {
      status = 'Paid';
    }
    else if(due == total) {
      status = 'Approved';
    }
    else {
      status = 'Partial'
    }
    var arrdata = {
        name: name,
        app: app,
        type: 'Invoice',
        status: status,
        data: {}
    }
    arrdata.data = JSON.parse(data1);
    arr.push(arrdata);
  }
  // console.log("invoice data",arr[0]);
  return arr;
}

let listCustomer = async function(req, name, app){
  var url = config.api_uri + req.session.credentials[0].realmId + '/query?query=select * from Customer'
  console.log('Making API call to: ' + url)

    requestObj = await getRequestObj (url)
    var result = await make_api_call (requestObj)
    var jsondata = JSON.parse(result.body);
    var len = JSON.stringify(jsondata.QueryResponse.maxResults, null, 2);
    console.log("Length of Customer",len);
    arrcustomer = [];
    for (i=0; i<len; i++) {
      var data1 = JSON.stringify(jsondata.QueryResponse.Customer[i], null, 2);
      var arrdata = {
        name: name,
        app: app,
        data: {}
      }
      arrdata.data = JSON.parse(data1);
      // console.log("data:",arrdata)
      arrcustomer.push(arrdata);
    }
    console.log("Customer Get Data",arrcustomer[0]);
    return arrcustomer;
}

exports.getcustomer = async function(req, name, item) {
    return new Promise(async function(resolve, reject) {
        var new1 = await getTokenTest(req)
          .then(async function(token) {
            // console.log("%%%%%%%%%%%%",token);
            if (token == undefined || token.err) {
              resolve({err:token.err})
            }
            else {
              var mydata = await listCustomer(req, name, item)
              if (mydata == undefined || mydata[0] == undefined) {
                resolve({err:'No data found'})
              }
              else {
                // console.log('New Data', mydata)
                resolve(mydata);
              }
            }
        })
        .catch(function(e) {
          console.log("Error while getting token");
          resolve({err:'Not able to get Token!!Refresh token expired'})
        })
    })
}

exports.postcustomer = async function(req, name, appname){
  return new Promise(function(resolve, reject){
    var url = config.api_uri + req.session.credentials[0].realmId + '/customer'
    console.log('Making API call to: ' + url)
    var new1 = getTokenTest(req)
      .then(async function(token){
        if(token == undefined) {
          resolve({err:'Token expired'})
        }
        else {
          var body = JSON.stringify({
            'BillAddr': {
              'Line1': req.body.line1,
              'City': req.body.city,
              'Country': req.body.country,
              'PostalCode': req.body.code
            },
            'CompanyName': req.body.CompanyName,
            'DisplayName': req.body.DisplayName,
            'PrimaryPhone': {
              'FreeFormNumber': req.body.number
            },
            'PrimaryEmailAddr': {
              'Address': req.body.email
            }
          });
          requestObj = await postRequestObj (url,body)
          var result = await make_api_call (requestObj)
          console.log("#####Customer Post Data#####",JSON.parse(result.body))
          resolve(result);
        }
    })
  })
}

exports.listinvoice = async function(req,name,item) {
      return new Promise(function(resolve, reject){
        var url = config.api_uri + req.session.credentials[0].realmId + '/query?query=select * from Invoice'
        console.log('Making API call to: ' + url)
        var new1 = getTokenTest(req)
          .then(async function(token){
            if (token == undefined) {
              console.log(1);
              resolve({err:'Token expired'})
            }
            else {
              requestObj = await getRequestObj (url)
              // Make API call
              var result = await make_api_call (requestObj)
              arr = resultdata(result,name,item);
              // console.log('New Data', mydata)
              resolve(arr)
            }
        })
        .catch(function(e){
          console.log("Error while getting token");
          resolve({err:'Not able to get Token'})
        })
      })
}

exports.invoicebyname = async function(req,name,item,cust_name) {
    return new Promise(function(resolve, reject){
        var new1 = getTokenTest(req)
          .then(async function(token){
            if(token == undefined) {
              resolve({err:'Token expired'})
            }
            else {
              arrcustomer = await listCustomer(req,item);
              console.log("name",cust_name);
              var value;
              arrcustomer.forEach(function(data) {
                if(cust_name === data.data.DisplayName) {
                  value = data.data.Id;
                }
              });

              var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "'"
              console.log('Making API call to: ' + url)
              requestObj = await getRequestObj (url)

              // Make API call
              var result = await make_api_call (requestObj)
              arr = resultdata(result,name,item);
              // console.log('New Data', mydata)
              resolve(arr)
            }
        })
        .catch(function(err) {
          console.log("Error in invoice by name");
          resolve({err:'Not able to get invoice'})
        })
    })
}

exports.invoicebyid = async function(req,name,item) {
    var id = req.params.id;
    console.log("Id",id);
    return new Promise(function(resolve, reject){
      var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice where Id='" + id + "'"
      console.log('Making API call to: ' + url)
      var new1 = getTokenTest(req)
        .then(async function(token){
          if (token == undefined) {
            resolve({err:'Token expired'});
          }
          else {
            requestObj = await getRequestObj (url)

            // Make API call
            var result = await make_api_call (requestObj)
            arr = resultdata(result,name,item);
            resolve(arr)
          }
      })
      .catch(function(err) {
        console.log("Error in invoice by name");
        resolve({isError:true,err:'Not able to get token'})
      })
    })
}

var value;
let addInvoice =async function(req, amount) {
    var url = config.api_uri + req.session.credentials[0].realmId + '/invoice'
    console.log('Making API call to: ' + url)
    var line = [
              {
                "Amount": amount,
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                  "ItemRef": {
                    "value": "2",
                    "name": "Services"
                  }
                }
              }
            ];
    var ref = {
              "value": value,
          };
    var body = JSON.stringify({'Line': line, 'CustomerRef':ref});
    requestObj = await postRequestObj (url,body)
    // console.log(requestObj);
    // Make API call
    var result = await make_api_call (requestObj)
    return result;
}

exports.saveinvoice = async function(req, name, appname, custname,amount){
  return new Promise(function(resolve, reject){
    var new1 = getTokenTest(req)
      .then(async function(token){
        if(token == undefined) {
          resolve({err:'Token expired'})
        }
        else {
          arrcustomer = await listCustomer(req, name, appname);
          console.log("customer name",custname);
          var flag = 1;
          arrcustomer.forEach(function(data) {
            // console.log(data.DisplayName)
            if(custname === data.data.DisplayName) {
              flag = 0;
            }
          });
          console.log("Flag",flag);
          if(flag === 1) {
            var url = config.api_uri + req.session.credentials[0].realmId + '/customer'
            console.log('Making API call to: ' + url)
            // var CompanyName = req.query.CompanyName;
            var DisplayName = custname;
            var body = JSON.stringify({'DisplayName':DisplayName});
            requestObj = await postRequestObj (url,body)
            console.log(requestObj);
            // Make API call
            var result = await make_api_call (requestObj)
            var data = JSON.parse(result.body);
            // console.log("Parsed data",data.Customer.Id)
            value = data.data.Customer.Id;
            // console.log("value", value);
            resolve(addInvoice(req,amount));
          }
          else {
            arrcustomer.forEach(function(data) {
              if(custname === data.data.DisplayName) {
                value = data.data.Id;
                console.log("value",value);
                console.log("Else add invoice call");
                resolve(addInvoice(req,amount));
              }
            })
          }
        }
      })
      .catch(function(err) {
        console.log("Error Inside list invoice");
        resolve({ err:'Error while fetching data'});
      })
  })
}

var value;
let getcustomerid = async function(req,accname,appname,name) {
  return new Promise(async function(resolve, reject){
    arrcustomer = await listCustomer(req,accname,appname);
    arrcustomer.forEach(function(data) {
      console.log(data.data.DisplayName);
        if(name === data.data.DisplayName) {
          value = data.data.Id;
          console.log("value id",value);
        }
    });
    resolve(value);
  })
}

exports.invoiceByMultipleFilter = async function(req, accname, appname, name, date, daterange, total, totalgt, totallt, due, duegt, duelt, status) {

    console.log('%%%%%%%%%%%%%%%%Inside function',name, date, daterange, total, totalgt, totallt, due, duegt, duelt, status, '%%%%%%%%%%%%%%%%%');
    var app = config.credentials[accname];
    var itemdata = app[appname]
    req.session.app = appname;
    req.session.credentials = itemdata;

    return new Promise(function(resolve, reject){
      var new1 = getTokenTest(req).then(async function(){
          var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice "
          var flag = 0;

          if(name != undefined) {
            value = await getcustomerid(req,accname,appname,name);
            console.log("Inside if value",value);
            if (flag == 0) {
              condition = ' WHERE'
              flag = 1
            }
            else {
              condition = ' AND'
            }
            url += condition + " CustomerRef = '" + value + "'"
          }

          if(date != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " TxnDate ='" + date + "'"
          }

          if(daterange != undefined) {
            daterange = daterange.split('to');
            var date1 = daterange[0];
            var date2 = daterange[1];
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " TxnDate > '"+ date1 + "' AND TxnDate < '" + date2 + "'"
          }

          if(total != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " TotalAmt = '" +total+ "'"
          }

          if(totalgt != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " TotalAmt > '" +totalgt+ "'"
          }

          if(totallt != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " TotalAmt < '" +totallt+ "'"
          }

          if(due != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " Balance = '" +due+ "'"
          }

          if(duegt != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " Balance > '" +duegt+ "'"
          }

          if(duelt != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            url += condition + " Balance < '" +duelt+ "'"
          }

          if(status != undefined) {
            if (flag == 0) {
              condition = 'WHERE'
              flag = 1
            }
            else {
              condition = 'AND'
            }
            if (status == 'paid') {
              url += condition + " Balance = '0'"
            }
            else {
              url += condition + " Balance > '0'"
            }
          }
          console.log("####################");
          console.log("URL",url)
          console.log("####################");
          console.log('Making API call to: ' + url)
          requestObj = await getRequestObj (url)

          // Make API call
          var result = await make_api_call (requestObj)
          // console.log("RESULT",result)
          arr = resultdata(result,accname,appname);
          resolve(arr);
      })
    })
    // if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt == undefined && duegt == undefined && duelt == undefined && status != undefined) {
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE Balance > '0'"
    //     }
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt == undefined && duegt == undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE Balance < '" +duelt+ "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt == undefined && duegt != undefined && duelt == undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE Balance > '" +duegt+ "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt == undefined && duegt != undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE Balance > '" +duegt+ "' AND Balance < '" +duelt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt != undefined && duegt == undefined && duelt == undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt < '" +totallt+ "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt != undefined && duegt == undefined && duelt == undefined && status != undefined) {
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt <'"+totallt+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt <'"+totallt+"' AND Balance > '0'"
    //     }
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt != undefined && duegt == undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt < '" +totallt+ "' AND Balance < '" +duelt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt != undefined && duegt != undefined && duelt == undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt < '" +totallt+ "' AND Balance > '" +duelt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt == undefined && totallt != undefined && duegt != undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt < '" +totallt+ "' AND Balance > '" +duegt+ "' AND Balance < '" +duelt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt != undefined && totallt == undefined && duegt == undefined && duelt == undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt > '" +totalgt+ "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt != undefined && totallt == undefined && duegt == undefined && duelt == undefined && status != undefined) {
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt >'"+totalgt+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE AND TotalAmt >'"+totalgt+"' AND Balance > '0'"
    //     }
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt != undefined && totallt == undefined && duegt == undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt > '" +totalgt+ "' AND Balance < '" +duelt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt != undefined && totallt == undefined && duegt != undefined && duelt == undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt > '" +totalgt+ "' AND Balance > '" +duegt + "'"
    // }
    // else if (name == undefined && date == undefined && daterange == undefined && totalgt != undefined && totallt == undefined && duegt != undefined && duelt != undefined && status == undefined) {
    //   var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TotalAmt > '" +totalgt+ "' AND Balance > '" +duegt+ "' AND Balance < '" +duelt + "'"
    // }

    // if(name != undefined && date != undefined && totalamount != undefined && status == undefined) {
    //     await getcustomerid();
    //     var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TxnDate ='"+date+"' AND TotalAmt ='"+amount+"'"
    // }
    // else if(name != undefined && date != undefined && totalamount == undefined && status != undefined) {
    //     await getcustomerid();
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TxnDate ='"+date+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TxnDate ='"+date+"' AND Balance > '0'"
    //     }
    // }
    // else if(name != undefined && date != undefined && totalamount == undefined && status == undefined) {
    //     await getcustomerid();
    //     var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TxnDate ='"+date+"'"
    // }
    // else if(name != undefined && date == undefined && totalamount != undefined && status != undefined) {
    //     await getcustomerid();
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TotalAmt ='"+amount+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TotalAmt ='"+amount+"' AND Balance > '0'"
    //     }
    // }
    // else if(name != undefined && date == undefined && totalamount != undefined && status == undefined) {
    //     await getcustomerid();
    //     var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND TotalAmt ='"+amount+"'"
    // }
    // else if(name != undefined && date == undefined && totalamount == undefined && status != undefined) {
    //     await getcustomerid();
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "' AND Balance > '0'"
    //     }
    // }
    // else if(name != undefined && date == undefined && totalamount == undefined && status == undefined) {
    //     await getcustomerid();
    //     var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE CustomerRef = '" + value + "'"
    // }
    // else if(name == undefined && date != undefined && totalamount != undefined && status != undefined) {
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TxnDate ='"+date+ "' AND TotalAmt ='"+amount+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TxnDate ='"+date+ "' AND TotalAmt ='"+amount+"' AND Balance > '0'"
    //     }
    // }
    // else if(name == undefined && date != undefined && totalamount != undefined && status == undefined) {
    //     var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TxnDate ='"+date+"' AND TotalAmt ='"+amount+"'"
    // }
    // else if(name == undefined && date != undefined && totalamount == undefined && status != undefined) {
    //     if (status == 'paid') {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TxnDate ='"+date+"' AND Balance = '0'"
    //     }
    //     else {
    //         var url = config.api_uri + req.session.credentials[0].realmId + "/query?query=select * from Invoice WHERE TxnDate ='"+date+"' AND Balance > '0'"
    //
    //     }
    // }
    //
    // else {
    //     var filter = 'Contact.Name == "'+name+'" AND Date ==  DateTime('+date+',00,00,00) AND Total == '+total+' AND AmountPaid == '+paid+'';
    // }
}

exports.getPdf = async function() {
  var id = '226'
  var url = config.api_uri + "123145873158439" + "/invoice/" + id + "/pdf"
  console.log('Making API call to: ' + url)
  var requestObj = {
    url: url,
    headers: {
      'Authorization': 'Bearer ' + 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..E0mmS3t4DvihVGBgGAitSA.uq10QI5GUaNpGWYxkKsVuB8JOBAuPDs5C9vn9FUjC-Fvw0nK3sswoJulEsofg_rhT4LX0VAJSy5n3PoakTIn7zZfsJpy1pWfJuMIfnHLUXXANA_bpk8xYbpUOzgbvcz6BxR9CNLytCkok2ekyKRYXb6CLqe5Q4jjpIBNnKeDKRNLs1h8cr63dS3RWBWd5HNamChHtIGdOW4nbC8PPptW-U-7Mq_-8LA8VEy1pmXzzp37hJFNDqOSAANp55yF1B2_yxE0umWbmNzh4HZgThMA0QNV1OkecH51-KjwPBJv--VhJSiraIfcuYSpEXM0_jXWblTg2gwCSA2toqJ7vGoZMViDAFjMZVBEQnzCXMZUuQRWJzG6ZUoBYDFFIq_wI4jOfRnSH2p6eipmy4LcvhJN3N4an7FDoGZRYzQRZc8suj4bIU1S6TK9AYv4USdN0tjEhqbvdsIe3CIOELYAAJ6oQ3Dfwm1w-Emgz2GqabgJ_S-Bp6dBMN2YPqx_wEu9uwzGTLrlNFmQIb1S7sJVh5ZWUwMYbOb1_2aB5gybAXq_4LsPj8vqGCPA7Msq4QlQ7kn_qANozEGOxd7Z41lVoCSokmVdy9n89Ych1d2QnWc4UW1kfF47RurfANa7KnXt8W9-ID4ybcRnmp6IHioKPIZZ6agT4MKKocu3hzqpJZxyWUEcTqdE1P9mLNDDQThLHxGL.mLHtZ7o_iI_l-lIkIk7Pyw',
      'Content-Type' : 'application/pdf',
      'Accept' : 'application/pdf'
    }
  }

  // Make API call
  var result = await make_api_call(requestObj)
  var data = result.body
  // console.log("@@@@@@@@@@@@@@@@@@@@@@@RESPONSE BODY")
  // console.log(data);
  // console.log("@@@@@@@@@@@@@@@@@@@@@@@")
  return data;
}

//#################################################################
exports.paymentviastripe = async function(req,amount) {
  var amount = parseInt(amount);
  return new Promise(function (resolve, reject) {
    var options = {
      method: "POST",
      uri: "http://localhost:3030/payment",
      body: {
                "gateway":"stripe",
                "amount" : amount,
                "currency":"usd",
                "cardNumber":req.body.cardnumber,
                "expMonth":req.body.expire_month,
                "expYear":req.body.expire_year,
                "cvc":req.body.cvc,
                "description":"this is desc",
                "isCustomer":false
      },
      json: true, // Automatically stringifies the body to JSON
      headers: {
        "X-api-token" : ""
      }
    };
    console.log("########################",options);
    rp(options)
        .then(function (parsedBody) {
          console.log("inside then%%%%%%%%%%%",parsedBody)
          resolve(parsedBody);
            // POST succeeded...
        })
        .catch(function (err) {
          console.log("inside catch")
          reject(err);
            // POST failed...
        });
  })
}

exports.paymentviaauthdotnet = async function(req,amount) {
  var amount = parseInt(amount);
  return new Promise(function (resolve, reject) {
    var options = {
      method: "POST",
      uri: "http://localhost:3030/payment",
      body: {
          "gateway":"authdotnet",
           "amount": amount,
           "cardNumber":req.body.cardnumber,
           "expMonth":req.body.expire_month,
           "expYear":req.body.expire_year,
           "cvc":req.body.cvc,
           "isCustomer":false
          },
      json: true, // Automatically stringifies the body to JSON
      headers: {
        "X-api-token" : "",
         "x-api-login" :  ""
      }
    };
    console.log("########################",options);
    rp(options)
        .then(function (parsedBody) {
          console.log("inside then%%%%%%%%%%%",parsedBody)
          resolve(parsedBody);
            // POST succeeded...
        })
        .catch(function (err) {
          console.log("inside catch")
          reject(err);
            // POST failed...
        });
  })
}

exports.paymentviapaypal = async function(req,amount) {
  // var amount = parseInt(amount);
  return new Promise(function (resolve, reject) {
    var options = {
      method: "POST",
      uri: "http://localhost:3030/payment",
      body: {
          "gateway":"paypal",
          "intent": "sale",
            "payer": {
              "payment_method": "credit_card",
              "funding_instruments": [{
                "payment_card": {
                  "type": req.body.cardtype,
                  "number": req.body.cardnumber,
                  "expire_month":parseInt(req.body.expire_month),
                  "expire_year": parseInt(req.body.expire_year),
                  "cvv2": parseInt(req.body.cvc),
                  "billing_country": "US",
                }
              }]
            },
            "transactions": [{
              "amount": {
                "total": amount,
                "currency": "USD",
                "details": {
                  "subtotal": amount,
                  "tax": "0",
                  "shipping": "0"
                }
              },
              "description": "This is the payment transaction description"
            }]
        },
      json: true, // Automatically stringifies the body to JSON
      headers: {
        "X-api-token" : "",
         "x-api-login" :  ""
      }
    };
    console.log("########################",options);
    rp(options)
        .then(function (parsedBody) {
          console.log("inside then%%%%%%%%%%%",parsedBody)
          resolve(parsedBody);
            // POST succeeded...
        })
        .catch(function (err) {
          console.log("inside catch")
          reject(err);
            // POST failed...
        });
  })
}

exports.postpayment = async function(req, name, appname){
  console.log("inside payment",name,appname);
  var app = config.credentials[name];
  var itemdata = app[appname]
  req.session.app = appname;
  req.session.credentials = itemdata;
  console.log("1111111");
  return new Promise(function(resolve, reject){
    var result;
    var new1 = getTokenTest(req).then(async function(){
      var url = config.api_uri + req.session.credentials[0].realmId + '/payment'
      console.log('Making API call to: ' + url)
      var line = [
        {
            "Amount": req.body.amount,
            "LinkedTxn": [
            {
                "TxnId": req.body.id,
                "TxnType": "invoice"
            }]
        }];
      var ref ={
            "value": req.body.value,
            "name": req.body.cname
        };
      var TotalAmt = req.body.amount;
      var body = JSON.stringify({'Line': line, 'CustomerRef':ref, 'TotalAmt':TotalAmt});
      requestObj = await postRequestObj (url,body)
      console.log("requestObj@@@@",requestObj);
      // Make API call
      result = await make_api_call (requestObj)
      resolve(result);
    })
  })
}

exports.readpayment = async function(req,name,item,id) {
    var app = config.credentials[name];
    var itemdata = app[item]
    req.session.app = item;
    req.session.credentials = itemdata;
    return new Promise(function(resolve, reject){
      var url = config.api_uri + req.session.credentials[0].realmId + '/query?query=select * from Payment'
      console.log('Making API call to: ' + url)
      var new1 = getTokenTest(req).then(async function(){
          requestObj = await getRequestObj (url)

          // Make API call
          var result = await make_api_call (requestObj)
          var jsondata = JSON.parse(result.body);
          // console.log("########Payment response########",JSON.stringify(jsondata.QueryResponse))
          var len = JSON.stringify(jsondata.QueryResponse.maxResults, null, 2);
          console.log("Length of Payment",len);
          arr = [];
          for (i=0; i<len; i++) {
            var data1 = JSON.stringify(jsondata.QueryResponse.Payment[i], null, 2);
              var arrdata = {
                name: name,
                app: item,
                type: 'Payment',
                data: {}
              };
              arrdata.data = JSON.parse(data1);
              arr.push(arrdata);
          }
          // arr = resultdata(result,name,item);
          // console.log('Payment data', arr[0])
          resolve(arr)
      });
    })
}

exports.readpaymentbyid = async function(req,name,item,id) {
    var app = config.credentials[name];
    var itemdata = app[item]
    req.session.app = item;
    req.session.credentials = itemdata;
    return new Promise(function(resolve, reject){
      var url = config.api_uri + req.session.credentials[0].realmId + '/query?query=select * from Payment'
      console.log('Making API call to: ' + url)
      var new1 = getTokenTest(req).then(async function(){
          requestObj = await getRequestObj (url)

          // Make API call
          var result = await make_api_call (requestObj)
          var jsondata = JSON.parse(result.body);
          // console.log("########Payment response########",JSON.stringify(jsondata.QueryResponse))
          var len = JSON.stringify(jsondata.QueryResponse.maxResults, null, 2);
          console.log("Length of Payment",len);
          arr = [];
          for (i=0; i<len; i++) {
            var data1 = JSON.stringify(jsondata.QueryResponse.Payment[i], null, 2);
              var arrdata = {
                name: name,
                app: item,
                type: 'Payment',
                data: {}
              };
              console.log("!!!!!!!!!!!!!!!",(JSON.parse(data1)).Line[0].LinkedTxn[0].TxnId);
              var invoiceid = (JSON.parse(data1)).Line[0].LinkedTxn[0].TxnId;
              if (invoiceid == id) {
                console.log("$$$$$$$$$$$$$$$$$$");
                arrdata.data = JSON.parse(data1);
                // console.log("@@@@@data:",arrdata)
                arr.push(arrdata);
              }
          }
          // arr = resultdata(result,name,item);
          // console.log('Payment data', arr[0])
          resolve(arr)
      });
    })
}

//###############################################
exports.createRefund = async function(req, name, item) {
  var app = config.credentials[name];
  var itemdata = app[item]
  req.session.app = item;
  req.session.credentials = itemdata;
  return new Promise(function(resolve, reject) {
    var url = config.api_uri + req.session.credentials[0].realmId + '/refundreceipt'
    console.log('Making API call to: ' + url)
    var new1 = getTokenTest(req).then(async function(){
      var value = await getcustomerid(req,name, item, req.query.cname);
      console.log("!!!!!!!!!!!!!!!value",value,"amount",req.query.amount);
      // if (value) {
      var line = [
        {
          "Description": req.query.desc,
          "Amount": req.query.amount,
          "DetailType": "SalesItemLineDetail",
          "SalesItemLineDetail": {
            "ItemRef": {
              "value": "2"
            }
          }
        }
      ];
      var depositTo = {
        "value": "35",
        "name": "Checking"
      };
      var ref = {
        "value": value,
        "name": req.query.cname
      };
        var body = JSON.stringify({ "Line": line, "DepositToAccountRef": depositTo, "CustomerRef": ref });
        requestObj = await postRequestObj (url,body)
        // requestObj = await getRequestObj (url)
        // console.log("##########requestObj",requestObj);
        // Make API call
        var result = await make_api_call (requestObj);
        console.log("55555555",result.body)
        resolve(result)
      // }

    });
  })
}

exports.readRefund = async function(req, name, item) {
  var app = config.credentials[name];
  var itemdata = app[item]
  req.session.app = item;
  req.session.credentials = itemdata;
  return new Promise(function(resolve, reject) {
    var url = config.api_uri + req.session.credentials[0].realmId + '/query?query=select * from RefundReceipt'
    console.log('Making API call to: ' + url)
    var new1 = getTokenTest(req).then(async function(){

        requestObj = await getRequestObj (url)
        // console.log("##########requestObj",requestObj);
        // Make API call
        var result = await make_api_call (requestObj);
        // console.log("55555555",result.body)

        var jsondata = JSON.parse(result.body);
        // console.log("########Payment response########",JSON.stringify(jsondata.QueryResponse))
        var len = JSON.stringify(jsondata.QueryResponse.maxResults, null, 2);
        console.log("Length of Refund",len);
        arr = [];
        for (i=0; i<len; i++) {
          var data1 = JSON.stringify(jsondata.QueryResponse.RefundReceipt[i], null, 2);
            var arrdata = {
              name: name,
              app: item,
              type: 'Refund',
              data: {}
            };
            arrdata.data = JSON.parse(data1);
            arr.push(arrdata);
        }
        resolve(arr)
    });
  })
}

exports.sendEmail = async function(req, name, item, id) {
  var app = config.credentials[name];
  var itemdata = app[item]
  req.session.app = item;
  req.session.credentials = itemdata;
  return new Promise(function(resolve, reject) {
    var url = config.api_uri + req.session.credentials[0].realmId + '/invoice/'+id+'/send'
    console.log('Making API call to: ' + url)
    var new1 = getTokenTest(req).then(async function(){
      var postReqObj = {
        url: url,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token ,
          'Accept': 'application/json',
          'Content-Type' : 'application/octet-stream'
        }
      }
      var result = await make_api_call (postReqObj)
      console.log("After api call",result);
      resolve(result);
    })
  })
}

// ==UserScript==
// @name        SMC Paste Automator
// @author      maitreyr, elsenhuc, mtoerpe
// @namespace   aws
// @description Copy & Paste Lists of EC2 Instances and EBS Volumes from excel or between regions (version 4 rewrite by mtoerpe@)
// @include     http://calculator.s3.amazonaws.com/index.html*
// @include     https://calculator.s3.amazonaws.com/index.html*
// @version     4.0.0
// @downloadURL xxx
// @updateURL   xxx
// @grant       none

// ==/UserScript==

var INSTANCE_INPUT_FIELD_NAMES = [
    'SF_EC2_INSTANCE_FIELD_DESCRIPTION',
    'SF_EC2_INSTANCE_FIELD_INSTANCES',
    'SF_EC2_INSTANCE_FIELD_USAGE'
  ];
  
  var EBS_VOLUME_TYPES = [
  "General Purpose SSD (gp2)",
  "Provisioned IOPS SSD (io1)",
  "Throughput Optimized HDD (st1)",
  "Cold HDD (sc1)",
  "Magnetic (Previous Generation)"
  ];
  
  var EC2_USAGE_TYPES = [
  "% Utilized/Month",
  "Hours/Day",
  "Hours/Week",
  "Hours/Month",
  ];
  
  var EC2_BILLING_TYPES = [
  "On-Demand (No Contract)",
  "1 Yr No Upfront Reserved",
  "1 Yr Partial Upfront Reserved",
  "1 Yr All Upfront Reserved",
  "3 Yr No Upfront Reserved",
  "3 Yr Partial Upfront Reserved",
  "3 Yr All Upfront Reserved",
  "1 Yr No Upfront Convertible",
  "1 Yr Partial Upfront Convertible",
  "1 Yr All Upfront Convertible",
  "3 Yr No Upfront Convertible",
  "3 Yr Partial Upfront Convertible",
  "3 Yr All Upfront Convertible"
  ];
  
  var EBS_SNAPSHOT_TYPES = [
  "GB-month of Storage",
  "% Change for hourly snapshots",
  "% Change for daily snapshots",
  "% Change for weekly snapshots",
  "% Change for monthly snapshots"
  ];
  
  // Map Pasted OS values to SMC Dialog values
  var EC2_OS_MAPPING = {
    'Linux': 'Linux',
    'Windows': 'Windows',
    'RHEL': 'Red Hat Enterprise Linux',
    'SLES': 'SUSE Linux Enterprise Server'
  }
  
  var EC2_OS_MAPPING_REV = {
    'Linux': 'Linux',
    'Windows': 'Windows',
    'RedHatEnterpriseLinux': 'RHEL',
    'SUSELinuxEnterpriseServer': 'SLES'
  }
  
  var intValId;
  
  var innerHTML = `EC2/EBS only - Clipboard (<a href="https://drive.corp.amazon.com/documents/elsenhuc@/public/SMCPaste_Template_v3.xlsx" target="_blank">Sample Input</a>):
  <textarea id="paste-data" rows="1" cols="10" style="width:500px;vertical-align: middle;"></textarea>
  <button id="copy-instances" type="button" style="background-color:#FF00FF">Copy</button>
  <button id="paste-instances" type="button" style="background-color:#FF00FF">Paste</button>
  <!--<button id="update-instances" type="button" style="background-color:#FF00FF">Update</button>-->
  `;
  //console.log('InnerHTML=' + innerHTML);
  var newDiv = document.createElement('div');
  newDiv.setAttribute('id', 'smc-paste-butttons');
  newDiv.setAttribute('style', 'background-color: chartreuse;padding:10px;font-family: verdana;font-size: 11px;');
  newDiv.innerHTML = innerHTML;
  var language = document.getElementById('aws-calculator');
  language.parentNode.insertBefore(newDiv, language);
  // set the callback function for click event for button
  document.getElementById('paste-instances').addEventListener('click', pasteInstances, false);
  //document.getElementById('update-instances').addEventListener('click', updateInstances, false);
  document.getElementById('copy-instances').addEventListener('click', copyInstances, false);
  
  function getIndex(thearray, thestring)
  {
      var k = -1;
      for (var i = 0; i < thearray.length; i++) {
          if (thearray[i].replace(/\s/g,'') === thestring.replace(/\s/g,'')) {
              k = i;
              break;
          }
      }
      return k;
  }
  
  function NSResolver(prefix) {
    return 'http://www.w3.org/1999/xhtml';
  }
  
  function triggerEvent(node, eventType) {
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent(eventType, true, true);
    //console.log('Dispatching event ' + eventType);
    node.dispatchEvent(clickEvent);
  }
  
  function pasteInstances(event) {
    var id = event.target.id;
    //console.log('Button ID = ' + id);
    var parsedData = parseInput();
    /*
    for (var i = 0; i < parsedData.length; ++i) {
      console.log("adding row " + i.toString());
      setTimeout(addEmptyRow, 100);
    }
    */
  
    //var button = document.getElementsByClassName('gwt-Button reset')
    //triggerEvent(button[0], 'click');
  
    //Clear All
    clearEmptyEC2(true);
    clearEmptyEBS(true);
  
    setTimeout(function () {
  
        addingRows(parsedData.length, function () {
            startPolling(parsedData);
        });
  
    },1000);
  }
  
  function updateInstances(event) {
    var id = event.target.id;
    //console.log('Button ID = ' + id);
    var parsedData = parseInput();
    startPolling(parsedData);
  }
  
  function pressUIButton(button, callback) {
    triggerEvent(button, 'mouseover');
    triggerEvent(button, 'mousedown');
    triggerEvent(button, 'click');
    triggerEvent(button, 'mouseup');
    triggerEvent(button, 'pointerup');
    if (typeof callback != 'undefined') {
      if (typeof callback == 'function') {
              callback();
      }
    }
  }
  
  function startPolling(parsedData) {
    console.log("start polling");
    let counter = 1;
    intValId = setInterval(function() {
      valuesLoaded(counter, function() {
        fillEC2Rows(parsedData);
        pasteEBS(parsedData, () => {
            pasteEBSIOPS(parsedData);
        });
  
        updateEC2InstanceData(parsedData);
        updateEC2BillingData(parsedData);
  
        setTimeout(function () {
            clearEmptyEC2(false);
            clearEmptyEBS(false);
        },1000);
      })
      counter++;
    }, 300);
  }
  
  function clearEmptyEC2(clearall)
  {
      //EC2
      var query = '//table[contains(@class,"SF_EC2_INSTANCE_FIELD_INSTANCES")]//input[@type="text"]';
      var fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var jj = 0; jj < fields.snapshotLength; ++jj) {
          var field = fields.snapshotItem(jj);
          //console.log(field.value);
          if(parseInt(field.value) == 0 || parseInt(field.value) == 999 || clearall)
          {
              query = '../../../../../../td[contains(@class,"firstCell")]//div[@role="button"]';
              var myfields = document.evaluate(query, field, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
              //console.log('Found fields = ' + fields);
              // expect the button to be the only item
              var button = myfields.iterateNext();
              pressUIButton(button);
              console.log("Removing EC2 row "+jj);
          }
      }
  }
  
  function clearEmptyEBS(clearall)
  {
      var query = '//tr[contains(@class,"EBSVolumeRow")]';
      var rows = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
      for (var kt = 0; kt < rows.snapshotLength; ++kt)
      {
          var result = {};
  
          var row = rows.snapshotItem(kt);
  
          query = './/td//input[@type="text"]';
          var fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var jz = 0; jz < fields.snapshotLength; ++jz) {
              var field = fields.snapshotItem(jz);
  
              if(jz == 2) //2 # Volumes
              {
                  var ebsvolumes = field.value;
  
                  if(parseInt(ebsvolumes) == 0 || parseInt(ebsvolumes) == 999 || clearall)
                  {
                      query = '../../../../../../td[contains(@class,"firstCell")]//div[@role="button"]';
                      var myfields = document.evaluate(query, field, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
                      //console.log('Found fields = ' + fields);
                      // expect the button to be the only item
                      var button = myfields.iterateNext();
                      pressUIButton(button);
                      console.log("Removing EBS row "+jz);
                  }
              }
          }
      }
  }
  
  function closeDialog(callback) {
    var fields = document.evaluate('//button[contains(text(),"Close and Save")]', document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var closeButton = fields.iterateNext();
    //console.log('Found the close and save button');
    //console.log(closeButton);
    triggerEvent(closeButton, 'click');
  }
  
  function parseInput() {
    var query,
    fields;
    var parsedData = [
    ];
    query = '//textarea[@id="paste-data"]';
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var pasteText = fields.snapshotItem(0).value;
    var lines = pasteText.split('\n');
    console.log ("Input to parse has " + lines.length + " rows.");
    for (var i = 0; i < lines.length; ++i) {
      if (lines[i] != "") {
          fields = lines[i].split('\t');
          if (i == 0) { console.log ("Input line " + i + " has " + fields.length + " fields.") };
          var description,
              instances,
              //usageString,
              usage,
              usageType, //NEW
              usageTypeString,
              instanceType,
              os,
              osString,
              billing, //NEW
              billingString,
              ebsname, //NEW
              ebsvolumes, //NEW
              ebssnapshotstorage, //NEW
              ebssnapshotinterval, //NEW
              ebssnapshotintervalString,
              ebsSize,
              ebsType,
              ebsPiops,
              ebsSizeString,
              ebsTypeString,
              ebsPIOPSString
          ;
  
          description = fields[0];
          instances = fields[1];
          usage = fields[2];
          //usage = usageString.slice(0, - 1); // chop off trailing '%' sign
          usageTypeString = fields[3];
          instanceType = fields[4];
          osString = fields[5];
          billingString = fields[6];
  
          ebsname = fields[7];
          ebsvolumes = fields[8];
          ebsTypeString = fields[9];
          ebsSizeString = fields[10];
          ebsPIOPSString = fields[11];
          ebssnapshotstorage = fields[12];
          ebssnapshotintervalString = fields[13];
  
          if (instances != parseInt(instances, 10))
          { instances = 0; }
  
          if (ebsvolumes != parseInt(ebsvolumes, 10))
          { ebsvolumes = 0; }
  
          if(instances == 0 || instances == "")
          {instances = 999;}
  
          if(ebsvolumes == 0 || instances == "")
          {ebsvolumes = 999;}
  
              os = EC2_OS_MAPPING[osString];
              if (os == undefined) {
                  // default to Linux if no matching OS found
                  os = EC2_OS_MAPPING['Linux'];
              }
  
              // round up to next Integer
              ebsSize = Math.ceil(parseFloat(ebsSizeString));
  
              ebsType = getIndex(EBS_VOLUME_TYPES,ebsTypeString);
              if (ebsType == - 1) {
                  // default to gp2
                  ebsType = 0;
              }
  
              usageType = getIndex(EC2_USAGE_TYPES,usageTypeString);
              if (usageType == - 1) {
                  // default to %
                  usageType = 0;
              }
  
              billing = getIndex(EC2_BILLING_TYPES,billingString);
              if (billing == - 1) {
                  // default to %
                  billing = 0;
              }
  
              ebssnapshotinterval = getIndex(EBS_SNAPSHOT_TYPES,ebssnapshotintervalString);
              if (ebssnapshotinterval == - 1) {
                  // default to GB-month
                  ebssnapshotinterval = 0;
              }
  
              if (ebsPIOPSString != "") {
                  ebsPiops = parseInt(ebsPIOPSString);
              } else {
                  ebsPiops = parseInt(ebsSize) * 4;
              }
  
              console.log('Desc=' + description + ',Instances=' + instances + ',Usage=' + usage + ',UsageType=' + usageType + ',InstanceType=' + instanceType + ',OS=' + os + ',Billing=' + billing + ',EBSName=' + ebsname + ',EBSVolumes=' + ebsvolumes + ',EBSSize=' + ebsSize + ',EBSType=' + ebsType + ',EBSPIOPS=' + ebsPiops + ',EBSsnapshot=' + ebssnapshotstorage + ',EBSsnapshotinterval=' + ebssnapshotinterval);
              var row = [
                  description,
                  instances,
                  usage,
                  instanceType,
                  os,
                  usageType,
                  billing,
                  ebsname,
                  ebsvolumes,
                  ebsType,
                  ebsSize,
                  ebsPiops,
                  ebssnapshotstorage,
                  ebssnapshotinterval
              ];
              parsedData.push(row);
      }
    }
    console.log('parsed ' + parsedData.length + ' rows from input');
    return parsedData;
  }
  
  function addingRows(numRows, callback) {
    if (numRows >= 1) {
      var newNum = numRows - 1;
      console.log("calling addingRows " + newNum.toString());
      setTimeout(function () {
        addingRows(newNum, callback)
      }, 10);
      addEmptyRow();
    } else {
      if (typeof callback != 'undefined') {
        if (typeof callback == 'function') {
                callback();
        }
      }
    }
  }
  
  function addEmptyRow() {
  
    //EC2
    // find Instances Add New Row button
    var query = '//div[contains(@class,"Instances rowsSection")]/table/tbody/tr[contains(@class,"footer")]/td/div[contains(@class,"TABLE_COMMON_ADD_MORE")]/../..//div[@role="button"]';
    var fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    //console.log('Found fields = ' + fields);
    // expect the button to be the only item
    var button = fields.iterateNext();
    //console.log('Found the Instances Add New Row button');
    //console.log(button);
    // press button to add a row
    pressUIButton(button);
  
    //EBS
    // find Volumes Add New Row button
    query = '//div[contains(@class,"Volumes rowsSection")]/table/tbody/tr[contains(@class,"footer")]/td/div[contains(@class,"TABLE_COMMON_ADD_MORE")]/../..//div[@role="button"]';
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    //console.log('Found fields = ' + fields);
    // expect the button to be the only item
    button = fields.iterateNext();
    //console.log('Found the Volumes Add New Row button');
    //console.log(button);
    // press button to add a row
    pressUIButton(button);
  }
  
  function fillEC2Rows(parsedData) {
    var query;
    var fields;
    // Set values for the simple Input fields
    for (var i = 0; i < INSTANCE_INPUT_FIELD_NAMES.length; ++i) {
      var inputFieldName = INSTANCE_INPUT_FIELD_NAMES[i];
      query = '//table[contains(@class,"' + inputFieldName + '")]//input[@type="text"]';
      //console.log('Query = ' + query);
      fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      //console.log('Found ' + fields.snapshotLength + ' ' + inputFieldName + ' input fields = ' + fields);
      // set input values
  
      var k = parsedData.length -1;
      //for (var j = 0; j > fields.snapshotLength; ++j) {
      for (var j = fields.snapshotLength - 1; j >= 0; j--){
        var input = fields.snapshotItem(j);
        if(k >= 0)
        {
            input.value = parsedData[k][i];
            k--;
            // dispatch change event
            var evt = new KeyboardEvent("change", {
                bubbles: true,
                cancelable: true,
                view: window
            });
            input.dispatchEvent(evt);
        }
      }
    }
  
    setUsageType(parsedData);
  }
  
  //Set Usage Type
  function setUsageType(parsedData)
  {
      var query = '//tr[contains(@class,"EC2InstanceRow")]';
      var rows = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
      for (var k = 0; k < rows.snapshotLength; ++k)
      {
          var result = {};
  
          var row = rows.snapshotItem(k);
  
          query = './/td//select';
          var fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var vz = 0; vz < fields.snapshotLength; ++vz) {
              var field = fields.snapshotItem(vz);
  
              if(vz == 0) //Usage Type
              {
                  field.value = parsedData[k][5];
                  //console.log(field.value);
                  var evt = new Event("change", {
                      bubbles: true,
                      cancelable: true,
                      view: window
                  });
                  field.dispatchEvent(evt);
              }
          }
      }
  }
  
  function updateEC2BillingData(parsedData) {
    var query;
    var fields;
    query = '//div[contains(@class,"SF_COMMON_FIELD_BILLING")]/../..//img[@class="gwt-Image"]';
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //console.log('Found ' + fields.snapshotLength + ' BillingType buttons = ' + fields);
    updateSingleInstanceBillingData(parsedData, fields, 0);
  }
  
  function updateSingleInstanceBillingData(parsedData, fields, index) {
    if (index < fields.snapshotLength) {
      var button = fields.snapshotItem(index);
      setTimeout(function() {
        var newIndex = index + 1;
        //console.log("calling again for: " + newIndex.toString())
        updateSingleInstanceBillingData(parsedData, fields, newIndex);
      }, 20);
      console.log("Open billing dialog for " + parsedData[index][0] + " select " + parsedData[index][6]);
  
      if(parsedData[index][6] != "")
      {
          pressUIButton(button, function() {
              setBillingType(parsedData[index][6], function() {
                  closeDialog();
              });
          });
      }
    }
  }
  
  function setBillingType(billingType, callback) {
    var query,
    fields,
    radioButton;
    //console.log("START instance data for " + instanceType + ";");
    query = '//input[@name="SelectorDialogType"]';
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //radioButton = fields.iterateNext();
    //console.log('BillingType Radio Button =' + radioButton);
  
    for (var vz = 0; vz < fields.snapshotLength; ++vz)
    {
        var field = fields.snapshotItem(vz);
  
        //console.log(billingType);
  
        if(vz == billingType) //Billing Type
        {
            radioButton = field;
        }
    }
  
    if (radioButton) {
      // select the InstanceType
      //console.log('Pressing InstanceType Radio Button=', radioButton.innerHTML);
      radioButton.click();
      //pressUIButton(radioButton);
    }
    //console.log("STOP instance data for " + instanceType + ";");
    if (typeof callback != 'undefined') {
      if (typeof callback == 'function') {
              callback();
      }
    }
  }
  
  function updateEC2InstanceData(parsedData) {
    var query;
    var fields;
    query = '//div[contains(@class,"SF_EC2_INSTANCE_FIELD_TYPE")]/../..//img[@class="gwt-Image"]';
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //console.log('Found ' + fields.snapshotLength + ' InstanceType buttons = ' + fields);
    updateSingleInstanceData(parsedData, fields, 0);
  }
  
  function updateSingleInstanceData(parsedData, fields, index) {
    if (index < fields.snapshotLength) {
      var button = fields.snapshotItem(index);
      setTimeout(function() {
        var newIndex = index + 1;
        //console.log("calling again for: " + newIndex.toString())
        updateSingleInstanceData(parsedData, fields, newIndex);
      }, 20);
      console.log("Open instance dialog for " + parsedData[index][0]);
      pressUIButton(button, function() {
        setOS(parsedData[index][4], function() {
          setInstanceType(parsedData[index][3], function() {
            closeDialog();
          });
        });
      });
    }
  }
  
  function setInstanceType(instanceType, callback) {
    var query,
    fields,
    radioButton;
    //console.log("START instance data for " + instanceType + ";");
    query = '//div[text()="' + instanceType + '"]' + '/../..//input[@name="SelectorDialogType"]';
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    radioButton = fields.iterateNext();
    //console.log('InstanceType Radio Button =' + radioButton);
  
    if (radioButton) {
      // select the InstanceType
      //console.log('Pressing InstanceType Radio Button=', radioButton.innerHTML);
      radioButton.click();
      //pressUIButton(radioButton);
    }
    //console.log("STOP instance data for " + instanceType + ";");
    if (typeof callback != 'undefined') {
      if (typeof callback == 'function') {
              callback();
      }
    }
  }
  
  function setOS(operatingSystem, callback) {
    var query,
    fields,
    radioButton;
    //console.log("START OS data for " + operatingSystem);
    // set the OperatingSystem
    query = '//input[@name="SelectorDialogOS"]/../..//label[text()="' + operatingSystem + '"]';
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    //console.log('Fields=', fields);
    radioButton = fields.iterateNext();
    //console.log('Found OS Selector button = ' + radioButton);
    if (radioButton) {
      radioButton.click();
    }
    //console.log("STOP OS data for " + operatingSystem);
    if (typeof callback != 'undefined') {
      if (typeof callback == 'function') {
              callback();
      }
    }
  }
  
  function pasteEBS(parsedData, callback) {
  
    var query;
    // set Description
    query = '//tr[contains(@class,"EBSVolumeRow")]//table[@class="field textField"]//input[@class="gwt-TextBox input"]';
    setEBSFieldValues(query, parsedData, 7);
    // set Volumes
    query = '//tr[contains(@class,"EBSVolumeRow")]//table[@class="field integerNumericField"]//input[@class="gwt-TextBox numericTextBox input"]';
    setEBSFieldValues(query, parsedData, 8);
    // set EBS Type
    query = '//table[contains(@class,"SF_EC2_EBS_FIELD_TYPE")]//select[contains(@class,"listBox")]';
    setEBSFieldValues(query, parsedData, 9);
    // set Storage Size
    query = '//table[contains(@class,"SF_EC2_EBS_FIELD_STORAGE")]//input[@type="text"]';
    setEBSFieldValues(query, parsedData, 10);
    // set Storage Snapshot Size
    query = '//table[contains(@class,"SF_EC2_EBS_FIELD_SNAPSHOT_STORAGE")]//input[@type="text"]';
    setEBSFieldValues(query, parsedData, 12);
    // set Storage Snapshot Interval
    query = '//table[contains(@class,"SF_EC2_EBS_FIELD_SNAPSHOT_STORAGE")]//select';
    setEBSFieldValues(query, parsedData, 13);
    // now paste the EBS PIOPS values
    pasteEBSIOPS(parsedData);
  }
  
  function setEBSFieldValues(query, parsedData, index) {
    var fields;
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //console.log('Found ' + fields.snapshotLength + ' fields = ' + fields);
    for (var j = 0; j < fields.snapshotLength; ++j) {
      var field = fields.snapshotItem(j);
      field.value = parsedData[j][index];
      // dispatch change event
      //var event = document.createEvent('KeyboardEvent');
      //event.initEvent('change', true, true);
      //field.dispatchEvent(event);
      var evt = new Event("change", {
          bubbles: true,
          cancelable: true,
          view: window
      });
      field.dispatchEvent(evt);
    }
  }
  
  function pasteEBSIOPS(parsedData) {
    var query;
    // For PIOPS Volumes only: set IOPS
    query = '//table[contains(@class,"SF_EC2_EBS_FIELD_AVERAGE_IOPS")]//input[@type="text"]';
    var fields;
    //console.log('Query = ' + query);
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
    setTimeout(() => {
        setEBSPIOPS(parsedData, fields, 0, 9, 11);
    }, 1000);
  }
  
  function setEBSPIOPS(parsedData, fields, rowIndex, typeIndex, valueIndex) {
      if (rowIndex < fields.snapshotLength) {
          var field = fields.snapshotItem(rowIndex);
          setTimeout(() => {
              console.log("Calling PIOPS for...", rowIndex, " times.");
              rowIndex++;
              setEBSPIOPS(parsedData, fields, rowIndex, 9, 11);
          }, 20);
          if (parsedData[rowIndex][typeIndex] == 1) {
              console.log('Setting PIOPS for row = ' + parsedData[rowIndex][0] + ' value=' + parsedData[rowIndex][valueIndex]);
              //console.log(field);
              field.value = parsedData[rowIndex][valueIndex];
              var evt = new KeyboardEvent("change");
              field.dispatchEvent(evt);
          } // dispatch change event
      }
  }
  
  function valuesLoaded(counter, callback) {
    console.log("checking for prices..." + counter + " times now");
    var query;
    var fields;
  
    if (counter % 10 == 0) {
        query = '//div[contains(@class,"SF_EC2_INSTANCE_FIELD_TYPE")]/../..//img[@class="gwt-Image"]';;
        fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);;
        var button = fields.snapshotItem(0);
        pressUIButton(button, function() {
            closeDialog();
        });
    }
  
    query = '//div[contains(@class,"gwt-HTML DynamicPrice DynamicPricePricing")]';
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var price = fields.iterateNext();
    if (price != null) {
      console.log ("prices loaded");
      clearInterval(intValId);
      if (typeof callback != 'undefined') {
        if (typeof callback == 'function') {
                callback();
        }
      }
    }
  }
  
  function copyInstances()
  {
      var field;
      var fields;
      var query;
      var results = [];
  
      //EC2
      query = '//tr[contains(@class,"EC2InstanceRow")]';
      var rows = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
      for (var k = 0; k < rows.snapshotLength; ++k)
      {
          var result = {};
  
          var row = rows.snapshotItem(k);
  
          //SF_EC2_INSTANCE_FIELD_DESCRIPTION
          query = './/table[contains(@class,"SF_EC2_INSTANCE_FIELD_DESCRIPTION")]//input[@type="text"]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var j = 0; j < fields.snapshotLength; ++j) {
              field = fields.snapshotItem(j);
              //console.log(field.value);
              result.ec2name = field.value;
          }
  
          //SF_EC2_INSTANCE_FIELD_INSTANCES
          query = './/table[contains(@class,"SF_EC2_INSTANCE_FIELD_INSTANCES")]//input[@type="text"]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var jj = 0; jj < fields.snapshotLength; ++jj) {
              field = fields.snapshotItem(jj);
              //console.log(field.value);
              result.ec2instances = field.value;
          }
  
          //SF_EC2_INSTANCE_FIELD_USAGE
          query = './/table[contains(@class,"SF_EC2_INSTANCE_FIELD_USAGE")]//input[@type="text"]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var pp = 0; pp < fields.snapshotLength; ++pp) {
              field = fields.snapshotItem(pp);
              //console.log(field.value);
              result.ec2usage = field.value;
          }
  
          //USAGE TYPE
          query = './/td//select';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var vz = 0; vz < fields.snapshotLength; ++vz) {
              field = fields.snapshotItem(vz);
  
              if(vz == 0) //Usage Type
              {result.ec2usagetype = field.options[field.selectedIndex].text;}
          }
  
          //SF_EC2_INSTANCE_FIELD_TYPE
          query = './/div[contains(@class,"SF_EC2_INSTANCE_FIELD_TYPE")]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var i = 0; i < fields.snapshotLength; ++i) {
              field = fields.snapshotItem(i);
  
              //console.log(field.textContent);
              var tmp = field.textContent.split("on");
  
              result.ec2os = EC2_OS_MAPPING_REV[tmp[0].replace(/\s/g,'')];
              if (result.ec2os == undefined) {
              // default to Linux if no matching OS found
              result.ec2os = EC2_OS_MAPPING_REV['Linux'];
              }
  
              result.ec2instancetype = tmp[1].trim();
          }
  
          //SF_COMMON_FIELD_BILLING
          query = './/div[contains(@class,"SF_COMMON_FIELD_BILLING")]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var ll = 0; ll < fields.snapshotLength; ++ll) {
              field = fields.snapshotItem(ll);
  
              //console.log(field.textContent);
  
              //result.ec2billing = EC2_OS_BILLING[field.textContent];
              //if (result.ec2billing == undefined) {
              // default to OnDemand if no matching found
              //result.ec2billing = EC2_OS_BILLING['On-Demand (No Contract)'];
              result.ec2billing = field.textContent;
              //}
          }
  
          if(result.ec2instances > 0)
          {
              result.ebsname = "EC2 only";
              result.ebsvolumes = 0;
              result.ebstype = "";
              result.ebssize = "";
              result.ebsiops = "";
              result.ebssnapshotstorage = "";
              result.ebssnapshotinterval = "";
              results.push(result);
          }
  
      }
  
      //EBS
      query = '//tr[contains(@class,"EBSVolumeRow")]';
      rows = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
      for (var kt = 0; kt < rows.snapshotLength; ++kt)
      {
          result = {};
  
          row = rows.snapshotItem(kt);
  
          query = './/td//input[@type="text"]';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var jz = 0; jz < fields.snapshotLength; ++jz) {
              field = fields.snapshotItem(jz);
  
              if(jz == 1) //1 Description
              {result.ebsname = field.value;}
              else if(jz == 2) //2 # Volumes
              {result.ebsvolumes = field.value;}
              else if(jz == 3) //3 Size
              {result.ebssize = field.value;}
              else if(jz == 4) //4 IOPS
              {result.ebsiops = field.value;}
              else if(jz == 6) //6 Snapshot Storage
              {result.ebssnapshotstorage = field.value;}
          }
  
          query = './/td//select';
          fields = document.evaluate(query, row, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (var ez = 0; ez < fields.snapshotLength; ++ez) {
              field = fields.snapshotItem(ez);
  
              if(ez == 0) //Volume Type
              {result.ebstype = field.options[field.selectedIndex].text;}
              else if(ez == 1) //Snapshot Storage
              {result.ebssnapshotinterval = field.options[field.selectedIndex].text;}
          }
  
          if(result.ebsvolumes > 0)
          {
              result.ec2name = "EBS only";
              result.ec2instances = 0;
              result.ec2usage = "";
              result.ec2usagetype = "";
              result.ec2instancetype = "";
              result.ec2os = "";
              result.ec2billing = "";
              results.push(result);
          }
      }
  
      console.log(results);
  
      //Output
      document.getElementById('paste-data').value = "";
      for (var rr = 0; rr < results.length; ++rr) {
          var line = results[rr];
          document.getElementById('paste-data').value += line.ec2name + "\t" + line.ec2instances + "\t" + line.ec2usage + "\t" + line.ec2usagetype + "\t" + line.ec2instancetype + "\t" + line.ec2os + "\t" + line.ec2billing + "\t" + line.ebsname + "\t" + line.ebsvolumes + "\t" + line.ebstype + "\t" + line.ebssize + "\t" + line.ebsiops + "\t" + line.ebssnapshotstorage + "\t" + line.ebssnapshotinterval;
          if(rr < results.length -1)
          {document.getElementById('paste-data').value += "\n";}
      }
  
      /* Select the text field */
      document.getElementById('paste-data').select();
  
      /* Copy the text inside the text field */
      document.execCommand("copy");
  }  
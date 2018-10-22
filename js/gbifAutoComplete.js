window.addEventListener("load", function() {

    // Add a keyup event listener to our input element
    var name_input = document.getElementById('gbif_autocomplete_name');
    name_input.addEventListener("keyup", function(event) {gbifAutoComplete(event);});

    if (document.getElementById("getTaxonKey")) {
        // Add a listener to handle the 'Get Taxon Key' button click
        document.getElementById("getTaxonKey").addEventListener("click", function() {
            var data = getAllData();
            var info = '';
            Object.keys(data).forEach(function(key) {
                info += `${key}: ${data[key]}` + String.fromCharCode(13);
            });
            alert(info);
        });
    }

    // create one global XHR object 
    // this allows us to abort pending requests when a new one is made
    window.gbifXHR = new XMLHttpRequest();
});

// Autocomplete for text input with list
function gbifAutoComplete(event) {
    var auto_list = false;
    var input = false;
    var visi_list = false;
    var load_status = false;
    
    if (document.getElementById('event_key')) {document.getElementById('event_key').innerHTML = `event key: ${event.key}`;}
    
    //check event key and don't process some buttons to allow drop-down selection
    if (!validNameInput(event.key)) {
        return;
    }
    
    // retireve the input element
    input = document.getElementById('gbif_autocomplete_name');

    // retrieve the datalist element
    auto_list = document.getElementById('gbif_autocomplete_list');

    // retrieve the text area list element
    if (document.getElementById('visi_list')) {
        visi_list = document.getElementById('visi_list');
    }

    // retrieve the load status label and set text
    if (document.getElementById('load_status')) {
        load_status = document.getElementById('load_status');
        load_status.value = `Loading...`;
    }

    //need at least one character to search...
    if (input.value.length < 1) {
        // clear any previously loaded options in the datalist
        auto_list.innerHTML = "";
        if (visi_list) {visi_list.value = "";}
        return;
    } else { 

        // abort any pending requests
        window.gbifXHR.abort();

        window.gbifXHR.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {

                // We're expecting a json response so we convert it to an object
                var response = JSON.parse( this.responseText ); 

                // clear any previously loaded options in the datalist
                auto_list.innerHTML = "";
                if (visi_list) {visi_list.value = "";}
                
                //update the request status message
                if (load_status) {//load_status.value = "";
                }

                response.forEach(function(item) {
                    // Create a new <option> element.  ***THE ARGUMENT MUST BE 'option'***
                    var option = document.createElement('option', { is : 'gbif_autocomplete_option  ' }); //***THE ARGUMENT MUST BE 'option'***
                    option.value = item.canonicalName;
                    option.setAttribute('taxonKey', item.key);
                    option.setAttribute('allData', JSON.stringify(item));

                    // attach the option to the datalist element
                    auto_list.appendChild(option);
                    if (visi_list) {visi_list.value += item.canonicalName + String.fromCharCode(13);}
                });
            }
        };
        var api_url = "http://api.gbif.org/v1/species/suggest?q=" + input.value;
        if (document.getElementById('api_query')) {document.getElementById('api_query').innerHTML=api_url;}
        window.gbifXHR.open("GET", api_url, true);
        window.gbifXHR.send();
    }
}

function validNameInput(str) {
{
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(str))
    {
      return false;
    }
  }
  return true;
}

function getSelectedItemData(dataItem) {
    var data = null;

    // Get the input element
    var auto_name = document.getElementById('gbif_autocomplete_name');
    // Get the datalist
    var auto_list = document.getElementById('gbif_autocomplete_list');

    // If we find the input inside our list, get the taxonKey, else return null
    for (var element of auto_list.children) {
        if (element.value == auto_name.value) {
            data = element.getAttribute(dataItem);
        }
    }
    
    return data;
}

export function getTaxonKey() {
    return getSelectedItemData('taxonKey');
}

export function getAllData() {
    return JSON.parse(getSelectedItemData('allData'));
}
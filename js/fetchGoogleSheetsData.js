import { googleApiKey } from "./secrets.js";

let defaultSheetIds = {
    "signUps": '1O5fk2pDQCg_U4UNzlYSbewRJs4JVgonKEjg3jzDO6mA',
    "vernacular": '17_e15RB8GgpMVZgvwkFHV8Y9ZgLRXg5Swow49wZsAyQ'
}

export async function fetchGoogleSheetData(spreadsheetId=defaultSheetIds.signUps, sheetNumber=0) {
    let apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?key=${googleApiKey}&includeGridData=true`;

    try {
        let res = await fetch(apiUrl);
        console.log(`fetchGoogleSheetData(${spreadsheetId},${sheetNumber}) RESULT:`, res);
        if (res.status > 299) {return res;}
        let json = await res.json();
        console.log(`fetchGoogleSheetData(${spreadsheetId}) RESULT:`, json);
        let prop = json.sheets[sheetNumber].properties.title;
        let head = json.sheets[sheetNumber].data[0].rowData[0].values;
        let data = json.sheets[sheetNumber].data[0].rowData.slice(1);
        console.log(`Sheet-${sheetNumber} properties:`, prop);
        console.log(`Sheet-${sheetNumber} row header:`, head);
        console.log(`Sheet-${sheetNumber} row data:`, data);
        return {'properties':prop, 'head':head, 'rows':data};
    } catch (err) {
        console.log(`fetchGoogleSheetData(${spreadsheetId}) ERROR:`, err);
        return new Error(err)
    }
}

export async function getSignups(sheetNumber=0) {
    try {
        let res = await fetchGoogleSheetData(defaultSheetIds.signUps, sheetNumber);
        console.log('getSignups RESULT:', res);
        if (res.status > 299) {return res;}
        let sign = [];
        res.rows.forEach(row => {
            sign[row.values[1].formattedValue] = {
                'last':row.values[4].formattedValue, 
                'first':row.values[3].formattedValue,
                'date':row.values[0].formattedValue
            }
    })
    return sign;
    } catch(err) {
        console.log(`getSignups(${sheetNumber}) ERROR:`, err);
        return new Error(err)
    }
}

export async function getVernaculars(sheetNumber=0) {
    try {
        let res = await fetchGoogleSheetData(defaultSheetIds.vernacular, sheetNumber);
        console.log('getVernaculars RESULT:', res);
        if (res.status > 299) {return res;}
        let name = [];
        res.rows.forEach((row,rid) => {
            //console.log('row:', rid);
            let data = {}
            //res.head.forEach((col,idx) => {
            for (var i=0; i<res.head.length; i++) {
                //console.log('head:', i, res.head[i].formattedValue);
                //console.log('col:', i, row.values[i] ? row.values[i].formattedValue : null);
                data[res.head[i].formattedValue] = row.values[i] ?  row.values[i].formattedValue : null;
                //console.log('data', data);
            }
            if (name[data.taxonId]) {
                name[data.taxonId].push(data);
                //console.log('duplicate', name[data.taxonId]);
            } else {
                name[data.taxonId] = [];
                name[data.taxonId][0] = data;
            }
        })
        //console.log('getVernaculars 2D ARRAY', name);
        return name;
    } catch(err) {
        console.log(`getVernaculars(${sheetNumber}) ERROR:`, err);
        return new Error(err)
    }
}
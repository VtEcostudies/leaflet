import { googleApiKey } from "./secrets.js";

let defaultSheetId = '1O5fk2pDQCg_U4UNzlYSbewRJs4JVgonKEjg3jzDO6mA';

export async function fetchGoogleSheetData(spreadsheetId=defaultSheetId, sheetNumber=0) {
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
        let res = await fetchGoogleSheetData(defaultSheetId, sheetNumber);
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
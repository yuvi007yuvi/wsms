const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const csvPath = path.resolve('../total vehicles.csv');
const excelPath = path.resolve('../total vehicles.xlsx');

// Read the CSV file
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
const headers = lines[0].split(',');
const csvData = [];
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => {
        obj[h] = values[idx];
    });
    csvData.push(obj);
}

// Read the Excel file
let workbook;
if (fs.existsSync(excelPath)) {
    workbook = xlsx.readFile(excelPath);
} else {
    workbook = xlsx.utils.book_new();
}

let sheetName = workbook.SheetNames[0] || 'Sheet1';
let existingData = [];
if (workbook.Sheets[sheetName]) {
    existingData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

// Keep track of existing vehicle numbers to avoid duplicates
const existingVehicles = new Set(existingData.map(r => r.VehicleNo).filter(Boolean));

let addedCount = 0;
// Append new data
csvData.forEach(row => {
    if (!existingVehicles.has(row.VehicleNo)) {
        existingData.push(row);
        existingVehicles.add(row.VehicleNo);
        addedCount++;
    }
});

// Update the sheet
const newSheet = xlsx.utils.json_to_sheet(existingData);
if (!workbook.Sheets[sheetName]) {
    xlsx.utils.book_append_sheet(workbook, newSheet, sheetName);
} else {
    workbook.Sheets[sheetName] = newSheet;
}

// Write the file
xlsx.writeFile(workbook, excelPath);

console.log(`Successfully added ${addedCount} new vehicles out of ${csvData.length} in the CSV.`);

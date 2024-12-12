let scannedData = "";
let ScanAddItem = false; 
let ScanTakeItem = false;
let ScanDeleteItem = false;
let ScanEditItem = false;
let scannedItemsTable = [];

async function createHTMLTable(items){
    scannedItemsTable = document.getElementById('scanned-items-table');
    scannedItemsTable.innerHTML = ""; 

    // Create table headers
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>ID</th>
        <th>Name</th>
        <th>Specifications</th>
        <th>Quantity</th>
        <th>Condition</th>
        <th>Extra</th>
        <th>Occupant</th>
        <th>Barcode</th>
    `;
    scannedItemsTable.appendChild(headerRow);

    // Populate table rows
    items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.specs}</td>
            <td>${item.quantity}</td>
            <td>${item.status}</td>
            <td>${item.category}</td>
            <td>${item.occupant}</td>
            <td>${item.barcode}</td>
        `;
        scannedItemsTable.appendChild(row);
    });
}

async function loadScannedItems() {
    try {
        const response = await fetch('/barcodes'); // Fetch items from the server
        if (response.ok) {
            const items = await response.json(); // Parse the JSON response
            createHTMLTable(items);
        } else {
            console.error('Failed to load scanned items.');
        }
    } catch (error) {
        console.error('Error fetching scanned items:', error);
    }
}

// async function loadAssignedItems(){
//   // Fetch data from the backend
//   fetch('/get-assigned-items')
//   .then(response => response.json())
//   .then(data => {
//       Object.entries(data).forEach(([userName, items]) => {
//           // Create a title for the user
//           const userTitle = document.createElement('h2');
//           userTitle.textContent = userName;
//           output.appendChild(userTitle);

//           // Create a table for the user's items
//           const table = document.createElement('table');
//           table.border = '1';
//           table.style.marginBottom = '20px';

//           // Create table headers
//           const headerRow = document.createElement('tr');
//           const headers = ['Item Name', 'Barcode', 'Quantity'];
//           headers.forEach(headerText => {
//               const th = document.createElement('th');
//               th.textContent = headerText;
//               headerRow.appendChild(th);
//           });
//           table.appendChild(headerRow);

//           // Populate table rows
//           items.forEach(item => {
//               const row = document.createElement('tr');
//               const itemCell = document.createElement('td');
//               itemCell.textContent = item.item_name;

//               const barcodeCell = document.createElement('td');
//               barcodeCell.textContent = item.barcode;

//               const quantityCell = document.createElement('td');
//               quantityCell.textContent = item.quantity;

//               row.appendChild(itemCell);
//               row.appendChild(barcodeCell);
//               row.appendChild(quantityCell);
//               table.appendChild(row);
//           });

//           // Append the table to the output div
//           output.appendChild(table);
//       });
//   })
//   .catch(error => console.error('Error fetching data:', error));
// }

// Event listener for buttons
document.getElementById("add-item-button").addEventListener("click", () => {
    if (ScanAddItem){
        ScanAddItem = false; ScanDeleteItem = false; ScanTakeItem = false; ScanEditItem = false;
        document.getElementById("output").textContent = "";
    }
    else{
        ScanAddItem = true;
        document.getElementById("output").textContent = "Scan Barcode...";
    }
});

document.getElementById("take-item-button").addEventListener("click", () => {
    if(ScanTakeItem){
        ScanAddItem = false; ScanDeleteItem = false; ScanTakeItem = false; ScanEditItem = false;
        document.getElementById("output").textContent = "";
    }
    else{
        ScanTakeItem = true;
        document.getElementById("output").textContent = "Scan Barcode...";
    }
});

document.getElementById("delete-item-button").addEventListener("click", () => {
    if(ScanDeleteItem){
        ScanAddItem = false; ScanDeleteItem = false; ScanTakeItem = false; ScanEditItem = false;
        document.getElementById("output").textContent = "";
    }
    else{
        ScanDeleteItem = true;
        document.getElementById("output").textContent = "Scan Barcode...";
    }
});

document.getElementById("edit-item-button").addEventListener("click", () => {
    if(ScanEditItem){
        ScanAddItem = false; ScanDeleteItem = false; ScanTakeItem = false; ScanEditItem = false;
        document.getElementById("output").textContent = "";
    }
    else{
        ScanEditItem = true;
        document.getElementById("output").textContent = "Scan Barcode...";
    }
});

document.getElementById("search-item-button").addEventListener("click", () => {
    const searchText = document.getElementById('search-input').value;
    searchItem(searchText);
});

document.getElementById('search-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('search-item-button').click(); // click button search
    }
});

// Load the saved items when the page loads
document.addEventListener("DOMContentLoaded", loadScannedItems);

// Event listener for barcode input
document.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        if (ScanAddItem) {
            addItem();
        }   
        else if (ScanTakeItem){
            takeItem();
        }
        else if (ScanDeleteItem){
            deleteItem();
        }
        else if (ScanEditItem){
            editItem();
        }
    } else {
        scannedData += event.key; // Append the key to the scanned data
    }   
});

function resetFlags(flag){
    scannedData = ""; // Reset scanned data
    flag = false; // Reset the flag
    document.getElementById("output").textContent = "";
    loadScannedItems();
}

async function addItem(){
    quantity = 1;
    if (scannedData.trim() !== "") {
        // First, check if the barcode already exists in the database
        try {
            const response = await fetch('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: scannedData }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.exists) {
                    // If barcode exists, show the quantity and inform the user
                    alert(`Item already exists with quantity: ${data.quantity}`);
                    quantity = data.quantity;
                } 
            } else {
                  // If barcode doesn't exist, prompt for the item name
                itemName = prompt("Enter Name:");
                itemSpecs = prompt("Enter Specs:");
                itemQuantity = prompt("Enter Quantity:");
                itemStatus = prompt("Enter Condition:");
                itemCategory = prompt("Enter Extra:");

                ifEmpty(itemSpecs) ? itemSpecs = "-" : itemSpecs;
                ifEmpty(itemQuantity) ? itemQuantity = 1 : itemQuantity;
                ifEmpty(itemStatus) ? itemStatus = "Άγνωστη" : itemStatus;
                ifEmpty(itemCategory) ? itemCategory = "-" : itemCategory;

                if (itemName) {
                    // Send the barcode and name to the server for saving
                        const saveResponse = await fetch('/save', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ barcode: scannedData, name: itemName, 
                                                     specs: itemSpecs, quantity: itemQuantity,
                                                     status: itemStatus, category: itemCategory }),
                        });

                        if (saveResponse.ok) {
                            console.log('Item saved successfully.');
                        } else {
                            console.error('Failed to save item.');
                        }
                  }
            }
        } catch (error) {
            console.error('Error checking barcode:', error);
        }
    }
    resetFlags(ScanAddItem);
}

function ifEmpty(value){
    if(value == null || value == ""){
        return true;
    }
    return false;
}

async function editItem(){
    if (scannedData.trim() == "") {
        alert("Please enter a barcode to delete.");
        return;
    }

    let response;
    const id = prompt("Enter ID to change its Barcode: (Click OK to edit by barcode)");
    try{
        if (id == null || id == "") {

            editFields = prompt("Edit all fields? (Click OK or specify field to edit)");

            // Search from barcode
            switch(editFields.toLowerCase()){
                case "name":
                    attr = "name"; 
                    value = prompt("Enter New Name:");
                    break;
                case "specifications":
                    attr = "specs";
                    value = prompt("Enter New Specs:");
                    break;
                case "quantity":
                    attr = "quantity";
                    value = prompt("Enter New Quantity:");
                    break;
                case "condition":
                    attr = "status";
                    value = prompt("Enter New Condition:");
                    break;
                case "extra":
                    attr = "category";
                    value = prompt("Enter New Extra:");
                    break;
                default:
                    itemName = prompt("Enter New Name:");
                    itemSpecs = prompt("Enter New Specs:");
                    itemQuantity = prompt("Enter New Quantity:");
                    itemStatus = prompt("Enter New Condition:");
                    itemCategory = prompt("Enter New Extra:");
                    break;
            }

            if(editFields === ""){
                // Make a POST request to the `/update-barcode` endpoint
                response = await fetch('/update-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: itemName, quantity: itemQuantity, 
                        specs: itemSpecs, status: itemStatus, category: itemCategory,  barcode: scannedData }),
                });  
            }
            else{
                // Make a POST request to the `/update-attr` endpoint
                response = await fetch('/update-attr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ barcode: scannedData, attr: attr, value: value }),
                });  
            }
        }
        else{
            // Make a POST request to the `/update-barcode` endpoint
            response = await fetch('/update-barcode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ barcode: scannedData, id: id }),
            });
        }
        
        if (response.ok) {
            console.log('Item edited successfully.');
        }
        else {
            console.error('Failed to edit item)');
        }  
    }
    catch(error){
        console.error('Error editing item:', error);
    }
    resetFlags(ScanEditItem);
}

async function takeItem(){

    if(!scannedData.trim() !== ""){ 
         // First, check if the barcode already exists in the database
         try {
            const response = await fetch('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: scannedData }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.exists) {
                    quantity = data.quantity;
                    const occuName = prompt("Enter the Occupant name:");

                if (occuName) {
               
                        const saveResponse = await fetch('/take', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ barcode: scannedData, occupant: occuName }),
                        });

                        if (saveResponse.ok) {
                            console.log('Item taken successfully.');
                        } else {
                            console.error('Failed to take item.');
                        }
                    } 
                }    
            }
            else{
                alert("Item not Found...");
            }
        }
        catch (error) {
            console.error('Error checking barcode:', error);
        }
    }
    resetFlags(ScanTakeItem);
}

async function deleteItem(){

    if (!scannedData.trim()) {
        alert("Please enter a barcode to delete.");
        return;
    }
    try {
        // Make a POST request to the `/delete` endpoint
        const response = await fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: scannedData }), // Send barcode in the request body
        });

        if (response.ok) {
            console.log('Item deleted successfully.');
        }
        else{
            console.error('Failed to delete item.');
        }
    }
    catch (error) {
        console.error('Error deleting item:', error);
        alert('An error occurred while deleting.');
    }
    resetFlags(ScanDeleteItem);
}

async function searchItem(searchText) {
    if (!searchText.trim()) {
        alert("Please enter a barcode to search.");
        return;
    }

    try {
        // Make a POST request to the `/search` endpoint
        const response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: searchText }), // Send barcode in the request body
        });

        if (response.ok) {
            // Parse the JSON response
            const items = await response.json();
            createHTMLTable(items)
        } else if (response.status === 404) {
            // Handle case where no items are found
            alert('No items found with that barcode.');
        } else {
            // Handle other errors
            const error = await response.json();
            alert(error.error || 'An error occurred while searching.');
        }
    } catch (error) {
        // Log and alert for any other errors
        console.error('Error searching item:', error);
        alert('An error occurred while searching.');
    }

    // Reset the search text input
    document.getElementById('search-input').value = '';
    scannedData = "";
}
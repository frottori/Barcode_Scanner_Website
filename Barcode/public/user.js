function createHTMLUserTable(data) {
    const container = document.getElementById('user-items-container');
    container.innerHTML = ''; // Clear any existing content

    Object.keys(data).forEach(userName => {
        const userInfo = data[userName];
        const userTable = document.createElement('table');
        userTable.border = '1';
        userTable.style.marginBottom = '20px';

        const caption = document.createElement('caption');
        caption.innerHTML = `
            <strong>${userName}</strong> - ${userInfo.am}<br>
            <strong>Email:</strong> ${userInfo.email}<br>
            <strong>Phone:</strong> ${userInfo.phone}
        `;
        userTable.appendChild(caption);

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Item Name</th>
            <th>Specifications</th>
            <th>Quantity</th>
            <th>Barcode</th>
        `;
        userTable.appendChild(headerRow);

        userInfo.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item_name}</td>
                <td>${item.item_specs}</td>
                <td>${item.quantity}</td>
                <td>${item.barcode}</td>
            `;
            userTable.appendChild(row);
        });

        container.appendChild(userTable);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-assigned-items')
        .then(response => response.json())
        .then(data => {
            createHTMLUserTable(data);
        })
        .catch(error => console.error('Error fetching assigned items:', error));
});

document.getElementById("search-user-button").addEventListener("click", async () => {
    const text = document.getElementById('user-search-input').value;
    if (!text) {
        window.location.reload();
        return;
    }

    try{
        // Make a POST request to the `/search` endpoint
        const response = await fetch('/search-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ AM: text }), // Send barcode in the request body
        });

        if (response.ok) {
            const items = await response.json();
            createHTMLUserTable(items);
        }
        else{
            alert('Error searching user');
        }
    }
    catch(err){
        console.error('Error searching user:', err);
    }

});

document.getElementById('user-search-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('search-user-button').click(); // click button search
    }
});

document.getElementById("add-user-button").addEventListener("click", async () => {

    const name = prompt("Enter Name:");
    const AM = prompt("Enter AM:");
    const email = prompt("Enter Email:");
    const phone = prompt("Enter Phone:");

    if (!name || !AM || !email || !phone) {
        alert('All fields are required');
        return;
    }

    try{
        const response  = await fetch('/add-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, AM, email, phone })
        });

        if (response.ok) {
            alert('User added successfully');
            window.location.reload();
        }
        else{
            alert('Error adding user');
        }
    }
    catch(err){
        console.error('Error adding user:', err);
    }
});

document.getElementById("edit-user-button").addEventListener("click", async () => {
    
        const AM = prompt("Enter AM to Edit:");
        const name = prompt("Enter New Name:");
        const email = prompt("Enter New Email:");
        const phone = prompt("Enter New Phone:");
    
        if (!AM || !name || !email || !phone) {
            alert('All fields are required');
            return;
        }
    
        try{
            const response  = await fetch('/edit-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, AM, email, phone })
            });
    
            if (response.ok) {
                alert('User edited successfully');
                window.location.reload();
            }
            else{
                alert('Error editing user');
            }
        }
        catch(err){
            console.error('Error editing user:', err);
        }
});

document.getElementById("delete-user-button").addEventListener("click", async () => {

    const AM = prompt("Enter AM:");

    if (!AM) {
        alert('AM is required');
        return;
    }

    try{
        const response  = await fetch('/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ AM })
        });

        if (response.ok) {
            alert('User deleted successfully');
            window.location.reload();
        }
        else{
            alert('Error deleting user');
        }
    }
    catch(err){
        console.error('Error deleting user:', err);
    }
});

document.getElementById("delete-item-assigned-button").addEventListener("click", async () => {
    
        const AM = prompt("Enter AM:");
        const barcode = prompt("Enter Barcode:");
    
        if (!AM || !barcode) {
            alert('AM and Barcode are required');
            return;
        }
    
        try{
            const response  = await fetch('/delete-item-assigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ AM, barcode })
            });
    
            if (response.ok) {
                alert('Item deleted successfully');
                window.location.reload();
            }
            else{
                alert('Error deleting item');
            }
        }
        catch(err){
            console.error('Error deleting item:', err);
        }
});

document.getElementById("clear-items-assigned-button").addEventListener("click", async () => {
        
            const AM = prompt("Enter AM:");
        
            if (!AM) {
                alert('AM is required');
                return;
            }
        
            try{
                const response  = await fetch('/clear-items-assigned', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ AM })
                });
        
                if (response.ok) {
                    alert('Items deleted successfully');
                    window.location.reload();
                }
                else{
                    alert('Error deleting items');
                }
            }
            catch(err){
                console.error('Error deleting items:', err);
            }
});
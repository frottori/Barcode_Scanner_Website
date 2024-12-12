const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Failed to connect to database:', err.message);
    else console.log('Connected to SQLite database.');
});

db.run(`
    CREATE TABLE IF NOT EXISTS barcodes 
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, 
    specs TEXT DEFAULT '-',
    quantity INTEGER DEFAULT 1, 
    status TEXT DEFAULT 'Καινούργιο',
    category TEXT DEFAULT '-',
    occupant TEXT DEFAULT 'Κανένας',
    barcode TEXT 
    )
`);
db.run(`CREATE TABLE IF NOT EXISTS users 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, email TEXT, 
    phone TEXT)`);
db.run(`
    CREATE TABLE IF NOT EXISTS items_assigned (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        barcode_id INTEGER,
        name TEXT,
        barcode Text,
        Quantity TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (barcode_id) REFERENCES barcodes(id)
    )
`);

app.post('/save', (req, res) => {
    const { barcode, name, specs, quantity, status, category } = req.body;

    if (!barcode || !name || !specs || !quantity || !status || !category) {
        return res.status(400).json({ error: 'fields are required' });
    }

    db.run('INSERT INTO barcodes (barcode, name, specs, quantity, status, category) VALUES (?,?,?,?,?,?)', [barcode, name, specs, quantity, status, category], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true });
    });
});

app.get('/barcodes', (req, res) => {
    db.all('SELECT id, name, specs, quantity, status, category, occupant, barcode FROM barcodes', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        return res.json(rows); // Send the rows as JSON
    });
});

app.post('/check', (req, res) => {
    const { barcode } = req.body;

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    // Check if the barcode already exists in the database
    db.get('SELECT id, barcode, quantity FROM barcodes WHERE barcode = ?', [barcode], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            // Barcode exists, return the current quantity
            db.run('UPDATE barcodes SET quantity = quantity + 1 WHERE barcode = ?', [barcode]);
            return res.status(200).json({ exists: true, quantity: row.quantity });
        } else {
            // Barcode doesn't exist
            return res.status(404).json({ exists: false });
        }
    });
});

app.post('/update-barcode', (req, res) => {
    const { barcode, id } = req.body;

    if (!barcode || !id) {
        return res.status(400).json({ error: 'name and id are required' });
    }

    db.all('UPDATE barcodes SET barcode = ? WHERE id = ?', [barcode, id], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.post('/delete', (req, res) => {
    const { barcode } = req.body;

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    db.all('DELETE FROM barcodes WHERE barcode LIKE ?', [barcode], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        res.json({ success: true });
    });
});

app.post('/take', (req, res) => {

    const { barcode, occupant } = req.body;

    if (!barcode || !occupant) {
        return res.status(400).json({ error: 'Barcode and occupant are required' });
    }

    db.run('UPDATE barcodes SET occupant = ? WHERE barcode LIKE ?', [occupant, barcode], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        res.json({ success: true });
    });
});


app.get('/get-assigned-items', (req, res) => {
    const query = `
        SELECT users.name AS user_name, 
               items_assigned.name AS item_name, 
               items_assigned.barcode AS barcode, 
               items_assigned.Quantity AS quantity
        FROM items_assigned
        JOIN users ON items_assigned.user_id = users.id
        ORDER BY users.name;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const groupedData = rows.reduce((acc, row) => {
                if (!acc[row.user_name]) acc[row.user_name] = [];
                acc[row.user_name].push({
                    item_name: row.item_name,
                    barcode: row.barcode,
                    quantity: row.quantity,
                });
                return acc;
            }, {});
            res.json(groupedData);
        }
    });
});

app.post('/search', (req, res) => {
    const { barcode } = req.body; 

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    db.all('SELECT id, barcode, name, quantity, occupant FROM barcodes WHERE barcode LIKE ?', [barcode], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) {
            // Return a 404 if no matching rows are found
            return res.status(404).json({ error: 'No items found with that barcode' });
        }

        // Return the rows as JSON
        res.json(rows);
    });
});

app.post('/update-all', (req, res) => {
    let { name, quantity, specs, status, category, barcode } = req.body;

    if (!barcode) { 
        return res.status(400).json({ error: 'fields name and barcode are required' });
    }
    
    const { query, attr } = updateAllQuery(name, quantity, specs, status, category, barcode);

    db.run(query, attr, (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

function ifEmpty(attr) {
    if (attr === '' || attr === null) {
        return true;
    }
    return false;
}

function updateAllQuery(name, quantity, specs, status, category, barcode) {
    let query = '';
    let attr = [];

    switch (true) {
        case ifEmpty(name):
            query = 'UPDATE barcodes SET quantity = ?, specs = ?, status = ?, category = ? WHERE barcode = ?';
            attr = [quantity, specs, status, category, barcode];
            break;
        case ifEmpty(quantity):
            query = 'UPDATE barcodes SET name = ?, specs = ?, status = ?, category = ? WHERE barcode = ?';
            attr = [name, specs, status, category, barcode];
            break;
        case ifEmpty(specs):
            query = 'UPDATE barcodes SET name = ?, quantity = ?, status = ?, category = ? WHERE barcode = ?';
            attr = [name, quantity, status, category, barcode];
            break;
        case ifEmpty(status):
            query = 'UPDATE barcodes SET name = ?, quantity = ?, specs = ?, category = ? WHERE barcode = ?';
            attr = [name, quantity, specs, category, barcode];
            break;
        case ifEmpty(category):
            query = 'UPDATE barcodes SET name = ?, quantity = ?, specs = ?, status = ? WHERE barcode = ?';
            attr = [name, quantity, specs, status, barcode];
            break;
        default:
            query = 'UPDATE barcodes SET name = ?, quantity = ?, specs = ?, status = ?, category = ? WHERE barcode = ?';
            attr = [name, quantity, specs, status, category, barcode];
            break;
    }

    return { query, attr };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
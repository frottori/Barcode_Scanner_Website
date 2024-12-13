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
        status TEXT DEFAULT 'Άγνωστη',
        category TEXT DEFAULT '-',
        barcode TEXT
    )
`);
db.run(`CREATE TABLE IF NOT EXISTS users 
    (id INTEGER PRIMARY KEY AUTOINCREMENT, 
    AM TEXT UNIQUE,
    name TEXT,
    email TEXT, 
    phone TEXT)`);
db.run(`
    CREATE TABLE IF NOT EXISTS items_assigned (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        barcode_id INTEGER,
        name TEXT, 
        specs TEXT DEFAULT '-',
        quantity INTEGER DEFAULT 1, 
        barcode TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (barcode_id) REFERENCES barcodes(id)
    )
`);

app.get('/barcodes', (req, res) => {
    db.all('SELECT id, name, specs, quantity, status, category, barcode FROM barcodes', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        return res.json(rows); // Send the rows as JSON
    });
});

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

app.post('/check', (req, res) => {
    const { barcode, flag } = req.body;

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    // Check if the barcode already exists in the database
    db.get('SELECT id, barcode, quantity FROM barcodes WHERE barcode = ?', [barcode], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (row && flag) {
            // Barcode exists, return the current quantity
            db.run('UPDATE barcodes SET quantity = quantity + 1 WHERE barcode = ?', [barcode]);
            return res.status(200).json({ exists: true, quantity: row.quantity });
        } 
        else if (flag == false) {
            return res.status(200).json({ exists: true });
        } 
        else {
            // Barcode doesn't exist
            return res.status(404).json({ exists: false });
        }
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
    const { barcode, AM, quantity } = req.body;

    if (!barcode || !AM) {
        return res.status(400).json({ error: 'Barcode and AM are required' });
    }

    db.get('SELECT id FROM users WHERE AM = ?', [AM], (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
    
        db.get('SELECT id FROM barcodes WHERE barcode = ?', [barcode], (err, barcodeItem) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: err.message });
            }
    
            if (!barcodeItem) {
                return res.status(404).json({ error: 'Barcode not found' });
            }

            db.get('SELECT id, quantity FROM items_assigned WHERE user_id = ? AND barcode_id = ?', [user.id, barcodeItem.id], (err, itemAssigned) => {
                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ error: err.message });
                }

                if (itemAssigned) {
                    // Item already assigned, update the quantity
                    db.run('UPDATE items_assigned SET quantity = quantity + ? WHERE id = ?', [quantity, itemAssigned.id], (err) => {
                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({ error: err.message });
                        }
                        res.status(200).json({ success: true });
                    });
                } else {
                    // Item not assigned, insert new record
                    db.run('INSERT INTO items_assigned (user_id, barcode_id, quantity) VALUES (?,?,?)', 
                        [user.id, barcodeItem.id, quantity], (err) => {
                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({ error: err.message });
                        }
                        res.status(201).json({ success: true });
                    });
                }
            });
        });
    });
});

app.post('/search', (req, res) => {
    const { barcode } = req.body; 

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    db.all('SELECT id, barcode, name, quantity, specs, status, category FROM barcodes WHERE barcode LIKE ?', [barcode], (err, rows) => {
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

app.post('/update-attr', (req, res) => {
    let {barcode, attr, value} = req.body;

    if (!barcode || !attr) {
        return res.status(400).json({ error: 'fields barcode and attr are required' });
    }

    const query = `UPDATE barcodes SET ${attr} = ? WHERE barcode = ?`;
    db.run(query, [value, barcode], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
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

//! user.html

app.get('/get-assigned-items', (req, res) => {
    const query = `
        SELECT users.name AS user_name, 
               users.email AS user_email, 
               users.phone AS user_phone,
               users.AM AS user_AM,
               barcodes.id AS barcode_id,
               barcodes.name AS item_name, 
               barcodes.specs AS item_specs,
               barcodes.barcode AS barcode, 
               items_assigned.quantity AS quantity
        FROM users
        LEFT JOIN items_assigned ON users.id = items_assigned.user_id
        LEFT JOIN barcodes ON items_assigned.barcode_id = barcodes.id
        ORDER BY users.id;
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const groupedData = rows.reduce((acc, row) => {
                if (!acc[row.user_name]) {
                    acc[row.user_name] = {
                        am: row.user_AM,
                        email: row.user_email,
                        phone: row.user_phone,
                        items: []
                    };
                }
                if (row.item_name) { // Add item if it exists
                    acc[row.user_name].items.push({
                        barcode_id: row.barcode_id,
                        item_name: row.item_name,
                        item_specs: row.item_specs,
                        barcode: row.barcode,
                        quantity: row.quantity,
                    });
                }
                return acc;
            }, {});

            // Ensure every user has at least one placeholder row if no items exist
            Object.keys(groupedData).forEach(userName => {
                if (groupedData[userName].items.length === 0) {
                    groupedData[userName].items.push({
                        barcode_id: '-',
                        item_name: '-',
                        item_specs: '-',
                        barcode: '-',
                        quantity: '-',
                    });
                }
            });
            res.json(groupedData);
        }
    });
});

app.post('/add-user', (req, res) => {
    const { name, AM, email, phone } = req.body;

    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    db.run('INSERT INTO users (name, AM, email, phone) VALUES (?,?,?,?)', [name ,AM, email, phone], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.post('/delete-user', (req, res) => {

    const { AM } = req.body;

    if (!AM) {
        return res.status(400).json({ error: 'AM is required' });
    }

    db.run('DELETE FROM users WHERE AM = ?', [AM], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.post('/edit-user', (req, res) => {
    const { name, AM, email, phone } = req.body;

    if (!name || !AM || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    db.run('UPDATE users SET name = ?, email = ?, phone = ? WHERE AM = ?', [name, email, phone, AM], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.post('/search-user', (req, res) => {
    const { AM } = req.body;

    if (!AM) {
        return res.status(400).json({ error: 'AM is required' });
    }

    const query = `
        SELECT users.name AS user_name, 
               users.email AS user_email, 
               users.phone AS user_phone,
               users.AM AS user_AM,
               barcodes.id AS barcode_id,
               barcodes.name AS item_name, 
               barcodes.specs AS item_specs,
               barcodes.barcode AS barcode, 
               items_assigned.quantity AS quantity
        FROM users
        LEFT JOIN items_assigned ON users.id = items_assigned.user_id
        LEFT JOIN barcodes ON items_assigned.barcode_id = barcodes.id
        WHERE users.AM LIKE ?
        ORDER BY users.id;
    `;
    db.all(query, [AM], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }

        const groupedData = rows.reduce((acc, row) => {
            if (!acc[row.user_name]) {
                acc[row.user_name] = {
                    am: row.user_AM,
                    email: row.user_email,
                    phone: row.user_phone,
                    items: []
                };
            }
            if (row.item_name) { // Add item if it exists
                acc[row.user_name].items.push({
                    barcode_id: row.barcode_id,
                    item_name: row.item_name,
                    item_specs: row.item_specs,
                    barcode: row.barcode,
                    quantity: row.quantity,
                });
            }
            return acc;
        }, {});

        // Ensure every user has at least one placeholder row if no items exist
        Object.keys(groupedData).forEach(userName => {
            if (groupedData[userName].items.length === 0) {
                groupedData[userName].items.push({
                    barcode_id: '-',
                    item_name: '-',
                    item_specs: '-',
                    barcode: '-',
                    quantity: '-',
                });
            }
        });

        res.json(groupedData);
    });
});

app.post('/delete-item-assigned', (req, res) => {
    const {AM, barcode} = req.body;

    if (!AM || !barcode) {
        return res.status(400).json({ error: 'AM and barcode are required' });
    }

    db.run(`DELETE FROM items_assigned 
            WHERE user_id = (SELECT id FROM users WHERE AM = ?) 
            AND barcode_id = (SELECT id FROM barcodes WHERE barcode = ?)`, [AM, barcode], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.post('/clear-items-assigned', (req, res) => {
    const { AM } = req.body;

    if (!AM) {
        return res.status(400).json({ error: 'AM is required' });
    }

    db.run(`DELETE FROM items_assigned 
            WHERE user_id = (SELECT id FROM users WHERE AM = ?)`, [AM], (err) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});
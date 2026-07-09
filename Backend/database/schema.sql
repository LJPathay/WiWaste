-- WiWaste Database Schema
-- Created based on Table 10-21 specifications

-- Table 10: Users
CREATE TABLE Users (
    User_id INT AUTO_INCREMENT PRIMARY KEY,
    Full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARBINARY(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role ENUM('Admin', 'Inventory', 'Business Owner') NOT NULL,
    status ENUM('Active', 'Inactive') NOT NULL,
    Created_at DATETIME NOT NULL
);

-- Table 11: Categories
CREATE TABLE Categories (
    Category_id INT AUTO_INCREMENT PRIMARY KEY,
    Category_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

-- Table 12: Products
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    supplier_id INT NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    reorder_level INT NOT NULL,
    expiration_date DATE NULL,
    FOREIGN KEY (category_id) REFERENCES Categories(Category_id),
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id)
);

-- Table 13: Supplier
CREATE TABLE Supplier (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NULL,
    contact_number VARCHAR(20) NOT NULL,
    address VARCHAR(255) NULL
);

-- Table 14: Inventory
CREATE TABLE Inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    current_stock INT NOT NULL,
    stock_status ENUM('Normal', 'Low Stock', 'Overstock') NOT NULL,
    last_updated DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- Table 15: Stock Movements
CREATE TABLE Stock_Movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    movement_type ENUM('Stock In', 'Stock Out') NOT NULL,
    quantity INT NOT NULL,
    remarks TEXT NULL,
    movement_date DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (user_id) REFERENCES Users(User_id)
);

-- Table 16: Sales Transactions
CREATE TABLE Sales_Transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    transaction_date DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(User_id)
);

-- Table 17: Sales Items
CREATE TABLE Sales_Items (
    sales_item_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES Sales_Transactions(transaction_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- Table 18: Wastage Records
CREATE TABLE Wastage_Records (
    wastage_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    wastage_type ENUM('Expired', 'Damaged', 'Spoiled', 'Lost') NOT NULL,
    quantity INT NOT NULL,
    estimated_loss DECIMAL(10,2) NOT NULL,
    date_recorded DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id),
    FOREIGN KEY (user_id) REFERENCES Users(User_id)
);

-- Table 19: Forecast Results
CREATE TABLE Forecast_Results (
    forecast_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    forecast_period VARCHAR(50) NOT NULL,
    predicted_demand INT NOT NULL,
    overstock_risk ENUM('Low', 'Medium', 'High') NOT NULL,
    generated_date DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- Table 20: Profit Loss Analysis
CREATE TABLE Profit_Loss_Analysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    total_sales DECIMAL(10,2) NOT NULL,
    total_wastage_loss DECIMAL(10,2) NOT NULL,
    risk_level ENUM('Low', 'Medium', 'High') NOT NULL,
    predicted_profit_leakage DECIMAL(10,2) NOT NULL,
    analysis_date DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- Table 21: Inventory Recommendations
CREATE TABLE Inventory_Recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    current_stock INT NOT NULL,
    recommended_stock INT NOT NULL,
    recommendation_type ENUM('Restock', 'Reduce Stock', 'Maintain') NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    generated_date DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);
